---
layout: page
title: Visitors
permalink: /visitors/
order: 9
description: "Where readers of this site come from — a live world map."
---

<div class="visitors-container">
  <div class="visitors-stats">
    <span class="visitors-count" id="visitors-count">—</span>
    <span class="visitors-count-label">visits</span>
    <span class="visitors-badge" id="visitors-live">live</span>
  </div>
  <p class="visitors-sub">
    <span id="visitors-countries">…</span> · <span id="visitors-today">…</span> · updated every 15 s
  </p>

  <div class="globe-wrapper visitors-globe" id="visitors-wrapper">
    <canvas id="visitors-canvas"
      {% if site.visitors_api and site.visitors_api != "" %}data-api="{{ site.visitors_api }}"{% endif %}
      aria-label="World map shaded by visit counts; drag to rotate"></canvas>
    <div class="globe-tooltip" id="visitors-tooltip"><strong></strong></div>
  </div>

  <p class="visitors-note">
    Country comes from the network edge — no cookies, no personal data.
    Counts begin from when the tracker went live.
  </p>
</div>

<script src="/assets/travel/vendor/d3.min.js" defer></script>
<script src="/assets/travel/vendor/topojson-client.min.js" defer></script>
<script src="/assets/visitors/visitors.js" defer></script>
