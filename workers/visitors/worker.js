/*
 * Visitors counter for sravanthkod.github.io
 *
 * POST /ping  — record a page view; the visitor's country comes from
 *               Cloudflare's edge metadata (request.cf.country), so no
 *               cookies or IP lookups are needed.
 * GET  /stats — { total, today, countries: { XX: n, ... } }
 *
 * Storage: a KV namespace bound as VISITS (see wrangler.toml / README).
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);

    if (url.pathname === "/ping" && request.method === "POST") {
      const country = (request.cf && request.cf.country) || "??";
      const day = "day:" + today();
      await Promise.all([
        bump(env, "total", 1),
        bump(env, "country:" + country, 1),
        bump(env, day, 1),
        pruneOldDays(env, day),
      ]);
      return json({ ok: true });
    }

    if (url.pathname === "/stats" && request.method === "GET") {
      const listed = await env.VISITS.list();
      const keys = listed.keys.map((k) => k.name);
      const wanted = ["total", "day:" + today()].concat(
        keys.filter((k) => k.startsWith("country:"))
      );
      const values = await Promise.all(
        wanted.map((k) => env.VISITS.get(k))
      );
      const countries = {};
      for (let i = 0; i < wanted.length; i++) {
        if (wanted[i].startsWith("country:")) {
          countries[wanted[i].slice(8)] = Number(values[i]) || 0;
        }
      }
      return json({
        total: Number(values[0]) || 0,
        today: Number(values[1]) || 0,
        countries,
        updated: Date.now(),
      });
    }

    return json({ error: "not found" }, 404);
  },
};

async function bump(env, key, by) {
  const current = Number((await env.VISITS.get(key)) || 0);
  await env.VISITS.put(key, String(current + by));
}

// Keep only today's day-counter so the namespace never accumulates them.
async function pruneOldDays(env, todayKey) {
  const listed = await env.VISITS.list({ prefix: "day:" });
  await Promise.all(
    listed.keys
      .map((k) => k.name)
      .filter((k) => k !== todayKey)
      .map((k) => env.VISITS.delete(k))
  );
}
