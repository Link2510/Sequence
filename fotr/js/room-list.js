/* room-list.js — hiển thị các phòng FOTR đang chờ, để bạn bè bấm vào là vào chơi.
   Chỉ đọc RTDB công khai của chính project; không gửi dữ liệu đi đâu khác. */
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

  function refresh() {
    var el = box();
    if (!el) return;
    fetch(URL).then(function (r) { return r.json(); }).then(function (data) {
      var now = Date.now();
      var rooms = Object.keys(data || {}).map(function (code) {
        return { code: code, meta: (data[code] && data[code].meta) || {} };
      }).filter(function (x) {
        var t = +x.meta.created || 0;
        return (now - t) < MAX_AGE && !x.meta.guestJoined;
      }).slice(0, 20);

      if (!rooms.length) {
        el.textContent = 'Chưa có phòng nào đang chờ. Bấm “Tạo phòng” để bắt đầu nhé.';
        return;
      }
      el.innerHTML = '<span style="opacity:.75">Phòng đang mở: </span>' + rooms.map(function (x) {
        return '<button type="button" class="pill" data-room="' + esc(x.code) + '" style="margin:3px 3px 0 0">' +
          esc(x.code) + ' · ' + (x.meta.playerCount || 2) + ' người</button>';
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
      el.textContent = 'Không tải được danh sách phòng (kiểm tra Firebase).';
    });
  }

  setInterval(refresh, 10000);
  document.addEventListener('DOMContentLoaded', function () { setTimeout(refresh, 400); });
  refresh();
})();
