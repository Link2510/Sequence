/* cards.js — 69 Chapter cards + 7 Landmarks.
   Card names/effects are original functional equivalents written from the published rulebook's
   card categories; they are NOT verbatim copies of the printed cards. */
(function (root) {
  'use strict';

  var SKILLS = ['ruse', 'strength', 'courage', 'knowledge', 'leadership'];
  var RACES = ['elves', 'ents', 'hobbits', 'humans', 'dwarves', 'wizards'];
  var REGIONS = ['arnor', 'rhudaur', 'misty', 'enedwaith', 'rohan', 'gondor', 'mordor'];

  var SKILL_INFO = {
    ruse: { vi: 'Xảo quyệt', en: 'Ruse', sym: '◇' },
    strength: { vi: 'Sức mạnh', en: 'Strength', sym: '▲' },
    courage: { vi: 'Dũng cảm', en: 'Courage', sym: '❖' },
    knowledge: { vi: 'Tri thức', en: 'Knowledge', sym: '◈' },
    leadership: { vi: 'Lãnh đạo', en: 'Leadership', sym: '✦' }
  };
  var RACE_INFO = {
    elves: { vi: 'Elf', en: 'Elves', sym: '❧' },
    ents: { vi: 'Ent', en: 'Ents', sym: '❦' },
    hobbits: { vi: 'Hobbit', en: 'Hobbits', sym: '◆' },
    humans: { vi: 'Người', en: 'Humans', sym: '⬟' },
    dwarves: { vi: 'Người lùn', en: 'Dwarves', sym: '⬢' },
    wizards: { vi: 'Pháp sư', en: 'Wizards', sym: '✧' }
  };
  var REGION_INFO = {
    arnor: { vi: 'Arnor', en: 'Arnor' },
    rhudaur: { vi: 'Rhudaur', en: 'Rhudaur' },
    misty: { vi: 'Núi Sương Mù', en: 'Misty Mountains' },
    enedwaith: { vi: 'Enedwaith', en: 'Enedwaith' },
    rohan: { vi: 'Rohan', en: 'Rohan' },
    gondor: { vi: 'Gondor', en: 'Gondor' },
    mordor: { vi: 'Mordor', en: 'Mordor' }
  };
  var TYPE_INFO = {
    skill: { vi: 'Kỹ năng', en: 'Skill', sym: '◇', color: '#9aa8b5' },
    coin: { vi: 'Tiền', en: 'Coins', sym: '●', color: '#d8b46a' },
    race: { vi: 'Chủng tộc', en: 'Race', sym: '❧', color: '#7ba870' },
    unit: { vi: 'Quân', en: 'Units', sym: '✕', color: '#c96a5a' },
    quest: { vi: 'Nhẫn', en: 'Quest', sym: '▬', color: '#7ea9d8' },
    maneuver: { vi: 'Chiến thuật', en: 'Maneuver', sym: '★', color: '#9874a6' }
  };

  var CARDS = [], n = 0;
  function add(chapter, type, vi, en, effect, cost, chain) {
    CARDS.push({
      id: 'c' + (++n), chapter: chapter, type: type,
      name: { vi: vi, en: en }, effect: effect,
      cost: cost || { skills: [], coins: 0 },
      chain: chain || null
    });
  }

  /* ---------------- Chapter 1 — 23 cards ---------------- */
  var ch1Skills = [
    ['Bàn tay lẻo lé', 'Sly Hands', ['ruse']], ['Bước chân nhẹ', 'Light Step', ['ruse']],
    ['Sức mạnh trượng', 'Staff Strength', ['strength']], ['Lòng dũng cảm', 'Brave Heart', ['courage']],
    ['Kiến thức cổ', 'Ancient Lore', ['knowledge']], ['Tiếng nói lãnh đạo', 'Commanding Voice', ['leadership']],
    ['Mưu kế', 'Cunning Plan', ['ruse', 'knowledge']], ['Lá chắn', 'Shield Wall', ['courage', 'strength']]
  ];
  ch1Skills.forEach(function (s, i) { add(1, 'skill', s[0], s[1], { skills: s[2] }, { skills: [], coins: 0 }, i % 3 === 0 ? 'ruse' : null); });
  [['Túi tiền nhỏ', 'Small Purse', 1], ['Kho báu bị bỏ quên', 'Forgotten Hoard', 2], ['Tiền lương', 'Wages', 1]]
    .forEach(function (c, i) { add(1, 'coin', c[0], c[1], { coins: c[2] }, { skills: [], coins: 0 }, i === 0 ? 'coin' : null); });
  [['Liên minh Elf', 'Elf Friendship', 'elves'], ['Rừng biết nói', 'Speaking Wood', 'ents'],
   ['Hobbit đồng minh', 'Hobbit Allies', 'hobbits'], ['Dân miền núi', 'Mountain Men', 'humans'],
   ['Người lùn đồng minh', 'Dwarven Allies', 'dwarves']]
    .forEach(function (c) { add(1, 'race', c[0], c[1], { race: c[2] }, { skills: [], coins: 0 }); });
  [['Tân binh', 'New Recruits', 1, ['arnor', 'rhudaur']], ['Tuần tra', 'Patrol', 1, ['enedwaith', 'rohan']],
   ['Đội quân nhỏ', 'Small Band', 2, ['rhudaur', 'misty']], ['Lính gác', 'Guards', 1, ['gondor', 'mordor']]]
    .forEach(function (c) { add(1, 'unit', c[0], c[1], { units: c[2], regions: c[3] }, { skills: ['strength'], coins: 0 }); });
  add(1, 'quest', 'Bước đầu trên đường', 'First Steps', { quest: 1 }, { skills: [], coins: 0 }, 'quest');
  add(1, 'quest', 'Đi nhanh', 'Swift Advance', { quest: 1 }, { skills: ['courage'], coins: 0 });
  add(1, 'quest', 'Trốn khỏi Shire', 'Escape the Shire', { quest: 2 }, { skills: ['ruse'], coins: 0 });

  /* ---------------- Chapter 2 — 23 cards ---------------- */
  [['Lối mòn trong rừng', 'Forest Path', ['ruse']], ['Sức bền', 'Endurance', ['strength']],
   ['Lòng can đảm', 'Valour', ['courage']], ['Sách cũ', 'Old Tome', ['knowledge']],
   ['Lời hiệu triệu', 'Rallying Cry', ['leadership']], ['Đôi mắt sắc', 'Keen Eyes', ['ruse', 'knowledge']],
   ['Giáp bằng sắt', 'Iron Mail', ['courage', 'strength']]]
    .forEach(function (s, i) { add(2, 'skill', s[0], s[1], { skills: s[2] }, { skills: [], coins: 0 }, i % 2 === 0 ? s[2][0] : null); });
  [['Kho báu của dwarf', 'Dwarven Treasure', 2], ['Thuế và lương', 'Taxes and Wages', 3], ['Vàng trong đất', 'Gold in the Earth', 2]]
    .forEach(function (c, i) { add(2, 'coin', c[0], c[1], { coins: c[2] }, { skills: i === 0 ? ['knowledge'] : [], coins: 0 }); });
  [['Lời thề của Elf', 'Elven Oath', 'elves'], ['Cây cổ thụ', 'Ancient Tree', 'ents'],
   ['Tin từ Shire', 'News from the Shire', 'hobbits'], ['Chư hầu', 'Vassals', 'humans']]
    .forEach(function (c) { add(2, 'race', c[0], c[1], { race: c[2] }, { skills: ['leadership'], coins: 0 }); });
  [['Kỵ binh', 'Riders', 2, ['rohan', 'enedwaith']], ['Cung thủ', 'Archers', 1, ['misty', 'rhudaur']],
   ['Đội phòng thủ', 'Defenders', 2, ['gondor', 'rohan']], ['Quân tiếp viện', 'Reinforcements', 3, ['arnor', 'misty']],
   ['Lính đánh lén', 'Skirmishers', 1, ['enedwaith', 'gondor']]]
    .forEach(function (c) { add(2, 'unit', c[0], c[1], { units: c[2], regions: c[3] }, { skills: ['strength'], coins: 0 }); });
  add(2, 'quest', 'Qua đèo', 'Over the Pass', { quest: 1 }, { skills: [], coins: 0 }, 'quest');
  add(2, 'quest', 'Đêm và sương', 'Night and Fog', { quest: 2 }, { skills: ['ruse'], coins: 0 });
  add(2, 'quest', 'Nước sông cuốn', 'River Current', { quest: 2 }, { skills: ['strength'], coins: 0 });
  add(2, 'quest', 'Bóng tối đuổi theo', 'Shadow Pursuit', { quest: 1 }, { skills: ['courage'], coins: 0 }, 'quest');

  /* ---------------- Chapter 3 — 23 cards ---------------- */
  [['Kế hoạch cuối', 'Final Plan', ['ruse', 'knowledge']], ['Sức mạnh quyết chiến', 'Last Strength', ['strength']],
   ['Can đảm trước lửa', 'Courage in Fire', ['courage']], ['Tri thức cổ đại', 'Deep Lore', ['knowledge']],
   ['Hiệu lệnh cuối', 'Final Command', ['leadership']]]
    .forEach(function (s) { add(3, 'skill', s[0], s[1], { skills: s[2] }, { skills: [], coins: 0 }, s[2][0]); });
  [['Kho tàng thành', 'City Treasury', 3], ['Vàng Mordor', 'Gold of Mordor', 4]]
    .forEach(function (c) { add(3, 'coin', c[0], c[1], { coins: c[2] }, { skills: [], coins: 0 }, 'coin'); });
  [['Cuộc tổng động viên', 'Great Mustering', 'elves'], ['Rừng thức giấc', 'Forest Awakes', 'ents'],
   ['Những người bạn nhỏ', 'Little Friends', 'hobbits']]
    .forEach(function (c) { add(3, 'race', c[0], c[1], { race: c[2] }, { skills: ['leadership'], coins: 0 }); });
  [['Đạo quân tinh nhuệ', 'Elite Troops', 3, ['gondor', 'mordor']], ['Đội quân rừng', 'Woodland Host', 2, ['misty', 'rohan']],
   ['Tân binh cuối', 'Last Levies', 2, ['arnor', 'gondor']], ['Cánh quân bắc', 'Northern Host', 3, ['rhudaur', 'arnor']]]
    .forEach(function (c) { add(3, 'unit', c[0], c[1], { units: c[2], regions: c[3] }, { skills: ['strength'], coins: 0 }); });
  add(3, 'quest', 'Nước cuối cùng', 'Final Waters', { quest: 2 }, { skills: [], coins: 0 }, 'quest');
  add(3, 'quest', 'Vào Mordor', 'Into Mordor', { quest: 2 }, { skills: ['courage'], coins: 0 });
  add(3, 'quest', 'Núi lửa', 'The Mountain', { quest: 3 }, { skills: ['strength'], coins: 0 });
  add(3, 'maneuver', 'Đổi hướng', 'Redeploy', { maneuver: 'move', n: 1 }, { skills: ['ruse'], coins: 0 }, 'ruse');
  add(3, 'maneuver', 'Cướp tiền', 'Seize Coin', { maneuver: 'stealCoin', n: 1 }, { skills: [], coins: 0 });
  add(3, 'maneuver', 'Đánh lùi', 'Drive Back', { maneuver: 'removeUnit', n: 1 }, { skills: ['strength'], coins: 0 });
  add(3, 'maneuver', 'Đi đường tắt', 'Short Cut', { maneuver: 'move', n: 2 }, { skills: ['knowledge'], coins: 0 }, 'knowledge');
  add(3, 'maneuver', 'Mất tiền', 'Loss of Coin', { maneuver: 'stealCoin', n: 2 }, { skills: ['ruse'], coins: 0 }, 'ruse');
  add(3, 'maneuver', 'Quét sạch', 'Sweep', { maneuver: 'removeUnit', n: 2 }, { skills: ['courage'], coins: 0 });

  /* ---------------- Landmarks ---------------- */
  var LANDMARKS = [
    { id: 'l1', region: 'arnor', name: { vi: 'Tháp Bắc', en: 'Northern Tower' }, cost: { skills: ['knowledge'], coins: 0 }, effect: { coins: 2 }, text: { vi: 'Đặt pháo đài tại Arnor; lấy 2 tiền.', en: 'Fortress in Arnor; gain 2 coins.' } },
    { id: 'l2', region: 'rhudaur', name: { vi: 'Đồi thời tiết', en: 'Weatherhill' }, cost: { skills: ['ruse'], coins: 0 }, effect: { quest: 1 }, text: { vi: 'Đặt pháo đài tại Rhudaur; tiến 1 ô Nhẫn.', en: 'Fortress in Rhudaur; advance 1 Quest space.' } },
    { id: 'l3', region: 'misty', name: { vi: 'Cổng đá', en: 'Stone Gate' }, cost: { skills: ['strength'], coins: 0 }, effect: { units: 1 }, text: { vi: 'Đặt pháo đài tại Núi Sương Mù; thêm 1 quân.', en: 'Fortress in Misty Mountains; gain 1 unit.' } },
    { id: 'l4', region: 'enedwaith', name: { vi: 'Bến cũ', en: 'Old Landing' }, cost: { skills: ['courage'], coins: 0 }, effect: { coins: 3 }, text: { vi: 'Đặt pháo đài tại Enedwaith; lấy 3 tiền.', en: 'Fortress in Enedwaith; gain 3 coins.' } },
    { id: 'l5', region: 'rohan', name: { vi: 'Đồi vàng', en: 'Golden Hill' }, cost: { skills: ['leadership'], coins: 0 }, effect: { units: 2 }, text: { vi: 'Đặt pháo đài tại Rohan; thêm 2 quân.', en: 'Fortress in Rohan; gain 2 units.' } },
    { id: 'l6', region: 'gondor', name: { vi: 'Thành trắng', en: 'White City' }, cost: { skills: ['knowledge', 'leadership'], coins: 0 }, effect: { quest: 2 }, text: { vi: 'Đặt pháo đài tại Gondor; tiến 2 ô Nhẫn.', en: 'Fortress in Gondor; advance 2 Quest spaces.' } },
    { id: 'l7', region: 'mordor', name: { vi: 'Cổng đen', en: 'Black Gate' }, cost: { skills: ['strength', 'courage'], coins: 0 }, effect: { removeUnit: 1 }, text: { vi: 'Đặt pháo đài tại Mordor; loại 1 quân địch.', en: 'Fortress in Mordor; remove 1 enemy unit.' } }
  ];

  /* Alliance tokens: 3 per race. Effects are functional equivalents. */
  var ALLIANCE = {};
  RACES.forEach(function (r, i) {
    ALLIANCE[r] = [
      { kind: 'coins', n: 1, vi: 'Lấy 1 tiền', en: 'Gain 1 coin' },
      { kind: 'quest', n: 1, vi: 'Tiến 1 ô Nhẫn', en: 'Advance 1 Quest space' },
      { kind: 'units', n: 1, vi: 'Thêm 1 quân', en: 'Gain 1 unit' }
    ];
  });
  ALLIANCE.eagles = [{ kind: 'race', vi: 'Đại bàng: tính là 1 chủng tộc', en: 'Eagle: counts as a race' }];

  var BONUS = {
    3: { kind: 'coins', n: 1, vi: 'Lấy 1 tiền', en: 'Gain 1 coin' },
    6: { kind: 'units', n: 1, vi: 'Thêm 1 quân', en: 'Gain 1 unit' },
    9: { kind: 'quest', n: 1, vi: 'Tiến thêm 1 ô', en: 'Advance 1 more space' }
  };

  var API = {
    SKILLS: SKILLS, RACES: RACES, REGIONS: REGIONS,
    SKILL_INFO: SKILL_INFO, RACE_INFO: RACE_INFO, REGION_INFO: REGION_INFO, TYPE_INFO: TYPE_INFO,
    CARDS: CARDS, LANDMARKS: LANDMARKS, ALLIANCE: ALLIANCE, BONUS: BONUS,
    count: function () { return CARDS.length; }
  };
  root.LOTRDuelCards = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
