/* board.js — 40 classic-style tiles, Vietnamese names, original data. */
(function (root) {
  'use strict';

  var COLORS = {
    brown: '#8b5a3c', lightblue: '#8ecae6', pink: '#d96ba0', orange: '#e89b4a',
    red: '#d94f4f', yellow: '#e8c84a', green: '#5aa86b', darkblue: '#4a6fc4',
    railroad: '#4b4b52', utility: '#9aa8b5', tax: '#c96a5a', chance: '#d8b46a',
    chest: '#7ba870', jail: '#c96a5a', gotojail: '#c96a5a', corner: '#7ba870',
    /* Business Tour: 4 khu vực + 6 nhóm triplet */
    A: '#5b8ff9', B: '#e8684a', C: '#f6bd16', D: '#5ad8a6', E: '#945fb9', F: '#ff9845',
    resort: '#38bec9', championship: '#ff9d4d', worldtour: '#727cf5'
  };
  var REGIONS = ['Miền Bắc', 'Miền Trung', 'Tây Nguyên', 'Miền Nam'];

  function prop(id, name, price, color, rents, houseCost) {
    return { id: id, type: 'property', name: name, price: price, color: color, rents: rents, houseCost: houseCost };
  }
  function rail(id, name) { return { id: id, type: 'railroad', name: name, price: 200, color: 'railroad' }; }
  function util(id, name) { return { id: id, type: 'utility', name: name, price: 150, color: 'utility' }; }
  function special(id, name, type) { return { id: id, type: type, name: name, color: type === 'chance' ? 'chance' : type === 'chest' ? 'chest' : type === 'tax' ? 'tax' : type }; }
  function corner(id, name, type) { return { id: id, type: type, name: name, color: type === 'jail' || type === 'gotojail' ? 'jail' : 'corner' }; }

  var TILES = [
    corner(0, 'KHỞI ĐẦU · Nhận 200đ', 'go'),
    prop(1, 'Đường Trần Hưng Đạo', 60, 'brown', [2, 10, 30, 90, 160, 250], 50),
    special(2, 'Khối Cộng Đồng', 'chest'),
    prop(3, 'Đường Lê Lợi', 60, 'brown', [4, 20, 60, 180, 300, 450], 50),
    special(4, 'Thuế Thu Nhập · 200đ', 'tax'),
    rail(5, 'Ga Hà Nội'),
    prop(6, 'Đường Nguyễn Huệ', 100, 'lightblue', [6, 30, 90, 270, 400, 550], 50),
    special(7, 'Thử Thách', 'chance'),
    prop(8, 'Đường Đồng Khởi', 100, 'lightblue', [6, 30, 90, 270, 400, 550], 50),
    prop(9, 'Đường Lê Duẩn', 120, 'lightblue', [8, 40, 100, 300, 450, 600], 50),
    corner(10, 'TÙ · Chỉ thăm viếng', 'jail'),
    prop(11, 'Đường Hai Bà Trưng', 140, 'pink', [10, 50, 150, 450, 620, 750], 100),
    util(12, 'Công Ty Điện'),
    prop(13, 'Đường Bà Triệu', 140, 'pink', [10, 50, 150, 450, 620, 750], 100),
    prop(14, 'Đường Trần Quốc Toản', 160, 'pink', [12, 60, 180, 500, 700, 900], 100),
    rail(15, 'Ga Sài Gòn'),
    prop(16, 'Đường Nam Kỳ Khởi Nghĩa', 180, 'orange', [14, 70, 200, 550, 750, 950], 100),
    special(17, 'Khối Cộng Đồng', 'chest'),
    prop(18, 'Đường Pasteur', 180, 'orange', [14, 70, 200, 550, 750, 950], 100),
    prop(19, 'Đường Thống Nhất', 200, 'orange', [16, 80, 220, 600, 800, 1000], 100),
    corner(20, 'BÃI ĐỖ XE MIỄN PHÍ', 'parking'),
    prop(21, 'Đường Phạm Ngũ Lão', 220, 'red', [18, 90, 250, 700, 875, 1050], 150),
    special(22, 'Thử Thách', 'chance'),
    prop(23, 'Đường Đề Thám', 220, 'red', [18, 90, 250, 700, 875, 1050], 150),
    prop(24, 'Đường Hàm Nghi', 240, 'red', [20, 100, 300, 750, 925, 1100], 150),
    rail(25, 'Ga Đà Nẵng'),
    prop(26, 'Đường Trần Nhân Tông', 260, 'yellow', [22, 110, 330, 800, 975, 1150], 150),
    prop(27, 'Đường Lý Thường Kiệt', 260, 'yellow', [22, 110, 330, 800, 975, 1150], 150),
    util(28, 'Công Ty Nước'),
    prop(29, 'Đường Nguyễn Du', 280, 'yellow', [24, 120, 360, 850, 1025, 1200], 150),
    corner(30, 'VÀO TÙ · Đi thẳng', 'gotojail'),
    prop(31, 'Đường Võ Văn Tần', 300, 'green', [26, 130, 390, 900, 1100, 1275], 200),
    prop(32, 'Đường Trần Quý Cáp', 300, 'green', [26, 130, 390, 900, 1100, 1275], 200),
    special(33, 'Khối Cộng Đồng', 'chest'),
    prop(34, 'Đường Phan Đình Phùng', 320, 'green', [28, 150, 450, 1000, 1200, 1400], 200),
    rail(35, 'Ga Cần Thơ'),
    special(36, 'Thử Thách', 'chance'),
    prop(37, 'Đường Hoàng Diệu', 350, 'darkblue', [35, 175, 500, 1100, 1300, 1500], 200),
    special(38, 'Thuế Xa Xỉ · 100đ', 'tax'),
    prop(39, 'Đại Lộ Hòa Bình', 400, 'darkblue', [50, 200, 600, 1400, 1700, 2000], 200)
  ];

  function positionOf(i) {
    if (i <= 10) return { row: 10, col: 10 - i };
    if (i <= 20) return { row: 10 - (i - 10), col: 0 };
    if (i <= 30) return { row: 0, col: i - 20 };
    return { row: i - 30, col: 10 };
  }
  function isBuyable(t) { return t.type === 'property' || t.type === 'railroad' || t.type === 'utility' || t.type === 'resort'; }
  function groupOf(t, board) {
    if (!isBuyable(t)) return null;
    if (t.type === 'property') return t.pattern || t.color;
    return t.type;
  }

  /* ---------- Business Tour — 40 ô, giữ nguyên khung bàn Monopoly gốc ----------
     Theo luật Business Tour trên Steam: 4 ga → 4 resort, Tù → Đảo Mất Tích,
     Bãi đỗ xe → Vô Địch Thế Giới, Vào tù → Tour Thế Giới, Community Chest → Thử Thách,
     thuế 10% tài sản. 8 nhóm màu (2 hoặc 3 đất) giữ nguyên vị trí. */
  function tourRegion(id) { return id <= 10 ? 0 : id <= 20 ? 1 : id <= 30 ? 2 : 3; }
  function tprop(id, name, price, color, rents, houseCost) {
    return { id: id, type: 'property', name: name, price: price, color: color,
      pattern: color, region: tourRegion(id), rents: rents, houseCost: houseCost };
  }
  function tspecial(id, name, type, price) {
    var o = { id: id, type: type, name: name, color: COLORS[type] || '#d8b46a', region: tourRegion(id) };
    if (price) o.price = price;
    return o;
  }
  var TOUR_TILES = [
    tspecial(0, 'KHỞI ĐẦU', 'go'),
    tprop(1, 'Đường Trần Hưng Đạo', 60, 'brown', [2, 10, 30, 90, 160, 250], 50),
    tspecial(2, 'Thử Thách', 'chance'),
    tprop(3, 'Đường Lê Lợi', 60, 'brown', [4, 20, 60, 180, 300, 450], 50),
    tspecial(4, 'Cơ quan thuế · 10%', 'tax'),
    tspecial(5, 'Vịnh Hạ Long · Resort', 'resort', 200),
    tprop(6, 'Đường Nguyễn Huệ', 100, 'lightblue', [6, 30, 90, 270, 400, 550], 50),
    tspecial(7, 'Thử Thách', 'chance'),
    tprop(8, 'Đường Đồng Khởi', 100, 'lightblue', [6, 30, 90, 270, 400, 550], 50),
    tprop(9, 'Đường Lê Duẩn', 120, 'lightblue', [8, 40, 100, 300, 450, 600], 50),
    tspecial(10, 'Đảo Mất Tích', 'jail'),
    tprop(11, 'Đường Hai Bà Trưng', 140, 'pink', [10, 50, 150, 450, 620, 750], 100),
    tspecial(12, 'Công Ty Điện', 'utility', 150),
    tprop(13, 'Đường Bà Triệu', 140, 'pink', [10, 50, 150, 450, 620, 750], 100),
    tprop(14, 'Đường Trần Quốc Toản', 160, 'pink', [12, 60, 180, 500, 700, 900], 100),
    tspecial(15, 'Biển Đà Nẵng · Resort', 'resort', 200),
    tprop(16, 'Đường Nam Kỳ Khởi Nghĩa', 180, 'orange', [14, 70, 200, 550, 750, 950], 100),
    tspecial(17, 'Thử Thách', 'chance'),
    tprop(18, 'Đường Pasteur', 180, 'orange', [14, 70, 200, 550, 750, 950], 100),
    tprop(19, 'Đường Thống Nhất', 200, 'orange', [16, 80, 220, 600, 800, 1000], 100),
    tspecial(20, 'Vô Địch Thế Giới', 'championship'),
    tprop(21, 'Đường Phạm Ngũ Lão', 220, 'red', [18, 90, 250, 700, 875, 1050], 150),
    tspecial(22, 'Thử Thách', 'chance'),
    tprop(23, 'Đường Đề Thám', 220, 'red', [18, 90, 250, 700, 875, 1050], 150),
    tprop(24, 'Đường Hàm Nghi', 240, 'red', [20, 100, 300, 750, 925, 1100], 150),
    tspecial(25, 'Biển Phú Yên · Resort', 'resort', 200),
    tprop(26, 'Đường Trần Nhân Tông', 260, 'yellow', [22, 110, 330, 800, 975, 1150], 150),
    tprop(27, 'Đường Lý Thường Kiệt', 260, 'yellow', [22, 110, 330, 800, 975, 1150], 150),
    tspecial(28, 'Công Ty Nước', 'utility', 150),
    tprop(29, 'Đường Nguyễn Du', 280, 'yellow', [24, 120, 360, 850, 1025, 1200], 150),
    tspecial(30, 'Tour Thế Giới', 'worldtour'),
    tprop(31, 'Đường Võ Văn Tần', 300, 'green', [26, 130, 390, 900, 1100, 1275], 200),
    tprop(32, 'Đường Trần Quý Cáp', 300, 'green', [26, 130, 390, 900, 1100, 1275], 200),
    tspecial(33, 'Thử Thách', 'chance'),
    tprop(34, 'Đường Phan Đình Phùng', 320, 'green', [28, 150, 450, 1000, 1200, 1400], 200),
    tspecial(35, 'Vũng Tàu · Resort', 'resort', 200),
    tspecial(36, 'Thử Thách', 'chance'),
    tprop(37, 'Đường Hoàng Diệu', 350, 'darkblue', [35, 175, 500, 1100, 1300, 1500], 200),
    tspecial(38, 'Cơ quan thuế · 10%', 'tax'),
    tprop(39, 'Đại Lộ Hòa Bình', 400, 'darkblue', [50, 200, 600, 1400, 1700, 2000], 200)
  ];

  /* Bàn 40 ô dùng lại đúng vị trí của bàn cổ điển. */
  function tourPositionOf(i) { return positionOf(i); }
  function tiles(s) { return s && s.board ? s.board : TILES; }

  var API = {
    TILES: TILES, TOUR_TILES: TOUR_TILES, COLORS: COLORS, REGIONS: REGIONS,
    positionOf: positionOf, tourPositionOf: tourPositionOf, tiles: tiles,
    isBuyable: isBuyable, groupOf: groupOf
  };
  root.LOTRMonopolyBoard = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
