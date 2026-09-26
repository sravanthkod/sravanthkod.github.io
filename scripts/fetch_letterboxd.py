#!/usr/bin/env python3
"""Sync films from a Letterboxd RSS feed into the site.

Fetches letterboxd.com/<username>/rss/, downloads each film's poster into
assets/binge/posters/, and writes _data/letterboxd.json for the Binge page.
Re-run whenever you want newer films to appear; existing posters are cached.

Usage: python3 scripts/fetch_letterboxd.py [username]
"""

import json
import re
import sys
import urllib.request
from datetime import date
from html import unescape
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
FEED_URL = "https://letterboxd.com/{}/rss/"
NS = {"lb": "https://letterboxd.com", "tmdb": "https://themoviedb.org"}


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "sravanthkod.github.io letterboxd sync"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def poster_url(description_html):
    m = re.search(r'<img src="([^"]+)"', description_html or "")
    return m.group(1) if m else None


def review_text(description_html):
    text = re.sub(r"<img[^>]*>", "", description_html or "")
    text = re.sub(r"</?p>", " ", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def main():
    username = sys.argv[1] if len(sys.argv) > 1 else "sravanthkod"
    xml = fetch(FEED_URL.format(username))
    items = ET.fromstring(xml).findall(".//item")

    films, seen = [], set()
    for item in items:
        def lb(tag):
            el = item.find(f"lb:{tag}", NS)
            if el is None:
                el = item.find(f"tmdb:{tag}", NS)
            return el.text.strip() if el is not None and el.text else None

        movie_id = lb("movieId")  # tmdb:movieId in the feed
        if not movie_id or movie_id in seen:
            continue
        seen.add(movie_id)

        desc = item.findtext("description") or ""
        poster = poster_url(desc)
        poster_file = None
        if poster:
            target = ROOT / "assets/binge/posters" / f"{movie_id}.jpg"
            if not target.exists():
                target.write_bytes(fetch(poster))
            poster_file = f"/assets/binge/posters/{movie_id}.jpg"

        films.append({
            "title": lb("filmTitle"),
            "year": int(lb("filmYear") or 0),
            "rating": float(lb("memberRating") or 0),
            "like": lb("memberLike") == "Yes",
            "rewatch": lb("rewatch") == "Yes",
            "watched": lb("watchedDate"),
            "review": review_text(desc),
            "url": item.findtext("link").strip(),
            "poster": poster_file,
        })

    films.sort(key=lambda f: f["watched"] or "", reverse=True)
    out = {
        "username": username,
        "profile_url": f"https://letterboxd.com/{username}/",
        "fetched_at": date.today().isoformat(),
        "film_count": len(films),
        "films": films,
    }
    (ROOT / "_data/letterboxd.json").write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print(f"{len(films)} films synced -> _data/letterboxd.json")


if __name__ == "__main__":
    main()
