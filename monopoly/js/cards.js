/* cards.js — Chance / Community Chest decks. Vietnamese text, classic-style effects. */
(function (root) {
  'use strict';

  var CHANCE = [
    { id: 'ch1', text: 'Tiến về KHỞI ĐẦU. Nhận 200đ.', effect: { kind: 'goto', tile: 0, collect: 200 } },
    { id: 'ch2', text: 'Tiến đến GA CẦN THƠ. Nếu có chủ, trả tiền thuê gấp đôi.', effect: { kind: 'nearest', type: 'railroad', double: true } },
    { id: 'ch3', text: 'Tiến đến WORKS (tiện ích). Trả tiền thuê theo xúc xắc.', effect: { kind: 'nearest', type: 'utility' } },
    { id: 'ch4', text: 'Ngân hàng trả cổ tức: nhận 50đ.', effect: { kind: 'cash', amount: 50 } },
    { id: 'ch5', text: 'Trả thuế người nghèo: 15đ.', effect: { kind: 'cash', amount: -15 } },
    { id: 'ch6', text: 'Lùi lại 3 ô. Áp dụng quy tắc ô mới.', effect: { kind: 'back', steps: 3 } },
    { id: 'ch7', text: 'Vào TÙ. Đi thẳng, không nhận 200đ.', effect: { kind: 'jail' } },
    { id: 'ch8', text: 'Sửa chữa tài sản: mỗi nhà 25đ, mỗi khách sạn 100đ.', effect: { kind: 'repair', house: 25, hotel: 100 } },
    { id: 'ch9', text: 'Bạn được miễn phí ra tù (giữ thẻ đến khi dùng).', effect: { kind: 'freeJail' } },
    { id: 'ch10', text: 'Tiến đến Đường Lê Lợi. Nếu có chủ, trả tiền thuê.', effect: { kind: 'goto', tile: 3 } },
    { id: 'ch11', text: 'Tiến đến Đường Hàm Nghi. Nếu có chủ, trả tiền thuê.', effect: { kind: 'goto', tile: 24 } },
    { id: 'ch12', text: 'Trả phí bảo hiểm: 50đ.', effect: { kind: 'cash', amount: -50 } },
    { id: 'ch13', text: 'Nhận tiền bán cổ phiếu: 50đ.', effect: { kind: 'cash', amount: 50 } },
    { id: 'ch14', text: 'Hãy đi thẳng đến BÃI ĐỖ XE MIỄN PHÍ.', effect: { kind: 'goto', tile: 20 } },
    { id: 'ch15', text: 'Ngân hàng thanh toán cổ tức: nhận 25đ.', effect: { kind: 'cash', amount: 25 } },
    { id: 'ch16', text: 'Trả tiền thuê nhà bị chậm: 20đ.', effect: { kind: 'cash', amount: -20 } }
  ];

  var CHEST = [
    { id: 'cc1', text: 'Tiến về KHỞI ĐẦU. Nhận 200đ.', effect: { kind: 'goto', tile: 0, collect: 200 } },
    { id: 'cc2', text: 'Ngân hàng báo lỗi: nhận 200đ.', effect: { kind: 'cash', amount: 200 } },
    { id: 'cc3', text: 'Phí khám bệnh: trả 50đ.', effect: { kind: 'cash', amount: -50 } },
    { id: 'cc4', text: 'Bán cổ phiếu: nhận 50đ.', effect: { kind: 'cash', amount: 50 } },
    { id: 'cc5', text: 'Bạn được miễn phí ra tù.', effect: { kind: 'freeJail' } },
    { id: 'cc6', text: 'Vào TÙ. Đi thẳng, không nhận 200đ.', effect: { kind: 'jail' } },
    { id: 'cc7', text: 'Sinh nhật: mỗi người chơi tặng bạn 10đ.', effect: { kind: 'collectEach', amount: 10 } },
    { id: 'cc8', text: 'Nhận tiền bảo hiểm: 100đ.', effect: { kind: 'cash', amount: 100 } },
    { id: 'cc9', text: 'Viện phí: trả 100đ.', effect: { kind: 'cash', amount: -100 } },
    { id: 'cc10', text: 'Hoàn thuế: nhận 20đ.', effect: { kind: 'cash', amount: 20 } },
    { id: 'cc11', text: 'Tặng cho trợ lý: mỗi người chơi nhận 10đ.', effect: { kind: 'payEach', amount: 10 } },
    { id: 'cc12', text: 'Thuế tài sản: trả theo số nhà/cách sạn.', effect: { kind: 'repair', house: 40, hotel: 115 } },
    { id: 'cc13', text: 'Thưởng sáng tạo: nhận 25đ.', effect: { kind: 'cash', amount: 25 } },
    { id: 'cc14', text: 'Phạt giao thông: trả 15đ.', effect: { kind: 'cash', amount: -15 } },
    { id: 'cc15', text: 'Nhận lương hưu: 30đ.', effect: { kind: 'cash', amount: 30 } },
    { id: 'cc16', text: 'Chi phí đào tạo: trả 20đ.', effect: { kind: 'cash', amount: -20 } }
  ];

  var API = { CHANCE: CHANCE, CHEST: CHEST };
  root.LOTRMonopolyCards = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
