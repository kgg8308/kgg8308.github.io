(function () {
  // ── 지도 ──
  var box = document.getElementById('placemap');
  var dataEl = document.getElementById('place-data');
  if (box && dataEl) {
    var PIN = {"food":"#e03131","hot":"#2f6df6"};
    var data = JSON.parse(dataEl.textContent);
    var useCluster = data.length > 40;
    var css = function (h) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = h; document.head.appendChild(l); };
    var js = function (s) { return new Promise(function (ok, no) { var t = document.createElement('script'); t.src = s; t.onload = ok; t.onerror = no; document.head.appendChild(t); }); };
    var e = function (s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var started = false;
    var start = function () {
      if (started) return; started = true;
      var L0 = 'https://unpkg.com/leaflet@1.9.4/dist/', C0 = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/';
      css(L0 + 'leaflet.css');
      var p = js(L0 + 'leaflet.js');
      if (useCluster) { css(C0 + 'MarkerCluster.css'); p = p.then(function () { return js(C0 + 'leaflet.markercluster.js'); }); }
      p.then(draw).catch(function () { box.innerHTML = '<span class="map-loading">지도를 불러오지 못했습니다. 새로고침해 주세요.</span>'; });
    };
    var draw = function () {
      box.innerHTML = '';
      var map = L.map(box, { scrollWheelZoom: false, zoomSnap: 0.5 });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
      var group = useCluster
        ? L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 42, iconCreateFunction: function (c) { return L.divIcon({ html: '<div class="pin-cluster">' + c.getChildCount() + '</div>', className: '', iconSize: [40, 40] }); } })
        : L.featureGroup();
      var cur = null;
      data.forEach(function (p) {
        var c = PIN[p.k] || PIN.hot, s = p.c ? 38 : 28;
        var cls = 'pin' + (p.c ? ' pin-cur' : '') + (p.z ? ' pin-closed' : '') + (data.some(function (q) { return q.c; }) && !p.c ? ' pin-dim' : '');
        var icon = L.divIcon({ html: '<div class="' + cls + '" style="--pc:' + c + '"></div>', className: '', iconSize: [s, s], iconAnchor: [s / 2, s], popupAnchor: [0, -s + 2] });
        var html = '<a class="pop" style="--pc:' + c + '" href="' + e(p.u) + '">' +
          (p.i ? '<span class="pop-img"><img src="' + e(p.i) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></span>' : '') +
          '<span class="pop-body"><span class="pop-kind">' + (p.k === 'food' ? '맛집' : '핫플') + (p.z ? ' · 폐업' : '') + '</span><span class="pop-name">' + e(p.n) + '</span>' +
          (p.a ? '<span class="pop-addr">' + e(p.a) + '</span>' : '') +
          (p.c ? '' : '<span class="pop-cta">자세히 보기 &rarr;</span>') + '</span></a>';
        var mk = L.marker([p.y, p.x], { icon: icon, title: p.n, alt: p.n, zIndexOffset: p.c ? 1000 : 0 }).bindPopup(html, { maxWidth: 240 });
        if (p.c) { cur = mk; mk.addTo(map); } else group.addLayer(mk);
      });
      map.addLayer(group);
      if (cur) {
        var ll = cur.getLatLng();
        var b = L.latLngBounds([ll]);
        if (group.getLayers().length) b.extend(group.getBounds());
        // 근처 핀이 보이되, 너무 멀리 빠지지는 않게
        map.fitBounds(b, { padding: [40, 40], maxZoom: 16 });
        if (map.getZoom() < 13) map.setView(ll, 14);
      } else if (data.length) {
        map.fitBounds(group.getBounds(), { padding: [36, 36], maxZoom: 15 });
      } else map.setView([36.3, 127.8], 7);
      map.once('focus click', function () { map.scrollWheelZoom.enable(); });
    };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '400px' });
      io.observe(box);
    } else start();
  }

  // ── 방문자 수 (홈과 같은 카운터. 같은 브라우저는 하루 한 번만 집계) ──
  var API = 'https://abacus.jasoncameron.dev', NS = 'kgg8308-github-io';
  var day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10).replace(/-/g, '');
  var seenKey = 'visited-' + day, seen = false;
  try { seen = localStorage.getItem(seenKey) === '1'; } catch (err) {}
  var mode = seen ? 'get' : 'hit';
  var fmt = function (n) { return Number(n || 0).toLocaleString('ko-KR'); };
  var load = function (key, id) {
    var el = document.getElementById(id);
    if (!el) return Promise.resolve();
    return fetch(API + '/' + mode + '/' + NS + '/' + key)
      .then(function (r) { return r.ok ? r.json() : { value: 0 }; })
      .then(function (d) { el.textContent = fmt(d.value); })
      .catch(function () {});
  };
  Promise.all([load('day-' + day, 'v-today'), load('total', 'v-total')]).then(function () {
    if (!seen) { try { localStorage.setItem(seenKey, '1'); } catch (err) {} }
  });
})();
