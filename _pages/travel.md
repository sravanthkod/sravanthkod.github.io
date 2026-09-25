---
layout: page
title: Travel
permalink: /travel/
order: 6
description: "Places I've travelled — United States, Thailand and India — plotted on an interactive globe."
---

<div class="travel-container">
  <div class="travel-layout">

    <div class="globe-wrapper" id="globe-wrapper">
      <canvas id="globe-canvas" role="img" aria-label="Interactive globe showing places travelled in the United States, Thailand, and India"></canvas>
      <div class="globe-tooltip" id="globe-tooltip"></div>
      <div class="globe-legend">
        <div class="legend-item" data-country="usa"><span class="legend-dot" style="background: #3b82f6;"></span> USA</div>
        <div class="legend-item" data-country="thailand"><span class="legend-dot" style="background: #10b981;"></span> Thailand</div>
        <div class="legend-item" data-country="india"><span class="legend-dot" style="background: #f59e0b;"></span> India</div>
      </div>
      <div class="globe-zoom-controls">
        <button class="globe-zoom-btn" id="zoom-in" aria-label="Zoom in" title="Zoom in">+</button>
        <button class="globe-zoom-btn" id="zoom-reset" aria-label="Reset view" title="Reset view">&#8635;</button>
        <button class="globe-zoom-btn" id="zoom-out" aria-label="Zoom out" title="Zoom out">&minus;</button>
      </div>
    </div>

    <div class="travel-cities-grid">

      <div class="travel-country" data-country="usa" style="--dot: #3b82f6;">
        <button class="travel-country-header" type="button">
          <span class="travel-flag">&#127482;&#127480;</span>
          <span class="travel-country-name">United States</span>
          <span class="travel-count">2 cities</span>
        </button>
        <div class="travel-region-label">California</div>
        <ul class="city-list">
          <li>San Diego</li>
          <li>Los Angeles</li>
        </ul>
      </div>

      <div class="travel-country" data-country="thailand" style="--dot: #10b981;">
        <button class="travel-country-header" type="button">
          <span class="travel-flag">&#127481;&#127469;</span>
          <span class="travel-country-name">Thailand</span>
          <span class="travel-count">3 cities</span>
        </button>
        <ul class="city-list">
          <li>Bangkok</li>
          <li>Phuket</li>
          <li>Krabi</li>
        </ul>
      </div>

      <div class="travel-country" data-country="india" style="--dot: #f59e0b;">
        <button class="travel-country-header" type="button">
          <span class="travel-flag">&#127470;&#127475;</span>
          <span class="travel-country-name">India</span>
          <span class="travel-count">10 states</span>
        </button>
        <ul class="city-list">
          <li>Andhra Pradesh</li>
          <li>Tamil Nadu</li>
          <li>Karnataka</li>
          <li>Kerala</li>
          <li>Maharashtra</li>
          <li>Rajasthan</li>
          <li>Uttar Pradesh</li>
          <li>Odisha</li>
          <li>Bihar</li>
          <li>Delhi</li>
        </ul>
      </div>

    </div>

  </div>
</div>

<script src="/assets/travel/vendor/d3.min.js" defer></script>
<script src="/assets/travel/vendor/topojson-client.min.js" defer></script>
<script src="/assets/travel/globe.js" defer></script>
