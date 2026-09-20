---
layout: page
title: Travel
permalink: /travel/
order: 6
description: "Places I've travelled — United States, Thailand and India — plotted on an interactive globe."
---

<div class="travel-container">

  <div class="travel-globe-col">
    <div class="travel-globe">
      <canvas id="travel-globe-canvas" role="img" aria-label="Interactive globe showing the places I have travelled"></canvas>
      <div class="globe-tooltip" id="globe-tooltip"></div>
    </div>
    <div class="globe-hint">drag to spin &middot; hover a marker &middot; click to center</div>
  </div>

  <div class="travel-list">

    <div class="travel-country" data-country="United States" data-lat="33.4" data-lon="-117.9">
      <button class="travel-country-header" type="button">
        <span class="travel-flag">&#127482;&#127480;</span>
        <span class="travel-country-name">United States</span>
        <span class="travel-count">2 cities</span>
      </button>
      <div class="travel-region-label">California</div>
      <div class="travel-places">
        <button class="travel-chip" type="button" data-place="San Diego">San Diego</button>
        <button class="travel-chip" type="button" data-place="Los Angeles">Los Angeles</button>
      </div>
    </div>

    <div class="travel-country" data-country="Thailand" data-lat="10.5" data-lon="99.2">
      <button class="travel-country-header" type="button">
        <span class="travel-flag">&#127481;&#127469;</span>
        <span class="travel-country-name">Thailand</span>
        <span class="travel-count">3 cities</span>
      </button>
      <div class="travel-places">
        <button class="travel-chip" type="button" data-place="Bangkok">Bangkok</button>
        <button class="travel-chip" type="button" data-place="Phuket">Phuket</button>
        <button class="travel-chip" type="button" data-place="Krabi">Krabi</button>
      </div>
    </div>

    <div class="travel-country" data-country="India" data-lat="22.5" data-lon="79">
      <button class="travel-country-header" type="button">
        <span class="travel-flag">&#127470;&#127475;</span>
        <span class="travel-country-name">India</span>
        <span class="travel-count">10 states</span>
      </button>
      <div class="travel-places">
        <button class="travel-chip" type="button" data-place="Andhra Pradesh">Andhra Pradesh</button>
        <button class="travel-chip" type="button" data-place="Tamil Nadu">Tamil Nadu</button>
        <button class="travel-chip" type="button" data-place="Karnataka">Karnataka</button>
        <button class="travel-chip" type="button" data-place="Kerala">Kerala</button>
        <button class="travel-chip" type="button" data-place="Maharashtra">Maharashtra</button>
        <button class="travel-chip" type="button" data-place="Rajasthan">Rajasthan</button>
        <button class="travel-chip" type="button" data-place="Uttar Pradesh">Uttar Pradesh</button>
        <button class="travel-chip" type="button" data-place="Odisha">Odisha</button>
        <button class="travel-chip" type="button" data-place="Bihar">Bihar</button>
        <button class="travel-chip" type="button" data-place="Delhi">Delhi</button>
      </div>
    </div>

  </div>

</div>

<script src="/assets/travel/globe.js" defer></script>
