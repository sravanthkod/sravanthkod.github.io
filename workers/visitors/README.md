# Visitors counter — Cloudflare Worker

> **Deployed:** https://sravanthkod-visitors.sravanthkod.workers.dev (KV namespace `visits`, id
> `644d0b0c636340aa9bc978c2965add6e`). The steps below are only needed
> for a fresh account or redeploying elsewhere.


Counts page views with per-country breakdown for the Visitors page.
Free tier is plenty (100k requests/day). No cookies; the country comes
from Cloudflare's edge metadata.

## Deploy — dashboard route (no tools needed, ~5 minutes)

1. Create a free account at dash.cloudflare.com.
2. **Storage & Databases → KV → Create namespace** → name it `visits`.
3. **Compute (Workers & Pages) → Create → Worker** → name it
   `sravanthkod-visitors` → **Deploy**, then **Edit code**, paste the
   contents of `worker.js`, **Deploy** again.
4. **Worker → Settings → Bindings → Add → KV Namespace**:
   Variable name must be exactly `VISITS`, select the `visits` namespace.
5. Copy the worker URL — it looks like
   `https://sravanthkod-visitors.<your-subdomain>.workers.dev`
6. In the site repo, set it in `_config.yml`:
   ```yaml
   visitors_api: "https://sravanthkod-visitors.your-subdomain.workers.dev"
   ```
   Commit + push. The Visitors page and the per-page beacon go live.

## Verify

```sh
curl -X POST https://<your-worker-url>/ping    # -> {"ok":true}
curl https://<your-worker-url>/stats           # -> {"total":1,...}
```

## Notes

- Counts start at zero on deploy; GitHub Pages history was never
  recorded, so there is nothing to backfill.
- `POST /ping` is unauthenticated by design — anyone could inflate
  counts, which is fine for a personal site. The site sends at most one
  ping per browser session.
- Day counters are pruned to today only; the namespace stays tiny.
