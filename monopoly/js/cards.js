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

  /* Power-up / event cards — original effects, inspired by the fast pace of Business Tour. */
  var EVENTS = [
    { id: 'ev1', text: 'Thưởng đầu tư: nhận 100đ từ ngân hàng.', effect: { kind: 'cash', amount: 100 } },
    { id: 'ev2', text: 'Tiến thêm 3 ô (nhận 200đ nếu qua KHỞI ĐẦU).', effect: { kind: 'move', steps: 3 } },
    { id: 'ev3', text: 'Được tặng 1 nhà miễn phí trên đất bạn sở hữu.', effect: { kind: 'freeHouse' } },
    { id: 'ev4', text: 'Mỗi đối thủ tặng bạn 20đ.', effect: { kind: 'collectEach', amount: 20 } },
    { id: 'ev5', text: 'Bạn tặng mỗi đối thủ 15đ.', effect: { kind: 'payEach', amount: 15 } },
    { id: 'ev6', text: 'Lùi lại 2 ô.', effect: { kind: 'move', steps: -2 } },
    { id: 'ev7', text: 'Trộm 30đ của đối thủ giàu nhất.', effect: { kind: 'steal', amount: 30 } },
    { id: 'ev8', text: 'Nhận thêm 1 lượt đi ngay.', effect: { kind: 'extraTurn' } }
  ];

  /* Business Tour: thẻ Thử Thách cho power-up, có lợi lẫn có hại. */
  var TOUR_CHANCE = [
    { id: 'tc1', text: 'Tăng tốc: bạn được đi thêm 1 lượt.', effect: { kind: 'extraTurn' } },
    { id: 'tc2', text: 'Động đất: phá công trình cấp cao nhất của một đối thủ.', effect: { kind: 'earthquake' } },
    { id: 'tc3', text: 'Thẻ thoát tù: giữ đến khi cần.', effect: { kind: 'freeJail' } },
    { id: 'tc4', text: 'Cổ tức: nhận 200đ từ ngân hàng.', effect: { kind: 'cash', amount: 200 } },
    { id: 'tc5', text: 'Tour thế giới miễn phí: chọn một đất trống hoặc đất của bạn.', effect: { kind: 'worldTour' } },
    { id: 'tc6', text: 'Trượt chân: vào Đảo Mất Tích 3 lượt.', effect: { kind: 'jail' } },
    { id: 'tc7', text: 'Phạt giao thông: trả 100đ.', effect: { kind: 'cash', amount: -100 } },
    { id: 'tc8', text: 'Trợ cấp: nhận 100đ từ ngân hàng.', effect: { kind: 'cash', amount: 100 } }
  ];

  var API = { CHANCE: CHANCE, CHEST: CHEST, EVENTS: EVENTS, TOUR_CHANCE: TOUR_CHANCE };
  root.LOTRMonopolyCards = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
