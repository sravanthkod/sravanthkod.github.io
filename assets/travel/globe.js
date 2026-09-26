/*
 * Travel globe — D3-geo orthographic projection on canvas.
 * Behavior ported from a reference implementation: auto-rotation, drag with
 * momentum, wheel/pinch/button zoom, hover tooltips, and click-to-focus
 * animations from the legend, country cards, and city pins.
 * Libraries are vendored locally in assets/travel/vendor/ (no CDN at runtime).
 */
(function () {
  'use strict';

  var canvas = document.getElementById('globe-canvas');
  var tooltip = document.getElementById('globe-tooltip');
  var wrapper = document.getElementById('globe-wrapper');
  if (!canvas || !wrapper || !window.d3) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  // --- Country colors (pins, legend, region tints) ---
  var COLORS = { usa: '#3b82f6', thailand: '#10b981', india: '#f59e0b', qatar: '#f43f5e' };
  var COUNTRY_NAME = { usa: 'United States', thailand: 'Thailand', india: 'India', qatar: 'Qatar' };
  var REGION_KEY = { 'United States': 'usa', 'Thailand': 'thailand', 'India': 'india', 'Qatar': 'qatar' };

  // --- Theme-aware canvas colors (tokens defined in main.scss; the rAF draw
  //     loop re-reads nothing — we refresh on 'themechange' and the next
  //     frame paints with the new palette) ---
  var GLOBE = {};
  function readGlobeTheme() {
    var s = getComputedStyle(document.documentElement);
    function v(name, fallback) {
      var val = s.getPropertyValue(name).trim();
      return val || fallback;
    }
    GLOBE.ocean = [
      v('--globe-ocean-1', '#dbeafe'),
      v('--globe-ocean-2', '#bfdbfe'),
      v('--globe-ocean-3', '#93c5fd')
    ];
    GLOBE.outline = v('--globe-outline', 'rgba(59,130,246,0.25)');
    GLOBE.graticule = v('--globe-graticule', 'rgba(59,130,246,0.15)');
    GLOBE.landFill = v('--globe-land-fill', 'rgba(34,197,94,0.20)');
    GLOBE.landStroke = v('--globe-land-stroke', 'rgba(22,163,74,0.35)');
    GLOBE.pinStroke = v('--globe-pin-stroke', '#ffffff');
  }
  readGlobeTheme();
  document.addEventListener('themechange', readGlobeTheme);

  // --- Places: [lat, lon, name, country key] ---
  var CITIES = [
    { lat: 32.7157, lon: -117.1611, name: 'San Diego', country: 'usa' },
    { lat: 34.0522, lon: -118.2437, name: 'Los Angeles', country: 'usa' },
    { lat: 13.7563, lon: 100.5018, name: 'Bangkok', country: 'thailand' },
    { lat: 7.8804, lon: 98.3923, name: 'Phuket', country: 'thailand' },
    { lat: 8.0863, lon: 98.9063, name: 'Krabi', country: 'thailand' },
    { lat: 15.9129, lon: 79.7400, name: 'Andhra Pradesh', country: 'india' },
    { lat: 11.1271, lon: 78.6569, name: 'Tamil Nadu', country: 'india' },
    { lat: 15.3173, lon: 75.7139, name: 'Karnataka', country: 'india' },
    { lat: 10.8505, lon: 76.2711, name: 'Kerala', country: 'india' },
    { lat: 19.7515, lon: 75.7139, name: 'Maharashtra', country: 'india' },
    { lat: 27.0238, lon: 74.2179, name: 'Rajasthan', country: 'india' },
    { lat: 26.8467, lon: 80.9462, name: 'Uttar Pradesh', country: 'india' },
    { lat: 20.9517, lon: 85.0985, name: 'Odisha', country: 'india' },
    { lat: 25.0961, lon: 85.3131, name: 'Bihar', country: 'india' },
    { lat: 17.8006, lon: 79.0083, name: 'Telangana', country: 'india' },
    { lat: 23.8369, lon: 87.9698, name: 'West Bengal', country: 'india' },
    { lat: 28.7041, lon: 77.1025, name: 'Delhi', country: 'india' },
    { lat: 25.2854, lon: 51.5310, name: 'Doha', country: 'qatar' }
  ];
  CITIES.forEach(function (c) { c.color = COLORS[c.country]; });

  var globeRadius, centerX, centerY, dpr = 1;
  var projection, pathGenerator;
  var landGeo = null;
  var regionFeats = [];
  var sphere = { type: 'Sphere' };
  var graticule = window.d3.geoGraticule10();

  // --- Zoom & rotation state ---
  var HOME = [-79, -22.5]; // initial focus: India
  var BASE_ROTATE = 0.15;  // degrees per frame
  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) BASE_ROTATE = 0;

  var zoomLevel = 1.0;
  var minZoom = 0.65, maxZoom = 2.8;
  var rotate = [HOME[0], HOME[1], 0];
  var autoRotateSpeed = BASE_ROTATE;
  var isDragging = false;
  var dragStartPos, dragStartRotate;
  var velocity = [0, 0];
  var lastMoveTime = 0, lastMovePos = null;
  var friction = 0.94;
  var hoveredCity = null;
  var mousePos = null;

  function resumeAutoRotate(delay) {
    setTimeout(function () { autoRotateSpeed = BASE_ROTATE; }, delay);
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    var rect = wrapper.getBoundingClientRect();
    var size = Math.min(rect.width, 520);
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    globeRadius = (size / 2) * 0.82;
    centerX = size / 2;
    centerY = size / 2;

    projection = window.d3.geoOrthographic()
      .scale(globeRadius * zoomLevel)
      .translate([centerX, centerY])
      .clipAngle(90);

    pathGenerator = window.d3.geoPath(projection, ctx);
  }

  // Load world land + visited-region boundaries (both vendored/local)
  fetch('/assets/travel/vendor/land-110m.json')
    .then(function (r) { return r.json(); })
    .then(function (topology) {
      if (window.topojson) landGeo = window.topojson.feature(topology, topology.objects.land);
    })
    .catch(function () {});

  fetch('/assets/travel/regions.geojson')
    .then(function (r) { return r.json(); })
    .then(function (geo) { regionFeats = geo.features || []; })
    .catch(function () {});

  function draw() {
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    var currentRadius = globeRadius * zoomLevel;
    projection.scale(currentRadius);
    projection.rotate(rotate);

    // 1. Ocean background
    var grad = ctx.createRadialGradient(
      centerX - currentRadius * 0.25, centerY - currentRadius * 0.25, 0,
      centerX, centerY, currentRadius
    );
    grad.addColorStop(0, GLOBE.ocean[0]);
    grad.addColorStop(0.7, GLOBE.ocean[1]);
    grad.addColorStop(1, GLOBE.ocean[2]);

    ctx.beginPath();
    pathGenerator(sphere);
    ctx.fillStyle = grad;
    ctx.fill();

    // Globe outline
    ctx.strokeStyle = GLOBE.outline;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 2. Graticule lines
    ctx.beginPath();
    pathGenerator(graticule);
    ctx.strokeStyle = GLOBE.graticule;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // 3. Landmasses
    if (landGeo) {
      ctx.beginPath();
      pathGenerator(landGeo);
      ctx.fillStyle = GLOBE.landFill;
      ctx.fill();
      ctx.strokeStyle = GLOBE.landStroke;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // 3b. Visited regions (states/provinces), tinted per country
    for (var r = 0; r < regionFeats.length; r++) {
      var feat = regionFeats[r];
      var key = feat.properties && REGION_KEY[feat.properties.country];
      if (!key) continue;
      ctx.beginPath();
      pathGenerator(feat);
      ctx.fillStyle = COLORS[key] + '33';
      ctx.fill();
      ctx.strokeStyle = COLORS[key] + '66';
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }

    // 4. City pins
    var closestCity = null;
    var closestDist = Infinity;
    var centerCoords = [-rotate[0], -rotate[1]];

    for (var i = 0; i < CITIES.length; i++) {
      var city = CITIES[i];
      var distRad = window.d3.geoDistance([city.lon, city.lat], centerCoords);
      if (distRad > Math.PI / 2) continue; // behind the globe

      var pt = projection([city.lon, city.lat]);
      if (!pt) continue;

      var zFactor = Math.cos(distRad);
      var pinRadius = (4 + 2.5 * zFactor) * Math.sqrt(zoomLevel);

      // glow
      ctx.beginPath();
      var glow = ctx.createRadialGradient(pt[0], pt[1], 0, pt[0], pt[1], pinRadius * 3.5);
      glow.addColorStop(0, city.color + '60');
      glow.addColorStop(1, city.color + '00');
      ctx.fillStyle = glow;
      ctx.arc(pt[0], pt[1], pinRadius * 3.5, 0, Math.PI * 2);
      ctx.fill();

      // pin dot
      ctx.beginPath();
      ctx.arc(pt[0], pt[1], pinRadius, 0, Math.PI * 2);
      ctx.fillStyle = city.color;
      ctx.fill();
      ctx.strokeStyle = GLOBE.pinStroke;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // hover check
      if (mousePos) {
        var dx = mousePos.x - pt[0];
        var dy = mousePos.y - pt[1];
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < pinRadius * 3.5 && d < closestDist) {
          closestDist = d;
          closestCity = { city: city, x: pt[0], y: pt[1] };
        }
      }
    }

    hoveredCity = closestCity;

    // 5. Atmosphere glow
    ctx.beginPath();
    ctx.arc(centerX, centerY, currentRadius + 2, 0, Math.PI * 2);
    var atmosphere = ctx.createRadialGradient(
      centerX, centerY, currentRadius * 0.9,
      centerX, centerY, currentRadius + 15
    );
    atmosphere.addColorStop(0, 'rgba(99,102,241,0)');
    atmosphere.addColorStop(0.5, 'rgba(99,102,241,0.05)');
    atmosphere.addColorStop(1, 'rgba(99,102,241,0)');
    ctx.fillStyle = atmosphere;
    ctx.fill();

    ctx.restore();

    // Tooltip
    if (hoveredCity && !isDragging) {
      tooltip.innerHTML = '<strong>' + hoveredCity.city.name + '</strong><br><span>' +
        COUNTRY_NAME[hoveredCity.city.country] + '</span>';
      tooltip.style.opacity = '1';
      tooltip.style.left = hoveredCity.x + 'px';
      tooltip.style.top = (hoveredCity.y - 48) + 'px';
      canvas.style.cursor = 'pointer';
    } else {
      tooltip.style.opacity = '0';
      canvas.style.cursor = isDragging ? 'grabbing' : 'grab';
    }
  }

  // --- Mouse wheel zoom ---
  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    var factor = e.deltaY < 0 ? 1.12 : 0.89;
    zoomLevel = Math.max(minZoom, Math.min(maxZoom, zoomLevel * factor));
  }, { passive: false });

  // --- Drag & momentum ---
  canvas.addEventListener('mousemove', function (e) {
    var rect = canvas.getBoundingClientRect();
    mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (isDragging) {
      var now = performance.now();
      var dx = e.clientX - dragStartPos.x;
      var dy = e.clientY - dragStartPos.y;

      var dt = now - lastMoveTime;
      if (dt > 0 && dt < 100 && lastMovePos) {
        velocity = [
          (e.clientX - lastMovePos.x) / dt * 15,
          (e.clientY - lastMovePos.y) / dt * 15
        ];
      }
      lastMoveTime = now;
      lastMovePos = { x: e.clientX, y: e.clientY };

      var sensitivity = 0.35 / zoomLevel;
      rotate[0] = dragStartRotate[0] + dx * sensitivity;
      rotate[1] = Math.max(-80, Math.min(80, dragStartRotate[1] - dy * sensitivity));
    }
  });

  canvas.addEventListener('mousedown', function (e) {
    isDragging = true;
    autoRotateSpeed = 0;
    velocity = [0, 0];
    dragStartPos = { x: e.clientX, y: e.clientY };
    dragStartRotate = [rotate[0], rotate[1]];
    lastMoveTime = performance.now();
    lastMovePos = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mouseup', function () {
    if (isDragging) isDragging = false;
  });

  canvas.addEventListener('mouseleave', function () {
    mousePos = null;
  });

  // --- Touch support & pinch-to-zoom ---
  var initialPinchDist = null;
  var initialPinchZoom = 1.0;

  canvas.addEventListener('touchstart', function (e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      isDragging = false;
      initialPinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchZoom = zoomLevel;
      return;
    }

    e.preventDefault();
    isDragging = true;
    autoRotateSpeed = 0;
    velocity = [0, 0];
    var t = e.touches[0];
    dragStartPos = { x: t.clientX, y: t.clientY };
    dragStartRotate = [rotate[0], rotate[1]];
    lastMoveTime = performance.now();
    lastMovePos = { x: t.clientX, y: t.clientY };
  }, { passive: false });

  canvas.addEventListener('touchmove', function (e) {
    if (e.touches.length === 2 && initialPinchDist) {
      e.preventDefault();
      var currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      var scale = currentDist / initialPinchDist;
      zoomLevel = Math.max(minZoom, Math.min(maxZoom, initialPinchZoom * scale));
      return;
    }

    e.preventDefault();
    if (!isDragging) return;
    var t = e.touches[0];
    var now = performance.now();
    var dx = t.clientX - dragStartPos.x;
    var dy = t.clientY - dragStartPos.y;

    var dt = now - lastMoveTime;
    if (dt > 0 && dt < 100 && lastMovePos) {
      velocity = [
        (t.clientX - lastMovePos.x) / dt * 15,
        (t.clientY - lastMovePos.y) / dt * 15
      ];
    }
    lastMoveTime = now;
    lastMovePos = { x: t.clientX, y: t.clientY };

    var sensitivity = 0.35 / zoomLevel;
    rotate[0] = dragStartRotate[0] + dx * sensitivity;
    rotate[1] = Math.max(-80, Math.min(80, dragStartRotate[1] - dy * sensitivity));
  }, { passive: false });

  canvas.addEventListener('touchend', function (e) {
    if (e.touches.length < 2) initialPinchDist = null;
    if (e.touches.length === 0) isDragging = false;
  });

  // Click on city pin → focus globe
  canvas.addEventListener('click', function () {
    if (hoveredCity) {
      animateFocus([-hoveredCity.city.lon, -hoveredCity.city.lat], Math.max(1.3, zoomLevel));
    }
  });

  // Country card or legend click → focus that country
  var focusables = document.querySelectorAll('.travel-country, .legend-item');
  for (var f = 0; f < focusables.length; f++) {
    (function (el) {
      el.addEventListener('click', function () {
        var country = el.dataset.country;
        if (!country) return;
        var cities = CITIES.filter(function (c) { return c.country === country; });
        if (cities.length === 0) return;
        var avgLat = cities.reduce(function (s, c) { return s + c.lat; }, 0) / cities.length;
        var avgLon = cities.reduce(function (s, c) { return s + c.lon; }, 0) / cities.length;
        animateFocus([-avgLon, -avgLat], country === 'india' ? 1.5 : 1.3);
        if (window.innerWidth < 768 && wrapper.scrollIntoView) {
          wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    })(focusables[f]);
  }

  function animateFocus(targetRotate, targetZoom) {
    autoRotateSpeed = 0;
    velocity = [0, 0];

    if (reduceMotion) {
      rotate[0] = targetRotate[0];
      rotate[1] = Math.max(-80, Math.min(80, targetRotate[1]));
      if (targetZoom !== null && targetZoom !== undefined) {
        zoomLevel = Math.max(minZoom, Math.min(maxZoom, targetZoom));
        projection.scale(globeRadius * zoomLevel);
      }
      resumeAutoRotate(3000);
      return;
    }

    var start = [rotate[0], rotate[1]];
    var startZ = zoomLevel;
    var endZ = (targetZoom !== null && targetZoom !== undefined)
      ? Math.max(minZoom, Math.min(maxZoom, targetZoom)) : zoomLevel;
    var duration = 800;
    var startTime = performance.now();

    var dLon = ((targetRotate[0] - start[0] + 540) % 360) - 180;
    var endLon = start[0] + dLon;
    var endLat = Math.max(-80, Math.min(80, targetRotate[1]));

    function step(now) {
      var t = Math.min(1, (now - startTime) / duration);
      var ease = 1 - Math.pow(1 - t, 3);
      rotate[0] = start[0] + (endLon - start[0]) * ease;
      rotate[1] = start[1] + (endLat - start[1]) * ease;
      zoomLevel = startZ + (endZ - startZ) * ease;
      if (t < 1) requestAnimationFrame(step);
      else resumeAutoRotate(3000);
    }
    requestAnimationFrame(step);
  }

  function animateZoom(targetZoom) {
    var startZ = zoomLevel;
    var endZ = Math.max(minZoom, Math.min(maxZoom, targetZoom));
    var duration = 300;
    var startTime = performance.now();
    function step(now) {
      var t = Math.min(1, (now - startTime) / duration);
      var ease = 1 - Math.pow(1 - t, 3);
      zoomLevel = startZ + (endZ - startZ) * ease;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // Zoom buttons
  var btnIn = document.getElementById('zoom-in');
  var btnOut = document.getElementById('zoom-out');
  var btnReset = document.getElementById('zoom-reset');

  if (btnIn) btnIn.addEventListener('click', function () { animateZoom(zoomLevel * 1.35); });
  if (btnOut) btnOut.addEventListener('click', function () { animateZoom(zoomLevel / 1.35); });
  if (btnReset) btnReset.addEventListener('click', function () {
    animateFocus([HOME[0], HOME[1]], 1.0);
  });

  // Animation loop
  function animate() {
    if (!isDragging) {
      if (Math.abs(velocity[0]) > 0.05 || Math.abs(velocity[1]) > 0.05) {
        rotate[0] += velocity[0] * 0.05;
        rotate[1] = Math.max(-80, Math.min(80, rotate[1] - velocity[1] * 0.05));
        velocity[0] *= friction;
        velocity[1] *= friction;

        if (Math.abs(velocity[0]) <= 0.05 && Math.abs(velocity[1]) <= 0.05) {
          velocity = [0, 0];
          resumeAutoRotate(1000);
        }
      } else {
        rotate[0] += autoRotateSpeed;
      }
    }
    draw();
    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', resize);
  resize();
  animate();
})();
