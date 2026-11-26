/* room-list.js — phòng Monopoly (mã bắt đầu bằng M), dùng chung RTDB project. */
(function () {
  'use strict';
  var URL = 'https://sequence-23c7f-default-rtdb.asia-southeast1.firebasedatabase.app/lotr-fotr-rooms.json';
  var MAX_AGE = 30 * 60 * 1000;
  function box() { return document.getElementById('openRooms'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function refresh() {
    var el = box(); if (!el) return;
    fetch(URL).then(function (r) { return r.json(); }).then(function (data) {
      var now = Date.now();
      var rooms = Object.keys(data || {}).filter(function (c) { return c.charAt(0) === 'M'; }).map(function (code) {
        return { code: code, meta: (data[code] && data[code].meta) || {} };
      }).filter(function (x) { return (now - (+x.meta.created || 0)) < MAX_AGE && !x.meta.guestJoined; }).slice(0, 20);
      if (!rooms.length) { el.textContent = 'Chưa có phòng nào đang chờ. Bấm “Tạo phòng” để bắt đầu.'; return; }
      el.innerHTML = '<span style="opacity:.75">Phòng đang mở: </span>' + rooms.map(function (x) {
        return '<button type="button" class="pill" data-room="' + esc(x.code) + '" style="margin:3px">' + esc(x.code) +
          ' · ' + (x.meta.playerCount || 4) + ' người</button>';
      }).join('');
      Array.prototype.forEach.call(el.querySelectorAll('[data-room]'), function (b) {
        b.addEventListener('click', function () {
          var i = document.getElementById('roomCodeInput'), j = document.getElementById('joinBtn');
          if (i) i.value = b.dataset.room; if (j) j.click();
        });
      });
    }).catch(function () { el.textContent = 'Không tải được danh sách phòng (kiểm tra Firebase).'; });
  }
  setInterval(refresh, 10000);
  document.addEventListener('DOMContentLoaded', function () { setTimeout(refresh, 400); });
  refresh();
})();
