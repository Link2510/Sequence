/* characters.js — character goals and setup actions.
   exact:true = printed goal verified from the rulebook / publisher material.
   exact:false = simplified rendering of a printed goal we could not verify in full. */
(function (root) {
  'use strict';

  var C = {
    frodo: {
      name: { vi: 'Frodo', en: 'Frodo' }, title: { vi: 'Người mang Nhẫn', en: 'Ring-bearer' },
      goal: { vi: 'Thắng ít nhất 2 lá chất Nhẫn (4 người) hoặc 4 lá (3 người).', en: 'Win 2+ Rings cards (4 players) or 4+ (3 players).' },
      setup: { vi: 'Người cầm lá 1 Nhẫn bắt buộc là Frodo và đi lượt đầu. Không được đổi lá 1 Nhẫn.', en: 'Holder of the 1 of Rings must be Frodo and leads the first trick. Cannot exchange the One Ring.' },
      exact: true
    },
    bilbo: {
      name: { vi: 'Bilbo', en: 'Bilbo' }, title: { vi: 'Kẻ kỳ quặc', en: 'Peculiar' },
      goal: { vi: 'Thắng ít nhất 3 lượt.', en: 'Win 3 or more tricks.' },
      setup: { vi: 'Không có hành động thiết lập.', en: 'No setup action.' }, exact: true
    },
    bilbo_stretched: {
      name: { vi: 'Bilbo', en: 'Bilbo' }, title: { vi: 'Kẻ căng thẳng', en: 'Stretched' },
      goal: { vi: 'Thắng ít nhất 3 lượt.', en: 'Win 3 or more tricks.' },
      setup: { vi: 'Không có hành động thiết lập.', en: 'No setup action.' }, exact: false
    },
    gandalf: {
      name: { vi: 'Gandalf', en: 'Gandalf' }, title: { vi: 'Pháp sư Xám', en: 'Grey Wizard' },
      goal: { vi: 'Thắng ít nhất 1 lượt.', en: 'Win 1 or more tricks.' },
      setup: { vi: 'Lấy lá bài bị rơi (lost card) vào tay, rồi đổi 1 lá với Frodo.', en: 'Add the lost card to your hand, then exchange 1 card with Frodo.' },
      exact: true
    },
    gandalf_flame: {
      name: { vi: 'Gandalf', en: 'Gandalf' }, title: { vi: 'Đầy tớ của Lửa Bí mật', en: 'Servant of the Secret Fire' },
      goal: { vi: 'Thắng ít nhất 1 lượt.', en: 'Win 1 or more tricks.' },
      setup: { vi: 'Không có hành động thiết lập.', en: 'No setup action.' }, exact: false
    },
    pippin: {
      name: { vi: 'Pippin', en: 'Pippin' }, title: { vi: 'Kẻ ngốc', en: 'Fool' },
      goal: { vi: 'Thắng ít lượt nhất (hoặc đồng hạng thấp nhất). Thắng 0 lượt luôn hoàn thành.', en: 'Win the fewest tricks (or tie). Winning 0 tricks always completes it.' },
      setup: { vi: 'Đổi 1 lá với Frodo, Sam hoặc Merry.', en: 'Exchange 1 card with Frodo, Sam or Merry.' }, exact: true
    },
    pippin_burdened: {
      name: { vi: 'Pippin', en: 'Pippin' }, title: { vi: 'Phiêu lưu / Gánh nặng', en: 'Adventurous / Burdened' },
      goal: { vi: 'Ít lượt nhất (hoặc đồng hạng) và không thắng lá 1 Nhẫn.', en: 'Fewest tricks (or tie) and do not win the One Ring.' },
      setup: { vi: 'Đổi 1 lá với đồng minh.', en: 'Exchange 1 card with an ally.' }, exact: false
    },
    sam: {
      name: { vi: 'Sam', en: 'Sam' }, title: { vi: 'Người làm vườn', en: 'Gardener' },
      goal: { vi: 'Thắng đúng lá Đồi có số bằng lá Threat đã rút.', en: 'Win the Hills card matching your drawn Threat number.' },
      setup: { vi: 'Rút 1 lá Threat, rổi đổi 1 lá với Frodo, Merry hoặc Pippin.', en: 'Draw a Threat card, then exchange 1 card with Frodo, Merry or Pippin.' },
      exact: true
    },
    sam_burdened: {
      name: { vi: 'Sam', en: 'Sam' }, title: { vi: 'Trung thành / Gánh nặng', en: 'Loyal / Burdened' },
      goal: { vi: 'Thắng lá Đồi theo số Threat và không thắng lá 1 Nhẫn.', en: 'Win the matching Hills card and do not win the One Ring.' },
      setup: { vi: 'Rút Threat rồi đổi bài.', en: 'Draw a Threat, then exchange.' }, exact: false
    },
    merry: {
      name: { vi: 'Merry', en: 'Merry' }, title: { vi: 'Trái tim gan dạ', en: 'Stout Heart' },
      goal: { vi: 'Thắng ĐÚNG 1 hoặc ĐÚNG 2 lượt — nhiều hơn hay ít hơn đều thất bại.', en: 'Win EXACTLY 1 or EXACTLY 2 tricks — no more, no less.' },
      setup: { vi: 'Rút 1 lá Threat, rồi đổi 1 lá với Frodo, Sam hoặc Pippin.', en: 'Draw a Threat card, then exchange 1 card with Frodo, Sam or Pippin.' }, exact: true
    },
    merry_burdened: {
      name: { vi: 'Merry', en: 'Merry' }, title: { vi: 'Gánh nặng', en: 'Burdened' },
      goal: { vi: 'Thắng đúng 1–2 lượt và không thắng lá 1 Nhẫn.', en: 'Win exactly 1–2 tricks and do not win the One Ring.' },
      setup: { vi: 'Rút Threat rồi đổi bài.', en: 'Draw a Threat, then exchange.' }, exact: false
    },
    fatty: {
      name: { vi: 'Fatty', en: 'Fatty' }, title: { vi: 'Kẻ thận trọng', en: 'Cautious' },
      goal: { vi: 'Thắng ĐÚNG 1 lượt.', en: 'Win EXACTLY 1 trick.' },
      setup: { vi: 'Cho mỗi nhân vật khác 1 lá, không nhận lại gì — nên Fatty chơi ít lượt hơn.', en: 'Give 1 card to each other character and receive nothing back — Fatty plays fewer tricks.' },
      exact: true
    },
    gildor: {
      name: { vi: 'Gildor', en: 'Gildor' }, title: { vi: 'Elf cao quý', en: 'High Elf' },
      goal: { vi: 'Đi 1 lá Rừng trong lượt CUỐI (không cần thắng lượt đó).', en: 'Play a Forest card in the FINAL trick (need not win it).' },
      setup: { vi: 'Không có hành động thiết lập.', en: 'No setup action.' }, exact: true
    },
    farmer_maggot: {
      name: { vi: 'Farmer Maggot', en: 'Farmer Maggot' }, title: { vi: 'Người dũng cảm', en: 'Brave' },
      goal: { vi: 'Thắng lá bài có số bằng lá Threat đã rút.', en: 'Win a card whose rank matches your Threat card.' },
      setup: { vi: 'Rút 1 lá Threat.', en: 'Draw a Threat card.' }, exact: false
    },
    tom: {
      name: { vi: 'Tom Bombadil', en: 'Tom Bombadil' }, title: { vi: 'Chủ nhân', en: 'The Master' },
      goal: { vi: 'Thắng lượt CUỐI.', en: 'Win the final trick.' },
      setup: { vi: 'Tương tác với lá bài bị rơi theo event của chương.', en: 'Interacts with the lost card per the chapter event.' }, exact: false
    },
    goldberry: {
      name: { vi: 'Goldberry', en: 'Goldberry' }, title: { vi: 'Con gái sông', en: "River's Daughter" },
      goal: { vi: 'Thắng ĐÚNG 3 lượt LIỀN nhau và không có lượt nào khác.', en: 'Win EXACTLY 3 CONSECUTIVE tricks and no others.' },
      setup: { vi: 'Nhận thêm 4 lá (tổng 8), bài úp ngửa và mọi người được xem.', en: 'Gets 4 extra cards (8 total); hand stays faceup and can be discussed.' },
      exact: true
    },
    underhill: {
      name: { vi: 'Mr. Underhill', en: 'Mr. Underhill' }, title: { vi: 'Ẩn danh', en: 'Hidden' },
      goal: { vi: 'Không thắng lượt nào.', en: 'Win no tricks.' },
      setup: { vi: 'Bất kỳ ai cũng có thể chọn, kể cả người không cầm 1 Nhẫn.', en: 'Anyone may choose it, even the player without the One Ring.' }, exact: false
    },
    barliman: {
      name: { vi: 'Barliman', en: 'Barliman' }, title: { vi: 'Kẻ đãng trí', en: 'Forgetful' },
      goal: { vi: 'Thắng ít nhất 1 trong 3 lượt CUỐI.', en: 'Win at least 1 of the last 3 tricks.' },
      setup: { vi: 'Không có hành động thiết lập.', en: 'No setup action.' }, exact: false
    },
    strider: {
      name: { vi: 'Strider', en: 'Strider' }, title: { vi: 'Kiếm rừng', en: 'Ranger' },
      goal: { vi: 'Số lượt thắng KHÔNG BAO GIỜ bằng đúng số Threat.', en: 'Never win exactly the number shown on your Threat card.' },
      setup: { vi: 'Rút 1 lá Threat và có thể nhìn trước khi chơi.', en: 'Draw a Threat card and may look at it during the round.' }, exact: false
    },
    glorfindel: {
      name: { vi: 'Glorfindel', en: 'Glorfindel' }, title: { vi: 'Lãnh chúa Elf', en: 'Elf-lord' },
      goal: { vi: 'Thắng ít nhất 1 lượt có lá Rừng.', en: 'Win at least 1 trick containing a Forest card.' },
      setup: { vi: 'Dẫn lượt đầu nếu chơi cùng Frodo.', en: 'Leads the first trick if playing alongside Frodo.' }, exact: false
    },
    bill: {
      name: { vi: 'Bill the Pony', en: 'Bill the Pony' }, title: { vi: 'Khỏe khoắn', en: 'Sturdy' },
      goal: { vi: 'Thắng ít nhất 1 lượt.', en: 'Win at least 1 trick.' },
      setup: { vi: 'Chuyển 1 lá cho Frodo và 1 lá cho Sam cùng lúc.', en: 'Pass 1 card each to Frodo and Sam at the same time.' }, exact: false
    },
    elrond: {
      name: { vi: 'Elrond', en: 'Elrond' }, title: { vi: 'Bán Elf', en: 'Half-elven' },
      goal: { vi: 'Thắng ít nhất 1 lá Nhẫn — mục tiêu này CỘNG THÊM vào mục tiêu chung.', en: 'Win 1+ Rings card — this goal is in ADDITION to the others.' },
      setup: { vi: 'Chọn 1 trong 5 lá úp ngửa để đưa cho một người chơi.', en: 'Choose 1 of 5 faceup cards to give to a player.' }, exact: false
    },
    arwen: {
      name: { vi: 'Arwen', en: 'Arwen' }, title: { vi: 'Ngôi sao buổi tối', en: 'The Evenstar' },
      goal: { vi: 'Thắng nhiều lá Rừng nhất, không được đồng hạng.', en: 'Win the most Forest cards, with no tie.' },
      setup: { vi: 'Không có hành động thiết lập.', en: 'No setup action.' }, exact: false
    },
    gloin: {
      name: { vi: 'Glóin', en: 'Glóin' }, title: { vi: 'Bạn của Bilbo', en: "Bilbo's Companion" },
      goal: { vi: 'Thắng nhiều lá Đồi nhất, không được đồng hạng.', en: 'Win the most Hills cards, with no tie.' },
      setup: { vi: 'Không có hành động thiết lập.', en: 'No setup action.' }, exact: false
    },
    aragorn: {
      name: { vi: 'Aragorn', en: 'Aragorn' }, title: { vi: 'Người thừa kế Isildur', en: 'Heir of Isildur' },
      goal: { vi: 'Thắng đúng số lượt nằm trong khoảng đã chọn (1–2 / 3–4 / 5–6).', en: 'Win exactly the number of tricks in your chosen range (1–2 / 3–4 / 5–6).' },
      setup: { vi: 'Dùng quà The Sword That Was Broken thay lá Threat.', en: 'Uses The Sword That Was Broken gift instead of a Threat card.' }, exact: false
    },
    aragorn_burdened: {
      name: { vi: 'Aragorn', en: 'Aragorn' }, title: { vi: 'Elessar / Gánh nặng', en: 'Elessar / Burdened' },
      goal: { vi: 'Thắng đúng số lượt theo khoảng và không thắng lá 1 Nhẫn.', en: 'Win the ranged trick count and do not win the One Ring.' },
      setup: { vi: 'Dùng Narsil thay Threat.', en: 'Uses Narsil instead of a Threat.' }, exact: false
    },
    boromir: {
      name: { vi: 'Boromir', en: 'Boromir' }, title: { vi: 'Đội trưởng Gondor', en: 'Captain of Gondor' },
      goal: { vi: 'Thắng lượt CUỐI và không được thắng lá 1 Nhẫn.', en: 'Win the FINAL trick and never win the One Ring.' },
      setup: { vi: 'Dùng quà Sừng Gondor (bắt buộc).', en: 'Must use the Horn of Gondor gift.' }, exact: false
    },
    boromir_burdened: {
      name: { vi: 'Boromir', en: 'Boromir' }, title: { vi: 'Định mệnh / Gánh nặng', en: 'Doomed / Burdened' },
      goal: { vi: 'Thắng lượt cuối và không thắng lá 1 Nhẫn.', en: 'Win the final trick and do not win the One Ring.' },
      setup: { vi: 'Dùng Sừng Gondor.', en: 'Uses the Horn.' }, exact: false
    },
    gwaihir: {
      name: { vi: 'Gwaihir', en: 'Gwaihir' }, title: { vi: 'Chúa tể gió', en: 'Lord of the Wind' },
      goal: { vi: 'Thắng 1 lượt có từ 2 lá Bóng Tối trở lên.', en: 'Win a trick containing 2+ Shadow cards.' },
      setup: { vi: 'Không có hành động thiết lập.', en: 'No setup action.' }, exact: false
    },
    shadowfax: {
      name: { vi: 'Shadowfax', en: 'Shadowfax' }, title: { vi: 'Chúa tể ngựa', en: 'Lord of Horses' },
      goal: { vi: 'Thắng 1 lượt có từ 2 lá Đồi trở lên.', en: 'Win a trick containing 2+ Hills cards.' },
      setup: { vi: 'Giấu 1 lá, được xem bất cứ lúc nào.', en: 'Tucks 1 card away and may look at it any time.' }, exact: false
    },
    radagast: {
      name: { vi: 'Radagast', en: 'Radagast' }, title: { vi: 'Pháp sư Nâu', en: 'Brown Wizard' },
      goal: { vi: 'Thắng 1 lượt có từ 2 lá Rừng trở lên.', en: 'Win a trick containing 2+ Forest cards.' },
      setup: { vi: 'Chọn các lá bài trong thiết lập.', en: 'Chooses cards during setup.' }, exact: false
    },
    legolas: {
      name: { vi: 'Legolas', en: 'Legolas' }, title: { vi: 'Elf rừng Mirkwood', en: 'Mirkwood Elf' },
      goal: { vi: 'Thắng nhiều lá Rừng nhất (đồng hạng được).', en: 'Win the most Forest cards (ties allowed).' },
      setup: { vi: 'Không có hành động thiết lập.', en: 'No setup action.' }, exact: false
    },
    legolas_burdened: {
      name: { vi: 'Legolas', en: 'Legolas' }, title: { vi: 'Con trai Thranduil / Gánh nặng', en: 'Son of Thranduil / Burdened' },
      goal: { vi: 'Nhiều lá Rừng nhất và không thắng lá 1 Nhẫn.', en: 'Most Forest cards and do not win the One Ring.' },
      setup: { vi: 'Không có hành động thiết lập.', en: 'No setup action.' }, exact: false
    },
    gimli: {
      name: { vi: 'Gimli', en: 'Gimli' }, title: { vi: 'Dòng họ Durin', en: "Durin's Folk" },
      goal: { vi: 'Thắng nhiều lá Núi nhất (đồng hạng được).', en: 'Win the most Mountain cards (ties allowed).' },
      setup: { vi: 'Không có hành động thiết lập.', en: 'No setup action.' }, exact: false
    },
    gimli_burdened: {
      name: { vi: 'Gimli', en: 'Gimli' }, title: { vi: 'Gánh nặng', en: 'Burdened' },
      goal: { vi: 'Nhiều lá Núi nhất và không thắng lá 1 Nhẫn.', en: 'Most Mountain cards and do not win the One Ring.' },
      setup: { vi: 'Không có hành động thiết lập.', en: 'No setup action.' }, exact: false
    },
    haldir: {
      name: { vi: 'Haldir', en: 'Haldir' }, title: { vi: 'Người canh cổng', en: 'Marchwarden' },
      goal: { vi: 'Thắng ít nhất 2 lượt.', en: 'Win at least 2 tricks.' },
      setup: { vi: 'Không có hành động thiết lập.', en: 'No setup action.' }, exact: false
    },
    orophin: {
      name: { vi: 'Orophin & Rúmil', en: 'Orophin & Rúmil' }, title: { vi: 'Galadhrim', en: 'Galadhrim' },
      goal: { vi: 'Thắng ít nhất 1 lượt có lá Rừng.', en: 'Win at least 1 trick containing a Forest card.' },
      setup: { vi: 'Không có hành động thiết lập.', en: 'No setup action.' }, exact: false
    },
    galadriel: {
      name: { vi: 'Galadriel', en: 'Galadriel' }, title: { vi: 'Lady of Lothlórien', en: 'Lady of Lothlórien' },
      goal: { vi: 'Thắng ít nhất 1 lá Nhẫn.', en: 'Win at least 1 Rings card.' },
      setup: { vi: 'Gương của Galadriel: xem lại mục tiêu trước khi chơi.', en: 'Mirror event: review your goal before play.' }, exact: false
    },
    celeborn: {
      name: { vi: 'Celeborn', en: 'Celeborn' }, title: { vi: 'Chúa tể Lothlórien', en: 'Lord of Lothlórien' },
      goal: { vi: 'Thắng ít nhất 1 lượt có lá Rừng.', en: 'Win at least 1 trick containing a Forest card.' },
      setup: { vi: 'Không có hành động thiết lập.', en: 'No setup action.' }, exact: false
    }
  };

  root.LOTRCharacters = C;
  if (typeof module !== 'undefined' && module.exports) module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
