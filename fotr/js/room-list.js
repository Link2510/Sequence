/* room-list.js — hiển thị các phòng Hội Nhẫn đang chờ, đọc từ RTDB công khai của project.
   Không gửi dữ liệu đi đâu khác. */
(function () {
  'use strict';
  var URL = 'https://sequence-23c7f-default-rtdb.asia-southeast1.firebasedatabase.app/lotr-fotr-rooms.json';
  var MAX_AGE = 30 * 60 * 1000;

  function box() { return document.getElementById('openRooms'); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function txt(s) { if (box()) box().textContent = s; }
  function refresh() {
    var el = box();
    if (!el) return;
    fetch(URL).then(function (r) { return r.json(); }).then(function (data) {
      var now = Date.now();
      var rooms = Object.keys(data || {}).filter(function (c) { return c.charAt(0) !== 'D'; }).map(function (code) {
        return { code: code, meta: (data[code] && data[code].meta) || {} };
      }).filter(function (x) {
        var t = +x.meta.created || 0;
        return (now - t) < MAX_AGE && !x.meta.guestJoined;
      }).slice(0, 20);
      if (!rooms.length) {
        txt(S.lang === 'en' ? 'No open rooms. Create one to start.' : 'Chưa có phòng nào đang chờ. Bấm “Tạo phòng” để bắt đầu.');
        return;
      }
      el.innerHTML = '<span style="opacity:.75">' + (S.lang === 'en' ? 'Open rooms: ' : 'Phòng đang mở: ') + '</span>' +
        rooms.map(function (x) {
          return '<button type="button" class="pill" data-room="' + esc(x.code) + '" style="margin:3px 3px 0 0">' +
            esc(x.code) + ' · ' + (x.meta.playerCount || 4) + (S.lang === 'en' ? ' hands' : ' tay bài') + '</button>';
        }).join('');
      Array.prototype.forEach.call(el.querySelectorAll('[data-room]'), function (b) {
        b.addEventListener('click', function () {
          var input = document.getElementById('roomCodeInput');
          var join = document.getElementById('joinBtn');
          if (input) input.value = b.getAttribute('data-room');
          if (join) join.click();
        });
      });
    }).catch(function () {
      txt(S.lang === 'en' ? 'Cannot load room list (check Firebase).' : 'Không tải được danh sách phòng (kiểm tra Firebase).');
    });
  }
  var S = { lang: (window.LOTRI18n && localStorage.getItem('lotr-fotr-trick-taking-v1')) ? 'vi' : 'vi' };
  try {
    var p = JSON.parse(localStorage.getItem('lotr-fotr-trick-taking-v1') || '{}');
    if (p.lang === 'en') S.lang = 'en';
  } catch (e) {}
  setInterval(refresh, 10000);
  document.addEventListener('DOMContentLoaded', function () { setTimeout(refresh, 400); });
  refresh();
})();
