/*
 * Visitors globe — live choropleth of where readers come from.
 * Orthographic D3 projection on canvas, sibling of the travel globe:
 * drag with momentum, auto-rotation, hover tooltips. Country counts are
 * polled from the Cloudflare Worker every 15s and shaded on a ramp
 * from --map-low to --map-high (theme-aware, like the travel globe).
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

  var THEME = {};
  function readTheme() {
    var s = getComputedStyle(document.documentElement);
    function v(name, fallback) {
      var val = s.getPropertyValue(name).trim();
      return val || fallback;
    }
    THEME.ocean = [v('--globe-ocean-1', '#dbeafe'), v('--globe-ocean-2', '#bfdbfe'), v('--globe-ocean-3', '#93c5fd')];
    THEME.outline = v('--globe-outline', 'rgba(59,130,246,0.25)');
    THEME.graticule = v('--globe-graticule', 'rgba(59,130,246,0.15)');
    THEME.mapIdle = v('--map-idle', 'rgba(100,116,139,0.25)');
    THEME.mapLow = v('--map-low', '#c7d2fe');
    THEME.mapHigh = v('--map-high', '#6366f1');
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

  function draw() {
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    projection.scale(globeRadius * zoomLevel);
    projection.rotate(rotate);

    var grad = ctx.createRadialGradient(
      centerX - globeRadius * zoomLevel * 0.25, centerY - globeRadius * zoomLevel * 0.25, 0,
      centerX, centerY, globeRadius * zoomLevel
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

    var max = 1;
    var centerCoords = [-rotate[0], -rotate[1]];
    var hovered = null;
    for (var key in byNumeric) {
      if (byNumeric[key].count > max) max = byNumeric[key].count;
    }

    for (var i = 0; i < countryFeats.length; i++) {
      var feat = countryFeats[i];
      var info = byNumeric[String(feat.id)];
      if (!info) continue;
      var centroid = window.d3.geoCentroid(feat);
      var visible = window.d3.geoDistance(centroid, centerCoords) < Math.PI / 2;
      ctx.beginPath();
      pathGenerator(feat);
      ctx.fillStyle = shade(info.count, max);
      ctx.fill();
      ctx.strokeStyle = info.count ? THEME.mapHigh : THEME.mapStroke;
      ctx.lineWidth = info.count ? 0.6 : 0.4;
      ctx.stroke();

      if (visible && mousePos) {
        var pt = projection(centroid);
        var dx = mousePos.x - pt[0], dy = mousePos.y - pt[1];
        if (dx * dx + dy * dy < 14 * 14 && !hovered) {
          hovered = { name: info.name, count: info.count };
        }
      }
    }

    ctx.restore();

    if (hovered && !isDragging && mousePos) {
      tooltip.innerHTML = '<strong>' + hovered.name + '</strong><br><span>' +
        (hovered.count ? hovered.count + (hovered.count === 1 ? ' visit' : ' visits') : 'no visits yet') + '</span>';
      tooltip.style.opacity = '1';
      tooltip.style.left = mousePos.x + 'px';
      tooltip.style.top = (mousePos.y - 14) + 'px';
      canvas.style.cursor = 'pointer';
    } else {
      tooltip.style.opacity = '0';
      canvas.style.cursor = isDragging ? 'grabbing' : 'grab';
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

  // --- Drag & momentum (same feel as the travel globe) ---

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

  window.addEventListener('mouseup', function () { isDragging = false; });
  canvas.addEventListener('mouseleave', function () { mousePos = null; });

  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    zoomLevel = Math.max(minZoom, Math.min(maxZoom,
      zoomLevel * (e.deltaY < 0 ? 1.12 : 0.89)));
  }, { passive: false });

  function animate() {
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
