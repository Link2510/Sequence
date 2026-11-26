/* chapters.js — 18 chapters of the official board game, rebuilt as data.
   Titles/characters follow the published card list; chapter-specific notes come from the rulebook.
   `approx:true` marks chapter compositions we reconstructed rather than read off a printed card. */
(function (root) {
  'use strict';

  var CHAPTERS = [
    {
      id: 1, art: 'shire', title: { vi: 'Một bữa tiệc dài mong đợi', en: 'A Long-Expected Party' },
      characters: ['frodo', 'bilbo', 'gandalf', 'pippin'], required: ['frodo', 'bilbo'],
      victory: 'short', threat: null, rounds: 1, exact: true,
      story: { vi: 'Bilbo bỏ lại chiếc nhẫn. Frodo tình cờ tìm thấy nó.', en: 'Bilbo leaves behind a ring. Frodo finds it.' },
      note: { vi: 'Chương mẫu: Frodo và Bilbo bắt buộc. Pippin thắng 0 lượt là luôn hoàn thành.', en: 'Tutorial chapter: Frodo and Bilbo are required. Pippin completing with 0 tricks is always valid.' }
    },
    {
      id: 2, art: 'shire', title: { vi: 'Một chút chậm trễ ở Shire', en: 'A Little Delay in the Shire' },
      characters: ['frodo', 'sam', 'merry', 'gandalf', 'pippin'], required: ['frodo', 'sam', 'merry'],
      victory: 'short', threat: 'black', rounds: 1, exact: true,
      story: { vi: 'Ba Kỵ sĩ Đen bắt đầu lần dấu Frodo.', en: 'Three Black Riders begin hunting Frodo.' },
      note: { vi: 'Threat: Black Rider 1–4. Sam cần lá Đồi đúng số Threat; Merry thắng đúng 1 hoặc 2 lượt.', en: 'Threat: Black Riders 1–4. Sam needs the matching Hills card; Merry must win exactly 1 or 2 tricks.' }
    },
    {
      id: 3, art: 'shire', title: { vi: 'Chiếc Nhẫn lên đường', en: 'The Ring Sets Out' },
      characters: ['frodo', 'gildor', 'farmer_maggot', 'sam', 'merry', 'pippin'], required: ['frodo', 'gildor', 'farmer_maggot'],
      victory: 'short', threat: 'black', rounds: 1, exact: false,
      story: { vi: 'Gildor và đoàn elf đi ngang; Farmer Maggot mời họ vào nhà.', en: 'Gildor’s elves pass by; Farmer Maggot offers shelter.' },
      note: { vi: 'Gildor chỉ cần ĐI 1 lá Rừng ở lượt cuối (không cần thắng). Farmer Maggot thắng lá cùng số Threat.', en: 'Gildor only needs to PLAY a Forest in the final trick. Farmer Maggot wins a card matching the Threat rank.' }
    },
    {
      id: 4, art: 'bree', title: { vi: 'Âm mưu ở Crickhollow', en: 'Conspiracy in Crickhollow' },
      characters: ['frodo', 'fatty', 'sam', 'merry', 'pippin'], required: ['frodo', 'fatty', 'merry'],
      victory: 'short', threat: 'black', rounds: 1, exact: false,
      story: { vi: 'Fatty ở lại Crickhollow để làm mồi nhử.', en: 'Fatty stays behind at Crickhollow as a decoy.' },
      note: { vi: 'Fatty cho mỗi người 1 lá, không nhận lại — nên chơi ít lượt hơn, và phải thắng ĐÚNG 1 lượt.', en: 'Fatty gives 1 card to each other character and receives none — fewer tricks, and must win EXACTLY 1.' }
    },
    {
      id: 5, art: 'bree', title: { vi: 'Khu rừng cũ', en: 'The Old Forest' },
      characters: ['frodo', 'tom', 'pippin', 'sam', 'merry'], required: ['frodo', 'tom', 'pippin'],
      victory: 'short', threat: null, rounds: 1, exact: false,
      story: { vi: 'Tom Bombadil xuất hiện giữa khu rừng đang thức giấc.', en: 'Tom Bombadil appears in the waking forest.' },
      note: { vi: 'Sự kiện Old Man Willow: thêm lá 9 Rừng vào bài. Tom thắng lượt cuối.', en: 'Old Man Willow event: add the 9 of Forests. Tom wins the final trick.' }
    },
    {
      id: 6, art: 'bree', title: { vi: 'Sương mù trên đồi Barrow', en: 'Fog on the Barrow-downs' },
      characters: ['frodo', 'tom', 'goldberry', 'sam', 'merry', 'pippin'], required: ['frodo', 'tom', 'goldberry'],
      victory: 'short', threat: null, rounds: 1, exact: false,
      story: { vi: 'Những gò mộ cổ và Barrow-wights.', en: 'Ancient barrows and the Barrow-wights.' },
      note: { vi: 'Goldberry có 8 lá, bài úp ngửa cho mọi người xem, thắng ĐÚNG 3 lượt LIỀN nhau. Không dùng lá rơi.', en: 'Goldberry has 8 faceup cards and must win EXACTLY 3 CONSECUTIVE tricks. No lost card.' }
    },
    {
      id: 7, art: 'bree', title: { vi: 'Tại biển hiệu Ngựa Nhảy', en: 'At the Sign of the Prancing Pony' },
      characters: ['frodo', 'underhill', 'barliman', 'gandalf', 'sam', 'merry', 'pippin'], required: ['frodo', 'underhill', 'barliman'],
      victory: 'short', threat: null, rounds: 1, exact: false,
      story: { vi: 'Quán trọ ở Bree. Frodo lỡ đeo Nhẫn.', en: 'The inn at Bree. Frodo accidentally puts on the Ring.' },
      note: { vi: 'Mr. Underhill thắng 0 lượt. Barliman thắng ít nhất 1 trong 3 lượt cuối.', en: 'Mr. Underhill wins no tricks. Barliman wins at least 1 of the last 3 tricks.' }
    },
    {
      id: 8, art: 'bree', title: { vi: 'Một lưỡi dao trong đêm', en: 'A Knife in the Dark' },
      characters: ['frodo', 'strider', 'gandalf', 'sam', 'merry', 'pippin'], required: ['frodo', 'strider'],
      victory: 'short', threat: 'black', rounds: 1, exact: false,
      story: { vi: 'Strider dẫn đường. Kẻ thù tiếp cận trong bóng tối.', en: 'Strider leads the way. Enemies close in during the dark.' },
      note: { vi: 'Strider thắng số lượt KHÔNG bằng số Threat. Black Breath và Morgul-knife không xáo trộn vào Threat deck.', en: 'Strider must NOT win exactly the Threat number. Black Breath and Morgul-knife stay out of the Threat deck.' }
    },
    {
      id: 9, art: 'river', title: { vi: 'Trốn chạy tới Ford', en: 'Flight to the Ford' },
      characters: ['frodo', 'strider', 'glorfindel', 'bill', 'sam', 'merry', 'pippin'], required: ['frodo', 'strider', 'glorfindel', 'bill'],
      victory: 'short', threat: 'black', rounds: 1, exact: false,
      story: { vi: 'Chín Kỵ sĩ đuổi theo. Glorfindel đưa Frodo qua sông.', en: 'The Nine give chase. Glorfindel brings Frodo across the ford.' },
      note: { vi: 'Sự kiện The Nine: mỗi nhân vật nhận một lá Black Rider riêng. Bill chuyển bài cho Frodo và Sam cùng lúc.', en: 'The Nine event: each character receives a specific Black Rider. Bill passes cards to Frodo and Sam together.' }
    },
    {
      id: 10, art: 'rivendell', title: { vi: 'Hồi phục ở Rivendell', en: 'Recovery in Rivendell' },
      characters: ['frodo', 'elrond', 'arwen', 'gloin', 'bilbo_stretched', 'gandalf'], required: ['frodo', 'elrond', 'arwen', 'gloin', 'bilbo_stretched'],
      victory: 'short', threat: null, rounds: 1, exact: false,
      story: { vi: 'Hội đồng sắp họp. Elrond đưa ra một lựa chọn khó.', en: 'The Council approaches. Elrond offers a difficult choice.' },
      note: { vi: 'Từ chương này không dùng Threat Black Rider nữa. Mục tiêu của Elrond CỘNG THÊM, không thay mục tiêu khác.', en: 'Black Rider Threats are no longer used. Elrond’s goal is ADDED, not substituted.' }
    },
    {
      id: 11, art: 'rivendell', title: { vi: 'Hội đồng Elrond', en: 'The Council of Elrond' },
      characters: ['frodo', 'aragorn', 'boromir', 'gandalf', 'sam', 'merry', 'pippin', 'gimli', 'legolas'], required: ['frodo', 'aragorn', 'boromir'],
      victory: 'short', threat: null, rounds: 1, exact: false,
      story: { vi: 'Quyết định được đưa ra: mang Nhẫn đến Mordor.', en: 'The decision is made: carry the Ring to Mordor.' },
      note: { vi: 'Aragorn dùng Narsil thay Threat. Boromir thắng lượt cuối nhưng không được thắng 1 Nhẫn.', en: 'Aragorn uses Narsil instead of a Threat. Boromir wins the last trick but must not win the One Ring.' }
    },
    {
      id: 12, art: 'rivendell', title: { vi: 'Chậm trễ ở Isengard', en: 'Delayed in Isengard' },
      characters: ['frodo', 'gwaihir', 'shadowfax', 'radagast', 'gandalf'], required: ['frodo', 'gwaihir', 'shadowfax', 'radagast'],
      victory: 'short', threat: null, rounds: 1, exact: false,
      story: { vi: 'Saruman hiện ra. Các đồng minh khác nhau xuất hiện.', en: 'Saruman appears. Unlikely allies arrive.' },
      note: { vi: 'Lá 1 Nhẫn tính là 1 cho sự kiện Saruman. Mỗi nhân vật thắng lượt có 2+ lá chất của mình.', en: 'The 1 of Rings counts as 1 for the Saruman event. Each hero wins a trick with 2+ cards of their suit.' }
    },
    {
      id: 13, art: 'hero', title: { vi: 'Hội huynh đệ lên đường', en: 'The Ring Goes South' },
      characters: ['frodo', 'gandalf', 'aragorn', 'legolas', 'gimli', 'boromir', 'sam', 'merry', 'pippin', 'bill'], required: ['frodo'],
      victory: 'long', threat: 'number', rounds: 0, exact: true,
      story: { vi: 'Chín người rời Rivendell. Chương DÀI — chơi nhiều vòng.', en: 'Nine depart Rivendell. A LONG chapter — played over several rounds.' },
      note: { vi: 'Dài: hoàn thành từng nhân vật qua nhiều vòng. Mithril Shirt trao cho Frodo. Không cần hoàn thành Bill the Pony.', en: 'Long: complete the roster across rounds. Mithril Shirt goes to Frodo. Bill the Pony is exempt.' }
    },
    {
      id: 14, art: 'moria', title: { vi: 'Hầm mỏ Moria', en: 'The Mines of Moria' },
      characters: ['frodo', 'gandalf', 'aragorn', 'legolas', 'gimli', 'boromir', 'sam', 'merry', 'pippin'], required: ['frodo', 'gandalf'],
      victory: 'long', threat: null, rounds: 0, exact: false,
      story: { vi: 'Cổng Durin, lăng mộ Balin, bóng tối và cây cầu.', en: 'The Doors of Durin, Balin’s Tomb, the Long Dark and the Bridge.' },
      note: { vi: 'Phải hoàn thành 3 sự kiện Moria theo thứ tự bất kỳ, riêng Cầu phải cuối cùng.', en: 'Complete 3 Moria events in any order; the Bridge event must be last.' }
    },
    {
      id: 15, art: 'lothlorien', title: { vi: 'Những lá cây của Lothlórien', en: 'The Leaves of Lothlórien' },
      characters: ['frodo', 'haldir', 'orophin', 'gimli', 'legolas', 'sam', 'merry', 'pippin'], required: ['frodo', 'haldir', 'orophin'],
      victory: 'short', threat: null, rounds: 1, exact: false,
      story: { vi: 'Rừng vàng đón họ. Gimli bị bịt mắt.', en: 'The golden forest receives them. Gimli is blindfolded.' },
      note: { vi: 'Solo bỏ qua sự kiện Blindfolded. Haldir thắng ít nhất 2 lượt.', en: 'Solo ignores the Blindfolded event. Haldir wins at least 2 tricks.' }
    },
    {
      id: 16, art: 'mirror', title: { vi: 'Gương của Galadriel', en: 'The Mirror of Galadriel' },
      characters: ['frodo', 'galadriel', 'celeborn', 'sam', 'merry', 'pippin'], required: ['frodo', 'galadriel', 'celeborn'],
      victory: 'short', threat: null, rounds: 1, exact: false,
      story: { vi: 'Mặt nước phản chiếu những điều có thể xảy ra.', en: 'The pool shows what may come.' },
      note: { vi: 'Solo bỏ qua sự kiện Gương và giao nhân vật ngẫu nhiên. Với 2–3 người không dùng Sam.', en: 'Solo ignores the Mirror event and assigns characters randomly. Sam is not used with 2–3 players.' }
    },
    {
      id: 17, art: 'river', title: { vi: 'Dòng sông lớn', en: 'The Great River' },
      characters: ['frodo', 'gandalf', 'aragorn', 'legolas', 'gimli', 'boromir', 'sam', 'merry', 'pippin'], required: ['frodo'],
      victory: 'long', threat: 'number', rounds: 0, exact: false,
      story: { vi: 'Ba chiếc thuyền xuôi Anduin. Thêm chất Sông.', en: 'Three boats drift down the Anduin. The Rivers suit is added.' },
      note: { vi: 'Lá Sông như chất chủ, nhưng vẫn thua lá 1 Nhẫn.', en: 'River cards act as trump, but still lose to the One Ring.' }
    },
    {
      id: 18, art: 'amon-hen', title: { vi: 'Sự tan vỡ của Hội huynh đệ', en: 'The Breaking of the Fellowship' },
      characters: ['frodo', 'sam_burdened', 'pippin_burdened', 'merry_burdened', 'aragorn_burdened', 'boromir_burdened', 'legolas_burdened', 'gimli_burdened'],
      required: ['frodo'], victory: 'long', threat: 'number', rounds: 2, exact: false,
      story: { vi: 'Amon Hen. Nhẫn thì thầm. Con đường chia rẽ.', en: 'Amon Hen. The Ring whispers. The road divides.' },
      note: { vi: 'Chương này LUÔN 2 vòng. Mỗi nhóm có 1 nhân vật không được chọn. Các nhân vật Gánh nặng không được thắng 1 Nhẫn.', en: 'Always 2 rounds. One character in each group goes unchosen. Burdened characters must not win the One Ring.' }
    }
  ];

  root.LOTRChapters = CHAPTERS;
  if (typeof module !== 'undefined' && module.exports) module.exports = CHAPTERS;
})(typeof window !== 'undefined' ? window : globalThis);
