/*
 * Visitors globe — live choropleth of where readers come from.
 * Orthographic D3 projection on canvas, sibling of the travel globe:
 * drag with momentum, auto-rotation, pinch or double-tap zoom, tap a
 * country for its count. Country counts are polled from the Cloudflare
 * Worker every 15s and shaded on a ramp from --map-low to --map-high
 * (theme-aware). The sphere gets an atmosphere halo and limb vignette
 * from the --visitors-* tokens so it reads as a lit planet, not a disc.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('visitors-canvas');
  var tooltip = document.getElementById('visitors-tooltip');
  var wrapper = document.getElementById('visitors-wrapper');
  var api = canvas && canvas.dataset.api;
  if (!canvas || !wrapper || !api || !window.d3) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var countryFeats = [];   // topojson country features
  var byNumeric = {};      // numeric ISO id -> { name, count }
  var iso2 = {};           // alpha-2 -> numeric id

  var globeRadius, centerX, centerY, dpr = 1;
  var projection, pathGenerator;
  var sphere = { type: 'Sphere' };
  var graticule = window.d3.geoGraticule10();

  var HOME = [-20, -15];
  var BASE_ROTATE = 0.12;
  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) BASE_ROTATE = 0;

  var zoomLevel = 1.0, minZoom = 0.65, maxZoom = 2.6;
  var rotate = [HOME[0], HOME[1], 0];
  var autoRotateSpeed = BASE_ROTATE;
  var isDragging = false;
  var dragStartPos, dragStartRotate;
  var velocity = [0, 0];
  var lastMoveTime = 0, lastMovePos = null;
  var friction = 0.94;
  var mousePos = null;
  var zoomAnim = null;         // { from, to, start, dur }
  var tapPick = null;          // { numeric, until } — touch tap inspection

  var THEME = {};
  function readTheme() {
    var s = getComputedStyle(document.documentElement);
    function v(name, fallback) {
      var val = s.getPropertyValue(name).trim();
      return val || fallback;
    }
    THEME.ocean = [v('--visitors-ocean-1', '#f4f8ff'), v('--visitors-ocean-2', '#d9e6f8'), v('--visitors-ocean-3', '#a9c6e8')];
    THEME.atmosphere = v('--visitors-atmosphere', 'rgba(99, 102, 241, 0.18)');
    THEME.limb = v('--visitors-limb', 'rgba(30, 41, 99, 0.14)');
    THEME.outline = v('--globe-outline', 'rgba(59,130,246,0.25)');
    THEME.graticule = v('--globe-graticule', 'rgba(59,130,246,0.15)');
    THEME.mapIdle = v('--map-idle', 'rgba(100,116,139,0.20)');
    THEME.mapLow = v('--map-low', '#b9c4fa');
    THEME.mapHigh = v('--map-high', '#4f46e5');
    THEME.mapStroke = v('--map-stroke', 'rgba(148,163,184,0.35)');
  }
  readTheme();
  document.addEventListener('themechange', readTheme);

  function shade(count, max) {
    if (!count) return THEME.mapIdle;
    var t = Math.sqrt(count / max); // sqrt spreads out small counts
    return window.d3.interpolateRgb(THEME.mapLow, THEME.mapHigh)(t);
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    var rect = wrapper.getBoundingClientRect();
    // Fit the smaller of the wrapper, the design cap and most of the
    // viewport height, so phones never get a globe taller than the screen.
    var size = Math.min(rect.width, 520,
      Math.max(300, Math.floor(window.innerHeight * 0.72)));
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

  function showTooltipAt(x, y, name, count) {
    var size = canvas.clientWidth;
    // Keep the (above-anchor, centered) tooltip inside the globe area.
    var tx = Math.max(70, Math.min(size - 70, x));
    var ty = Math.max(46, y);
    tooltip.innerHTML = '<strong>' + name + '</strong><br><span>' +
      (count ? count + (count === 1 ? ' visit' : ' visits') : 'no visits yet') + '</span>';
    tooltip.style.left = tx + 'px';
    tooltip.style.top = (ty - 14) + 'px';
    tooltip.style.opacity = '1';
  }

  function hideTooltip() {
    tooltip.style.opacity = '0';
  }

  // Nearest country centroid within `radius` px of (x, y) on the visible
  // hemisphere — 14px suits a mouse cursor, ~28px a fingertip.
  function pickCountry(x, y, radius) {
    var centerCoords = [-rotate[0], -rotate[1]];
    var best = null, bestD = radius * radius;
    for (var i = 0; i < countryFeats.length; i++) {
      var feat = countryFeats[i];
      var info = byNumeric[String(feat.id)];
      if (!info) continue;
      var centroid = window.d3.geoCentroid(feat);
      if (window.d3.geoDistance(centroid, centerCoords) >= Math.PI / 2) continue;
      var pt = projection(centroid);
      var dx = pt[0] - x, dy = pt[1] - y;
      var d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = { numeric: String(feat.id), info: info, x: x, y: y }; }
    }
    return best;
  }

  function draw() {
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    projection.scale(globeRadius * zoomLevel);
    projection.rotate(rotate);
    var R = globeRadius * zoomLevel;

    // Atmosphere halo just outside the sphere
    var halo = ctx.createRadialGradient(centerX, centerY, R * 0.9, centerX, centerY, R * 1.16);
    halo.addColorStop(0, THEME.atmosphere);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(centerX, centerY, R * 1.16, 0, 2 * Math.PI);
    ctx.fillStyle = halo;
    ctx.fill();

    // Ocean
    var grad = ctx.createRadialGradient(
      centerX - R * 0.25, centerY - R * 0.25, 0,
      centerX, centerY, R
    );
    grad.addColorStop(0, THEME.ocean[0]);
    grad.addColorStop(0.7, THEME.ocean[1]);
    grad.addColorStop(1, THEME.ocean[2]);
    ctx.beginPath();
    pathGenerator(sphere);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = THEME.outline;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    pathGenerator(graticule);
    ctx.strokeStyle = THEME.graticule;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    var now = performance.now();
    var max = 1;
    for (var key in byNumeric) {
      if (byNumeric[key].count > max) max = byNumeric[key].count;
    }

    for (var i = 0; i < countryFeats.length; i++) {
      var feat = countryFeats[i];
      var info = byNumeric[String(feat.id)];
      if (!info) continue;
      ctx.beginPath();
      pathGenerator(feat);
      ctx.fillStyle = shade(info.count, max);
      ctx.fill();
      var picked = tapPick && tapPick.numeric === String(feat.id) && now < tapPick.until;
      if (picked) {
        ctx.strokeStyle = THEME.mapHigh;
        ctx.lineWidth = 1.6;
      } else if (info.count) {
        ctx.strokeStyle = THEME.mapHigh;
        ctx.lineWidth = 0.7;
      } else {
        ctx.strokeStyle = THEME.mapStroke;
        ctx.lineWidth = 0.4;
      }
      ctx.stroke();
    }

    // Limb vignette — sphere edge falls into shade for a 3D read
    var limb = ctx.createRadialGradient(centerX, centerY, R * 0.55, centerX, centerY, R);
    limb.addColorStop(0, 'rgba(0,0,0,0)');
    limb.addColorStop(1, THEME.limb);
    ctx.beginPath();
    pathGenerator(sphere);
    ctx.fillStyle = limb;
    ctx.fill();

    ctx.restore();

    // Mouse hover tooltip
    var hovered = (!isDragging && mousePos) ? pickCountry(mousePos.x, mousePos.y, 14) : null;
    if (hovered) {
      showTooltipAt(hovered.x, hovered.y, hovered.info.name, hovered.info.count);
      canvas.style.cursor = 'pointer';
    } else {
      canvas.style.cursor = isDragging ? 'grabbing' : 'grab';
    }

    // Pinned tap tooltip — tracks its country even as the globe turns,
    // and hides early if the country rotates out of view.
    if (tapPick) {
      if (now >= tapPick.until) {
        tapPick = null;
        if (!hovered) hideTooltip();
      } else {
        var feat2 = null;
        for (var j = 0; j < countryFeats.length; j++) {
          if (String(countryFeats[j].id) === tapPick.numeric) { feat2 = countryFeats[j]; break; }
        }
        var pt2 = null;
        if (feat2) {
          var centroid2 = window.d3.geoCentroid(feat2);
          var centerCoords2 = [-rotate[0], -rotate[1]];
          if (window.d3.geoDistance(centroid2, centerCoords2) < Math.PI / 2) {
            pt2 = projection(centroid2);
          }
        }
        if (pt2) {
          var info2 = byNumeric[tapPick.numeric] || { name: '?', count: 0 };
          showTooltipAt(pt2[0], pt2[1], info2.name, info2.count);
        } else {
          tapPick = null;
          if (!hovered) hideTooltip();
        }
      }
    } else if (!hovered) {
      hideTooltip();
    }
  }

  // --- Data ---

  function ingestStats(data) {
    for (var a2 in data.countries) {
      var numeric = iso2[a2];
      if (numeric && byNumeric[numeric]) {
        byNumeric[numeric].count = data.countries[a2];
      }
    }
    var el = document.getElementById('visitors-count');
    if (el) {
      el.textContent = Number(data.total).toLocaleString();
      el.classList.remove('pulse');
      void el.offsetWidth; // restart the pulse animation
      el.classList.add('pulse');
    }
    var today = document.getElementById('visitors-today');
    if (today) today.textContent = Number(data.today).toLocaleString() + ' today';
    var n = Object.keys(data.countries).filter(function (k) { return data.countries[k] > 0; }).length;
    var c = document.getElementById('visitors-countries');
    if (c) c.textContent = n + (n === 1 ? ' country' : ' countries');
    document.getElementById('visitors-live').style.opacity = '1';
  }

  function poll() {
    fetch(api + '/stats')
      .then(function (r) { return r.json(); })
      .then(ingestStats)
      .catch(function () {});
  }

  fetch('/assets/visitors/vendor/iso2-numeric.json')
    .then(function (r) { return r.json(); })
    .then(function (map) {
      iso2 = map;
      return fetch('/assets/visitors/vendor/countries-110m.json');
    })
    .then(function (r) { return r.json(); })
    .then(function (topology) {
      var feats = window.topojson.feature(
        topology, topology.objects.countries).features;
      for (var i = 0; i < feats.length; i++) {
        var f = feats[i];
        if (!f.id) continue;
        countryFeats.push(f);
        byNumeric[String(f.id)] = { name: (f.properties && f.properties.name) || '?', count: 0 };
      }
    })
    .catch(function () {});

  setInterval(poll, 15000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) poll();
  });
  poll();

  // --- Zoom ---

  function animateZoomTo(target) {
    if (reduceMotion) { zoomLevel = target; return; }
    zoomAnim = { from: zoomLevel, to: target, start: performance.now(), dur: 320 };
  }

  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    zoomAnim = null;
    var factor = e.deltaY < 0 ? 1.12 : 0.89;
    zoomLevel = Math.max(minZoom, Math.min(maxZoom, zoomLevel * factor));
  }, { passive: false });

  // --- Mouse drag & momentum ---

  canvas.addEventListener('mousemove', function (e) {
    var rect = canvas.getBoundingClientRect();
    mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (!isDragging) return;
    trackDrag(e.clientX, e.clientY);
  });

  canvas.addEventListener('mousedown', function (e) {
    beginDrag(e.clientX, e.clientY);
  });

  window.addEventListener('mouseup', function () {
    if (isDragging) isDragging = false;
  });

  canvas.addEventListener('mouseleave', function () {
    mousePos = null;
  });

  function beginDrag(x, y) {
    isDragging = true;
    autoRotateSpeed = 0;
    velocity = [0, 0];
    dragStartPos = { x: x, y: y };
    dragStartRotate = [rotate[0], rotate[1]];
    lastMoveTime = performance.now();
    lastMovePos = { x: x, y: y };
  }

  function trackDrag(x, y) {
    var now = performance.now();
    var dx = x - dragStartPos.x;
    var dy = y - dragStartPos.y;

    var dt = now - lastMoveTime;
    if (dt > 0 && dt < 100 && lastMovePos) {
      velocity = [
        (x - lastMovePos.x) / dt * 15,
        (y - lastMovePos.y) / dt * 15
      ];
    }
    lastMoveTime = now;
    lastMovePos = { x: x, y: y };

    var sensitivity = 0.35 / zoomLevel;
    rotate[0] = dragStartRotate[0] + dx * sensitivity;
    rotate[1] = Math.max(-80, Math.min(80, dragStartRotate[1] - dy * sensitivity));
  }

  // --- Touch: drag, momentum, pinch-to-zoom, tap & double-tap ---

  var pinchStartDist = null;
  var pinchStartZoom = 1.0;
  var touchStart = null;      // { x, y, t } for tap detection
  var lastTapTime = 0;

  canvas.addEventListener('touchstart', function (e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      isDragging = false;
      touchStart = null;
      pinchStartDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartZoom = zoomLevel;
      return;
    }
    e.preventDefault();
    zoomAnim = null;
    beginDrag(e.touches[0].clientX, e.touches[0].clientY);
    touchStart = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      t: performance.now()
    };
  }, { passive: false });

  canvas.addEventListener('touchmove', function (e) {
    if (e.touches.length === 2 && pinchStartDist) {
      e.preventDefault();
      var dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      zoomLevel = Math.max(minZoom, Math.min(maxZoom, pinchStartZoom * dist / pinchStartDist));
      return;
    }
    e.preventDefault();
    if (!isDragging) return;
    var t = e.touches[0];
    trackDrag(t.clientX, t.clientY);
    if (touchStart && Math.hypot(t.clientX - touchStart.x, t.clientY - touchStart.y) > 10) {
      touchStart = null; // it's a drag, not a tap
    }
  }, { passive: false });

  canvas.addEventListener('touchend', function (e) {
    if (e.touches.length < 2) pinchStartDist = null;
    if (e.touches.length > 0) return;

    isDragging = false;
    mousePos = null;
    if (!touchStart) return;
    var tap = touchStart;
    touchStart = null;
    if (performance.now() - tap.t > 400) return;

    var now = performance.now();
    var rect = canvas.getBoundingClientRect();
    var x = tap.x - rect.left, y = tap.y - rect.top;

    if (now - lastTapTime < 300) {
      // double-tap: toggle between home and close-up
      lastTapTime = 0;
      tapPick = null;
      animateZoomTo(zoomLevel > 1.4 ? 1.0 : 1.9);
      return;
    }
    lastTapTime = now;

    var hit = pickCountry(x, y, 28);
    if (hit) {
      tapPick = { numeric: hit.numeric, until: now + 2600 };
    } else {
      tapPick = null;
      hideTooltip();
    }
  });

  // --- Frame loop ---

  function animate() {
    if (zoomAnim) {
      var p = Math.min(1, (performance.now() - zoomAnim.start) / zoomAnim.dur);
      var eased = 1 - Math.pow(1 - p, 3);
      zoomLevel = zoomAnim.from + (zoomAnim.to - zoomAnim.from) * eased;
      if (p >= 1) zoomAnim = null;
    }
    if (!isDragging) {
      if (Math.abs(velocity[0]) > 0.05 || Math.abs(velocity[1]) > 0.05) {
        rotate[0] += velocity[0] * 0.05;
        rotate[1] = Math.max(-80, Math.min(80, rotate[1] - velocity[1] * 0.05));
        velocity[0] *= friction;
        velocity[1] *= friction;
        if (Math.abs(velocity[0]) <= 0.05 && Math.abs(velocity[1]) <= 0.05) {
          velocity = [0, 0];
          setTimeout(function () { autoRotateSpeed = BASE_ROTATE; }, 1000);
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
