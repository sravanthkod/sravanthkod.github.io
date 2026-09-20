/*
 * Travel globe — dotted orthographic canvas globe with place markers.
 * Land dots are sampled from Natural Earth 110m land polygons
 * (assets/travel/land.geojson). No external libraries.
 */
(function () {
  'use strict';

  var PLACES = [
    // United States — California
    { name: 'San Diego', country: 'United States', lat: 32.7157, lon: -117.1611 },
    { name: 'Los Angeles', country: 'United States', lat: 34.0522, lon: -118.2437 },
    // Thailand
    { name: 'Bangkok', country: 'Thailand', lat: 13.7563, lon: 100.5018 },
    { name: 'Phuket', country: 'Thailand', lat: 7.8804, lon: 98.3923 },
    { name: 'Krabi', country: 'Thailand', lat: 8.0863, lon: 98.9063 },
    // India — states
    { name: 'Andhra Pradesh', country: 'India', lat: 15.9129, lon: 79.7400 },
    { name: 'Tamil Nadu', country: 'India', lat: 11.1271, lon: 78.6569 },
    { name: 'Karnataka', country: 'India', lat: 15.3173, lon: 75.7139 },
    { name: 'Kerala', country: 'India', lat: 10.8505, lon: 76.2711 },
    { name: 'Maharashtra', country: 'India', lat: 19.7515, lon: 75.7139 },
    { name: 'Rajasthan', country: 'India', lat: 27.0238, lon: 74.2179 },
    { name: 'Uttar Pradesh', country: 'India', lat: 26.8467, lon: 80.9462 },
    { name: 'Odisha', country: 'India', lat: 20.9517, lon: 85.0985 },
    { name: 'Bihar', country: 'India', lat: 25.0961, lon: 85.3131 },
    { name: 'Delhi', country: 'India', lat: 28.7041, lon: 77.1025 }
  ];

  var AUTO_SPEED = 0.0016; // rad / frame at 60fps
  var TAU = Math.PI * 2;

  var canvas = document.getElementById('travel-globe-canvas');
  var tooltip = document.getElementById('globe-tooltip');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var wrap = canvas.parentElement;

  var rotY = 0, rotX = 0.35, rotVel = AUTO_SPEED;
  var flying = null;
  var dragging = false, moved = 0;
  var hovered = -1;
  var highlightCountry = null;
  var selectedCountry = null;
  var regions = []; // [{country, polys: [[Float32Array(x,y,z,...) rings...]]}]
  var pulseUntil = {};
  var markerScreen = [];
  var dots = [];
  var landPolys = null;
  var size = 0, R = 0, CX = 0, CY = 0, dotR = 1.4;
  var lastT = 0;
  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function toVec(lat, lon) {
    var phi = (90 - lat) * Math.PI / 180;
    var theta = (lon + 180) * Math.PI / 180;
    return {
      x: -Math.sin(phi) * Math.cos(theta),
      y: Math.cos(phi),
      z: Math.sin(phi) * Math.sin(theta)
    };
  }

  var markerVecs = PLACES.map(function (p) { return toVec(p.lat, p.lon); });

  /* ---------- sizing ---------- */

  function resize() {
    var w = canvas.getBoundingClientRect().width || 420;
    size = Math.max(220, Math.floor(w));
    var dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = size * 0.44;
    CX = size / 2;
    CY = size / 2;
    dotR = Math.max(1.1, size * 0.0042);
  }

  /* ---------- land data & dot lattice ---------- */

  function flattenRing(ring) {
    var out = new Float64Array(ring.length * 2);
    for (var i = 0; i < ring.length; i++) {
      out[i * 2] = ring[i][0];
      out[i * 2 + 1] = ring[i][1];
    }
    return out;
  }

  function pointOnLand(lon, lat) {
    if (!landPolys) return true;
    for (var p = 0; p < landPolys.length; p++) {
      var rings = landPolys[p];
      var inside = false;
      for (var r = 0; r < rings.length; r++) {
        var ring = rings[r];
        var x1 = ring[0], y1 = ring[1];
        for (var i = 2; i < ring.length; i += 2) {
          var x2 = ring[i], y2 = ring[i + 1];
          if ((y2 > lat) !== (y1 > lat) &&
              lon < (x1 - x2) * (lat - y2) / (y1 - y2) + x2) {
            inside = !inside;
          }
          x1 = x2; y1 = y2;
        }
      }
      if (inside) return true;
    }
    return false;
  }

  function buildDots() {
    var pts = [];
    if (landPolys) {
      var N = 7000;
      var GA = Math.PI * (3 - Math.sqrt(5));
      for (var i = 0; i < N; i++) {
        var y = 1 - (i / (N - 1)) * 2;
        var rad = Math.sqrt(Math.max(0, 1 - y * y));
        var th = GA * i;
        var x = Math.cos(th) * rad, z = Math.sin(th) * rad;
        var lat = 90 - Math.acos(y) * 180 / Math.PI;
        var lon = Math.atan2(z, -x) * 180 / Math.PI - 180;
        lon = ((lon % 360) + 540) % 360 - 180;
        if (pointOnLand(lon, lat)) pts.push({ x: x, y: y, z: z });
      }
    } else {
      // fallback: uniform dot sphere until (or if) land data arrives
      var M = 2600, GA2 = Math.PI * (3 - Math.sqrt(5));
      for (var j = 0; j < M; j++) {
        var y2 = 1 - (j / (M - 1)) * 2;
        var r2 = Math.sqrt(Math.max(0, 1 - y2 * y2));
        var t2 = GA2 * j;
        pts.push({ x: Math.cos(t2) * r2, y: y2, z: Math.sin(t2) * r2 });
      }
    }
    dots = pts;
  }

  /* ---------- rotation targets ---------- */

  function rotationFor(lat, lon) {
    var v = toVec(lat, lon);
    return {
      y: Math.atan2(-v.x, v.z),
      x: Math.atan2(v.y, Math.sqrt(v.x * v.x + v.z * v.z))
    };
  }

  function flyTo(lat, lon, dur) {
    if (reduceMotion) {
      var now = rotationFor(lat, lon);
      rotY = now.y; rotX = now.x;
      return;
    }
    var to = rotationFor(lat, lon);
    var fromY = rotY % TAU;
    var delta = (to.y - fromY) % TAU;
    if (delta > Math.PI) delta -= TAU;
    if (delta < -Math.PI) delta += TAU;
    flying = {
      t0: performance.now(),
      dur: dur || 900,
      fromY: fromY,
      fromX: rotX,
      toY: fromY + delta,
      toX: to.x
    };
    rotVel = AUTO_SPEED;
  }

  /* ---------- render loop ---------- */

  function frame(t) {
    requestAnimationFrame(frame);
    var dt = Math.min(50, t - (lastT || t));
    lastT = t;

    if (flying) {
      var f = flying;
      var u = Math.min(1, (t - f.t0) / f.dur);
      var e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      rotY = f.fromY + (f.toY - f.fromY) * e;
      rotX = f.fromX + (f.toX - f.fromX) * e;
      if (u >= 1) flying = null;
    } else if (!dragging && hovered < 0) {
      var target = reduceMotion ? 0 : AUTO_SPEED;
      if (Math.abs(rotVel) > Math.abs(target)) {
        rotVel *= 0.95;
        if (Math.abs(rotVel) < Math.abs(target)) rotVel = target;
      } else {
        rotVel = target;
      }
      rotY += rotVel * (dt / 16.7);
    }

    if (rotX > 1.1) rotX = 1.1;
    if (rotX < -1.1) rotX = -1.1;

    render(t);
  }

  function render(time) {
    ctx.clearRect(0, 0, size, size);
    var cy = Math.cos(rotY), sy = Math.sin(rotY);
    var cx = Math.cos(rotX), sx = Math.sin(rotX);

    // sphere backdrop
    var bg = ctx.createRadialGradient(CX - R * 0.35, CY - R * 0.4, R * 0.1, CX, CY, R);
    bg.addColorStop(0, 'rgba(99,102,241,0.10)');
    bg.addColorStop(1, 'rgba(6,182,212,0.06)');
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, TAU);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(99,102,241,0.35)';
    ctx.stroke();

    // land dots
    var front = [], back = [];
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      var x1 = d.x * cy + d.z * sy;
      var z1 = -d.x * sy + d.z * cy;
      var y2 = d.y * cx - z1 * sx;
      var z2 = d.y * sx + z1 * cx;
      var pt = { x: CX + x1 * R, y: CY - y2 * R };
      if (z2 > 0) front.push(pt); else back.push(pt);
    }
    ctx.beginPath();
    for (var b = 0; b < back.length; b++) {
      ctx.moveTo(back[b].x + dotR * 0.7, back[b].y);
      ctx.arc(back[b].x, back[b].y, dotR * 0.7, 0, TAU);
    }
    ctx.fillStyle = 'rgba(100,116,139,0.10)';
    ctx.fill();

    ctx.beginPath();
    for (var q = 0; q < front.length; q++) {
      ctx.moveTo(front[q].x + dotR, front[q].y);
      ctx.arc(front[q].x, front[q].y, dotR, 0, TAU);
    }
    ctx.fillStyle = 'rgba(99,102,241,0.55)';
    ctx.fill();

    // visited regions (filled)
    drawRegions(cy, sy, cx, sx);

    // place markers
    markerScreen = [];
    for (var m = 0; m < markerVecs.length; m++) {
      var v = markerVecs[m];
      var X = v.x * cy + v.z * sy;
      var Z = -v.x * sy + v.z * cy;
      var Y2 = v.y * cx - Z * sx;
      var Z2 = v.y * sx + Z * cx;
      if (Z2 <= 0.02) { markerScreen.push(null); continue; }
      var px = CX + X * R, py = CY - Y2 * R;
      markerScreen.push({ x: px, y: py });

      var hot = hovered === m || PLACES[m].country === highlightCountry ||
                PLACES[m].country === selectedCountry;
      var pulsing = pulseUntil[m] && time < pulseUntil[m];
      var base = hot ? 5.5 : 3.4;
      var rad = base + ((hot || pulsing) ? Math.abs(Math.sin(time / 300 + m)) * 1.6 : 0);

      ctx.beginPath();
      ctx.arc(px, py, rad + 5, 0, TAU);
      ctx.fillStyle = 'rgba(99,102,241,' + (hot ? 0.28 : 0.16) + ')';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, rad * 0.55, 0, TAU);
      ctx.fillStyle = '#6366f1';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, rad * 0.24, 0, TAU);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  }

  /* ---------- visited regions ---------- */

  var scratch = [];

  function addRing(vecs, cy, sy, cx, sx) {
    var n = vecs.length / 3;
    var anyFront = false;
    for (var i = 0; i < n; i++) {
      var x = vecs[i * 3], y = vecs[i * 3 + 1], z = vecs[i * 3 + 2];
      var x1 = x * cy + z * sy;
      var z1 = -x * sy + z * cy;
      var y2 = y * cx - z1 * sx;
      var z2 = y * sx + z1 * cx;
      var px, py;
      if (z2 >= 0) {
        anyFront = true;
        px = CX + x1 * R;
        py = CY - y2 * R;
      } else {
        // back-facing point: clamp onto the horizon rim
        var ux = x1, uy = -y2;
        var len = Math.sqrt(ux * ux + uy * uy) || 1;
        px = CX + ux / len * R;
        py = CY + uy / len * R;
      }
      scratch[i * 2] = px;
      scratch[i * 2 + 1] = py;
    }
    if (!anyFront) return;
    ctx.moveTo(scratch[0], scratch[1]);
    for (var k = 1; k < n; k++) {
      ctx.lineTo(scratch[k * 2], scratch[k * 2 + 1]);
    }
    ctx.closePath();
  }

  function drawRegions(cy, sy, cx, sx) {
    for (var g = 0; g < regions.length; g++) {
      var reg = regions[g];
      var sel = reg.country === selectedCountry;
      var hot = sel || reg.country === highlightCountry;
      ctx.beginPath();
      for (var p = 0; p < reg.polys.length; p++) {
        var rings = reg.polys[p];
        for (var r = 0; r < rings.length; r++) {
          addRing(rings[r], cy, sy, cx, sx);
        }
      }
      ctx.fillStyle = 'rgba(6,182,212,' + (sel ? 0.45 : hot ? 0.32 : 0.20) + ')';
      ctx.fill();
      if (sel || hot) {
        ctx.lineWidth = sel ? 1.4 : 1;
        ctx.strokeStyle = 'rgba(6,182,212,' + (sel ? 0.9 : 0.55) + ')';
        ctx.stroke();
      }
    }
  }

  function loadRegions(geo) {
    var byCountry = {};
    geo.features.forEach(function (f) {
      var country = f.properties && f.properties.country;
      var g = f.geometry;
      if (!country || !g) return;
      if (!byCountry[country]) byCountry[country] = [];
      function addPoly(poly) {
        byCountry[country].push(poly.map(function (ring) {
          var v = new Float32Array(ring.length * 3);
          for (var i = 0; i < ring.length; i++) {
            var p = toVec(ring[i][1], ring[i][0]); // [lon, lat]
            v[i * 3] = p.x;
            v[i * 3 + 1] = p.y;
            v[i * 3 + 2] = p.z;
          }
          return v;
        }));
      }
      if (g.type === 'Polygon') addPoly(g.coordinates);
      else if (g.type === 'MultiPolygon') {
        for (var i = 0; i < g.coordinates.length; i++) addPoly(g.coordinates[i]);
      }
    });
    regions = Object.keys(byCountry).map(function (c) {
      return { country: c, polys: byCountry[c] };
    });
  }

  /* ---------- interaction ---------- */

  function updateTooltip() {
    if (hovered >= 0 && markerScreen[hovered]) {
      var p = PLACES[hovered];
      tooltip.textContent = p.name + ' · ' + p.country;
      tooltip.style.left = markerScreen[hovered].x + 'px';
      tooltip.style.top = markerScreen[hovered].y + 'px';
      tooltip.style.opacity = '1';
    } else {
      tooltip.style.opacity = '0';
    }
  }

  var lastPX = 0, lastPY = 0;

  canvas.addEventListener('pointerdown', function (e) {
    dragging = true;
    moved = 0;
    flying = null;
    rotVel = 0;
    lastPX = e.clientX;
    lastPY = e.clientY;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });

  canvas.addEventListener('pointermove', function (e) {
    if (dragging) {
      var dx = e.clientX - lastPX, dy = e.clientY - lastPY;
      lastPX = e.clientX; lastPY = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      rotY += dx * 0.006;
      rotX += dy * 0.005;
      rotVel = dx * 0.006;
    } else {
      var mx = e.offsetX, my = e.offsetY;
      var best = -1, bestDist = 196; // 14px squared
      for (var m = 0; m < markerScreen.length; m++) {
        var s = markerScreen[m];
        if (!s) continue;
        var ddx = s.x - mx, ddy = s.y - my;
        var dd = ddx * ddx + ddy * ddy;
        if (dd < bestDist) { best = m; bestDist = dd; }
      }
      hovered = best;
      updateTooltip();
    }
  });

  canvas.addEventListener('pointerup', function (e) {
    dragging = false;
    if (moved < 5 && hovered >= 0) {
      var p = PLACES[hovered];
      selectCountry(p.country);
      flyTo(p.lat, p.lon);
      pulseUntil[hovered] = performance.now() + 2500;
    }
  });

  canvas.addEventListener('pointerleave', function () {
    hovered = -1;
    updateTooltip();
  });

  /* ---------- list <-> globe wiring ---------- */

  function scrollGlobeIntoView() {
    if (window.innerWidth < 768 && wrap && wrap.scrollIntoView) {
      wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  var placeCountry = {};
  PLACES.forEach(function (p) { placeCountry[p.name] = p.country; });

  var cards = document.querySelectorAll('.travel-country');
  var chips = document.querySelectorAll('.travel-chip[data-place]');

  function updateSelectionClasses() {
    for (var k = 0; k < chips.length; k++) {
      if (placeCountry[chips[k].dataset.place] === selectedCountry) {
        chips[k].classList.add('active');
      } else {
        chips[k].classList.remove('active');
      }
    }
    for (var c = 0; c < cards.length; c++) {
      if (cards[c].dataset.country === selectedCountry) {
        cards[c].classList.add('selected');
      } else {
        cards[c].classList.remove('selected');
      }
    }
  }

  function selectCountry(name) {
    selectedCountry = name;
    updateSelectionClasses();
  }

  for (var c = 0; c < cards.length; c++) {
    (function (card) {
      var head = card.querySelector('.travel-country-header');
      if (head) {
        head.addEventListener('click', function () {
          selectCountry(card.dataset.country);
          flyTo(parseFloat(card.dataset.lat), parseFloat(card.dataset.lon));
          scrollGlobeIntoView();
        });
      }
      card.addEventListener('mouseenter', function () {
        highlightCountry = card.dataset.country;
      });
      card.addEventListener('mouseleave', function () {
        if (highlightCountry === card.dataset.country) highlightCountry = null;
      });
    })(cards[c]);
  }

  for (var k = 0; k < chips.length; k++) {
    (function (chip) {
      chip.addEventListener('click', function () {
        var name = chip.dataset.place;
        selectCountry(placeCountry[name]);
        for (var m = 0; m < PLACES.length; m++) {
          if (PLACES[m].name === name) {
            flyTo(PLACES[m].lat, PLACES[m].lon);
            pulseUntil[m] = performance.now() + 2500;
            break;
          }
        }
        scrollGlobeIntoView();
      });
    })(chips[k]);
  }

  /* ---------- boot ---------- */

  resize();
  if (window.ResizeObserver) {
    new ResizeObserver(resize).observe(canvas);
  } else {
    window.addEventListener('resize', resize);
  }

  var start = rotationFor(22.5, 79); // open on India
  rotY = start.y;
  rotX = start.x;

  fetch('/assets/travel/land.geojson')
    .then(function (r) { return r.json(); })
    .then(function (geo) {
      landPolys = [];
      geo.features.forEach(function (f) {
        var g = f.geometry;
        if (!g) return;
        function addPoly(poly) {
          landPolys.push(poly.map(flattenRing));
        }
        if (g.type === 'Polygon') addPoly(g.coordinates);
        else if (g.type === 'MultiPolygon') {
          for (var i = 0; i < g.coordinates.length; i++) addPoly(g.coordinates[i]);
        }
      });
      buildDots();
    })
    .catch(function () { buildDots(); });

  fetch('/assets/travel/regions.geojson')
    .then(function (r) { return r.json(); })
    .then(loadRegions)
    .catch(function () { /* regions are optional decoration */ });

  requestAnimationFrame(frame);
})();
