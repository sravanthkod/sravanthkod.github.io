#!/usr/bin/env python3
"""Sync films from Letterboxd into the site.

Combines three sources into _data/letterboxd.json for the Binge page:

1. The existing _data/letterboxd.json — long-term memory. Films never
   disappear from the page just because they fell out of the feed.
2. The RSS feed (letterboxd.com/<username>/rss/) — recent watches with
   ratings, likes, reviews and poster URLs. No login needed.
3. A full data export (optional, LOCAL ONLY — gitignored) — the feed
   only carries the most recent ~50 entries, so for complete history
   drop your export CSVs into scripts/letterboxd/:
     - diary.csv   (every watch: date, rating, rewatch)
     - reviews.csv (review text)
   Export yours at letterboxd.com → Settings → Data Export (emailed zip).
   Later layers win; the export only needs to exist on the machine where
   you run a refresh — the GitHub Action relies on 1 + 2, which stay in
   the repo.

Posters are cached in assets/binge/posters/ by film slug. Films from the
CSV export that never appeared in the feed get their poster fetched once
from the film's Letterboxd page (og:image). Re-run whenever; existing
posters are reused.

Usage: python3 scripts/fetch_letterboxd.py [username]
"""

import csv
import json
import re
import sys
import time
import urllib.request
from datetime import date, datetime
from html import unescape
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
EXPORT_DIR = ROOT / "scripts/letterboxd"
POSTER_DIR = ROOT / "assets/binge/posters"
DATA_PATH = ROOT / "_data/letterboxd.json"
FEED_URL = "https://letterboxd.com/{}/rss/"
NS = {"lb": "https://letterboxd.com", "tmdb": "https://themoviedb.org"}
HEADERS = {"User-Agent": "sravanthkod.github.io letterboxd sync"}
REVIEW_MAX = 280


def fetch(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def slug_from_url(url):
    m = re.search(r"/film/([^/]+)/", url or "")
    return m.group(1) if m else None


# Export CSVs use boxd.it shortlinks; resolve each once to the canonical
# letterboxd.com/film/<slug>/ URL (redirect is followed automatically).
_url_cache = {}


def resolve_url(url):
    if url in _url_cache:
        return _url_cache[url]
    slug, canon = slug_from_url(url), url
    if not slug and url and "boxd.it/" in url:
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as r:
                canon = r.url
            slug = slug_from_url(canon)
        except Exception as e:
            print(f"  shortlink resolve failed for {url}: {e}")
    result = (slug, canon) if slug else (None, url)
    _url_cache[url] = result
    return result


def parse_date(text):
    for fmt in ("%b %d, %Y", "%Y-%m-%d", "%d %b %Y"):
        try:
            return datetime.strptime((text or "").strip(), fmt).date().isoformat()
        except ValueError:
            continue
    return None


def one_line(html_text):
    text = re.sub(r"<img[^>]*>", "", html_text or "")
    text = re.sub(r"</?p>", " ", text)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\s+", " ", unescape(text)).strip()


def clip(text):
    return text if len(text) <= REVIEW_MAX else text[:REVIEW_MAX - 1].rstrip() + "…"


# --- Source 1: RSS feed (recent watches, with posters and likes) ---

def parse_rss(username):
    root = ET.fromstring(fetch(FEED_URL.format(username)))
    films, seen = [], set()
    for item in root.findall(".//item"):
        def lb(tag):
            el = item.find(f"lb:{tag}", NS)
            if el is None:
                el = item.find(f"tmdb:{tag}", NS)  # movieId lives in the tmdb ns
            return el.text.strip() if el is not None and el.text else None

        url = (item.findtext("link") or "").strip()
        slug = slug_from_url(url)
        if not slug or slug in seen:
            continue
        seen.add(slug)

        desc = item.findtext("description") or ""
        m = re.search(r'<img src="([^"]+)"', desc)
        films.append({
            "slug": slug,
            "title": lb("filmTitle"),
            "year": int(lb("filmYear") or 0),
            "rating": float(lb("memberRating") or 0),
            "like": lb("memberLike") == "Yes",
            "rewatch": lb("rewatch") == "Yes",
            "watched": parse_date(lb("watchedDate")),
            "review": clip(one_line(desc)),
            "url": url,
            "poster_url": m.group(1) if m else None,
        })
    return films


# --- Source 2: full export CSVs (all films; drop into scripts/letterboxd/) ---

def read_csv_rows(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        return [dict(row) for row in csv.DictReader(f)]


def col(row, *names):
    for n in names:
        for key in row:
            if key.strip().lower() == n:
                return (row[key] or "").strip()
    return ""


def parse_export():
    diary = EXPORT_DIR / "diary.csv"
    reviews = EXPORT_DIR / "reviews.csv"
    films = {}
    if diary.exists():
        # one row per watch — keep the most recent entry per film
        for row in read_csv_rows(diary):
            slug, canon = resolve_url(col(row, "letterboxd uri"))
            if not slug:
                print(f"  skipping {col(row, 'name')} ({col(row, 'year')}): dead export link")
                continue
            rating = col(row, "rating")
            films[slug] = {
                "slug": slug,
                "title": col(row, "name"),
                "year": int(col(row, "year") or 0),
                "rating": float(rating) if rating else 0.0,
                "like": False,  # not in the export; only the feed knows likes
                "rewatch": col(row, "rewatch").lower() == "yes",
                "watched": parse_date(col(row, "watched date") or col(row, "date")),
                "review": "",
                "url": canon,
            }
    if reviews.exists():
        for row in read_csv_rows(reviews):
            slug, _ = resolve_url(col(row, "letterboxd uri"))
            if slug in films:
                films[slug]["review"] = clip(one_line(col(row, "review")))
    return films


# --- Posters: feed URL first, one-time og:image backfill for the rest ---

def poster_for(film):
    slug = film.get("slug")
    if slug:
        target = POSTER_DIR / f"{slug}.jpg"
        if target.exists():
            return target
        if film.get("poster_url"):
            target.write_bytes(film["poster_url"])
            return target
        try:  # one-time backfill from the film's public page
            page = fetch(film["url"]).decode("utf-8", "replace")
            m = re.search(r'property="og:image" content="([^"]+)"', page)
            if m:
                target.write_bytes(fetch(unescape(m.group(1))))
                time.sleep(0.4)  # stay polite
                return target
        except Exception as e:
            print(f"  poster backfill failed for {film['title']}: {e}")
        return None
    # carried over from a previous sync (no slug): keep its poster if cached
    name = Path(film.get("poster") or "").name
    if name:
        target = POSTER_DIR / name
        if target.exists():
            return target
    return None


def film_key(film):
    return f"{(film.get('title') or '').lower()}|{film.get('year') or 0}"


def main():
    username = sys.argv[1] if len(sys.argv) > 1 else "sravanthkod"
    POSTER_DIR.mkdir(parents=True, exist_ok=True)

    films_by_key = {}
    # 1. memory — films already synced stay on the page forever
    if DATA_PATH.exists():
        try:
            prior = json.loads(DATA_PATH.read_text(encoding="utf-8"))
            for film in prior.get("films", []):
                films_by_key[film_key(film)] = film
        except Exception as e:
            print(f"  could not read existing data ({e}); starting fresh")
    memory_count = len(films_by_key)

    # 2. export CSVs (local only) — full history refresh, then
    # 3. feed — freshest data (likes, posters), so it wins
    for film in parse_export().values():
        films_by_key[film_key(film)] = film
    export_count = len(films_by_key) - memory_count
    for film in parse_rss(username):
        films_by_key[film_key(film)] = film

    films = sorted(films_by_key.values(), key=lambda f: f["watched"] or "", reverse=True)

    # display month ("September 2026") — the Binge page groups films by it
    for film in films:
        if film.get("watched"):
            d = datetime.strptime(film["watched"], "%Y-%m-%d")
            film["month"] = d.strftime("%B %Y")
    used = set()
    for film in films:
        poster = poster_for(film)
        film["poster"] = f"/assets/binge/posters/{poster.name}" if poster else None
        if poster:
            used.add(poster.name)
        film.pop("poster_url", None)
        film.pop("slug", None)

    # drop posters no longer referenced (old ids, removed entries)
    for stale in POSTER_DIR.glob("*.jpg"):
        if stale.name not in used:
            stale.unlink()

    out = {
        "username": username,
        "profile_url": f"https://letterboxd.com/{username}/",
        "fetched_at": date.today().isoformat(),
        "film_count": len(films),
        "films": films,
    }
    DATA_PATH.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"{len(films)} films synced "
          f"({memory_count} remembered, +{export_count} from export, feed overlay) "
          f"-> _data/letterboxd.json")


if __name__ == "__main__":
    main()
