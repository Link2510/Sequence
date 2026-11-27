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

  /* ---------- Business Tour style board ----------
     32 ô = 4 khu vực × 8 ô. Địa danh là tỉnh/thành Việt Nam.
     Cơ chế (theo luật Business Tour trên Steam):
       - 6 triplet (cùng hoa văn A–F): chiếm đủ 3 ô → Triple Monopoly.
       - 4 resort: không bị chuộc lại; chiếm đủ 4 → Resort Monopoly.
       - Chiếm toàn bộ đất của 1 khu vực → Side Monopoly.
       - Lên nhà theo vòng: ghé lần đầu chọn nhà cấp 1 hoặc 2, đi một vòng mới lên cấp 3, thêm một vòng lên khách sạn.
       - Giá/tiền thuê tăng dần theo chiều kim đồng hồ.
       - Ô đặc biệt: Thử Thách (power-up), Đảo mất tích (tù 3 lượt),
         Vô địch thế giới, Tour thế giới, Thuế 10% tài sản,Start trả lương khi đi qua. */
  function tprop(id, name, price, pattern, region, rents, houseCost) {
    return { id: id, type: 'property', name: name, price: price, color: pattern,
      pattern: pattern, region: region, rents: rents, houseCost: houseCost };
  }
  function tspecial(id, name, type, region, price) {
    var o = { id: id, type: type, name: name, color: COLORS[type] || '#d8b46a', region: region };
    if (price) o.price = price;
    return o;
  }
  var TOUR_TILES = [
    /* Miền Bắc */
    tspecial(0, 'KHỞI ĐẦU', 'go', 0),
    tprop(1, 'Hà Nội', 100, 'A', 0, [10, 50, 120, 260, 260, 420], 60),
    tprop(2, 'Hải Phòng', 110, 'B', 0, [11, 55, 130, 280, 280, 450], 60),
    tprop(3, 'Quảng Ninh', 120, 'C', 0, [12, 60, 140, 300, 300, 480], 60),
    tspecial(4, 'Vịnh Hạ Long', 'resort', 0, 200),
    tprop(5, 'Thái Nguyên', 140, 'D', 0, [14, 70, 160, 340, 340, 520], 70),
    tprop(6, 'Lào Cai', 150, 'E', 0, [15, 75, 175, 360, 360, 550], 70),
    tspecial(7, 'Thử Thách', 'chance', 0),
    /* Miền Trung */
    tprop(8, 'Nghệ An', 170, 'F', 1, [17, 85, 195, 400, 400, 620], 80),
    tprop(9, 'Thanh Hóa', 180, 'A', 1, [18, 90, 210, 430, 430, 660], 80),
    tprop(10, 'Huế', 190, 'B', 1, [19, 95, 220, 450, 450, 690], 80),
    tspecial(11, 'Biển Đà Nẵng', 'resort', 1, 230),
    tprop(12, 'Đà Nẵng', 210, 'C', 1, [21, 105, 240, 490, 490, 750], 90),
    tprop(13, 'Hội An', 220, 'D', 1, [22, 110, 250, 510, 510, 780], 90),
    tspecial(14, 'Thử Thách', 'chance', 1),
    tspecial(15, 'Cơ quan thuế', 'tax', 1),
    /* Tây Nguyên */
    tprop(16, 'Gia Lai', 250, 'E', 2, [25, 125, 285, 570, 570, 870], 100),
    tprop(17, 'Kon Tum', 260, 'F', 2, [26, 130, 295, 590, 590, 900], 100),
    tspecial(18, 'Vô Địch Thế Giới', 'championship', 2),
    tspecial(19, 'Biển Phú Yên', 'resort', 2, 280),
    tprop(20, 'Đắk Lắk', 290, 'A', 2, [29, 145, 330, 670, 670, 1020], 110),
    tprop(21, 'Lâm Đồng', 300, 'B', 2, [30, 150, 340, 700, 700, 1060], 110),
    tprop(22, 'Đà Lạt', 310, 'C', 2, [31, 155, 350, 720, 720, 1100], 110),
    tspecial(23, 'Thử Thách', 'chance', 2),
    /* Miền Nam */
    tprop(24, 'Bình Thuận', 330, 'D', 3, [33, 165, 375, 770, 770, 1170], 120),
    tspecial(25, 'Tour Thế Giới', 'worldtour', 3),
    tspecial(26, 'Vũng Tàu', 'resort', 3, 350),
    tprop(27, 'TP. Hồ Chí Minh', 360, 'E', 3, [36, 180, 410, 840, 840, 1280], 130),
    tspecial(28, 'Thử Thách', 'chance', 3),
    tspecial(29, 'Bãi đỗ xe', 'parking', 3),
    tprop(30, 'Cần Thơ', 390, 'F', 3, [39, 195, 440, 910, 910, 1380], 140),
    tspecial(31, 'Đảo Mất Tích', 'jail', 3)
  ];

  function tourPositionOf(i) {
    if (i <= 8) return { row: 8, col: 8 - i };
    if (i <= 16) return { row: 8 - (i - 8), col: 0 };
    if (i <= 24) return { row: 0, col: i - 16 };
    return { row: i - 24, col: 8 };
  }
  function tiles(s) { return s && s.board ? s.board : TILES; }

  var API = {
    TILES: TILES, TOUR_TILES: TOUR_TILES, COLORS: COLORS, REGIONS: REGIONS,
    positionOf: positionOf, tourPositionOf: tourPositionOf, tiles: tiles,
    isBuyable: isBuyable, groupOf: groupOf
  };
  root.LOTRMonopolyBoard = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
