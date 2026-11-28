import { ChapterDef, CharacterDef, CharacterId, Suit } from './types';

export const SUIT_META: Record<
  Suit,
  {
    label: string;
    english: string;
    color: string;
    bgTint: string;
    borderColor: string;
    maxRank: number;
    description: string;
  }
> = {
  hills: {
    label: 'Đồi Cỏ',
    english: 'Hills',
    color: '#2F6B36',
    bgTint: '#E9F2E6',
    borderColor: '#5B8F5E',
    maxRank: 8,
    description: 'Những ngọn đồi thanh bình của xứ Shire (1–8)',
  },
  forests: {
    label: 'Rừng Thẳm',
    english: 'Forests',
    color: '#175E5B',
    bgTint: '#E4F0EE',
    borderColor: '#3E847F',
    maxRank: 8,
    description: 'Khu rừng cổ thụ và vương quốc Tiên tộc (1–8)',
  },
  mountains: {
    label: 'Núi Đá',
    english: 'Mountains',
    color: '#344966',
    bgTint: '#E6EBF2',
    borderColor: '#5A7191',
    maxRank: 8,
    description: 'Dãy Núi Sương Mù hùng vĩ và hầm mỏ (1–8)',
  },
  shadows: {
    label: 'Bóng Tối',
    english: 'Shadows',
    color: '#7C2230',
    bgTint: '#F4E5E7',
    borderColor: '#9E4754',
    maxRank: 8,
    description: 'Hiểm họa từ Mordor và Ma Nhẫn (1–8)',
  },
  rings: {
    label: 'Nhẫn Quyền Năng',
    english: 'Rings (Trump)',
    color: '#B57B14',
    bgTint: '#FAF0D7',
    borderColor: '#C6932B',
    maxRank: 5,
    description: 'Chất Chủ (Trump) từ 1–5. Lá 1 là Chiếc Nhẫn Duy Nhất.',
  },
};

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  frodo: {
    id: 'frodo',
    name: 'Frodo Baggins',
    title: 'Người Giữ Nhẫn',
    portraitUrl: './src/assets/images/char_frodo_1795802417081.jpg',
    accentColor: '#C6932B',
    crestType: 'ring',
    lore: 'Người cầm lá 1 Nhẫn luôn đóng vai Frodo và mở đầu hành trình.',
  },
  bilbo: {
    id: 'bilbo',
    name: 'Bilbo Baggins',
    title: 'Chủ Nhân Túi Đáy',
    accentColor: '#4A7C4E',
    crestType: 'acorn',
    lore: 'Chuẩn bị bữa tiệc sinh nhật thứ 111 đáng nhớ trước khi rời Shire.',
  },
  gandalf: {
    id: 'gandalf',
    name: 'Gandalf Áo Xám',
    title: 'Pháp Sư Dẫn Đường',
    portraitUrl: './src/assets/images/char_gandalf_1795802417804.jpg',
    accentColor: '#5D7085',
    crestType: 'staff',
    lore: 'Am hiểu bí mật của Lá Bài Thất Lạc và dẫn dắt Hội Đồng.',
  },
  samwise: {
    id: 'samwise',
    name: 'Samwise Gamgee',
    title: 'Bạn Đồng Hành Trung Thành',
    portraitUrl: './src/assets/images/char_samwise_1795802417681.jpg',
    accentColor: '#5B8A3C',
    crestType: 'lantern',
    lore: 'Luôn bảo vệ Frodo và canh chừng hiểm họa trên đồi cỏ.',
  },
  merry: {
    id: 'merry',
    name: 'Meriadoc Brandybuck',
    title: 'Người Hoạch Định Thông Thái',
    accentColor: '#2B6E68',
    crestType: 'horn',
    lore: 'Giữ thăng bằng số trick vừa đủ để giúp cả nhóm vượt sông.',
  },
  pippin: {
    id: 'pippin',
    name: 'Peregrin Took',
    title: 'Chàng Hobbit Tò Mò',
    accentColor: '#8B5E3C',
    crestType: 'goblet',
    lore: 'Càng ít gây chú ý càng tốt — tránh ăn trick để không rước họa.',
  },
  aragorn: {
    id: 'aragorn',
    name: 'Aragorn (Strider)',
    title: 'Kẻ Lang Thang Phương Bắc',
    portraitUrl: './src/assets/images/char_aragorn_1795802419679.jpg',
    accentColor: '#3E5770',
    crestType: 'sword',
    lore: 'Đứng ra gánh vác những trick nặng ký và đẩy lùi Bóng Tối.',
  },
  legolas: {
    id: 'legolas',
    name: 'Legolas Lục Diệp',
    title: 'Hoàng Tử Rừng Mirkwood',
    accentColor: '#1E6B5C',
    crestType: 'bow',
    lore: 'Bậc thầy của Rừng Thẳm, thu phục những lá bài rừng xanh.',
  },
  gimli: {
    id: 'gimli',
    name: 'Gimli Con Trai Glóin',
    title: 'Chiến Binh Người Lùn',
    accentColor: '#5B6778',
    crestType: 'axe',
    lore: 'Vững chãi như Núi Đá, bảo vệ đồng đội trước hiểm nguy.',
  },
  boromir: {
    id: 'boromir',
    name: 'Boromir Xứ Gondor',
    title: 'Tổng Tư Lệnh Thành Trắng',
    accentColor: '#8C313B',
    crestType: 'shield',
    lore: 'Chiến đấu mạnh mẽ giành nhiều trick nhất nhưng dễ bị Nhẫn cám dỗ.',
  },
  tom_bombadil: {
    id: 'tom_bombadil',
    name: 'Tom Bombadil',
    title: 'Chủ Nhân Rừng Già',
    accentColor: '#2D7396',
    crestType: 'feather',
    lore: 'Miễn nhiễm với ma lực của Chiếc Nhẫn, hát vang giải cứu các Hobbit.',
  },
  goldberry: {
    id: 'goldberry',
    name: 'Goldberry',
    title: 'Con Gái Dòng Sông',
    accentColor: '#2A7C6F',
    crestType: 'lily',
    lore: 'Mang lại sự thanh bình, giúp đồng đội tránh xa Bóng Tối.',
  },
  glorfindel: {
    id: 'glorfindel',
    name: 'Glorfindel',
    title: 'Lãnh Chúa Tiên Tộc',
    accentColor: '#B59032',
    crestType: 'star',
    lore: 'Ánh sáng rực rỡ từ Rivendell xua tan Kỵ Sĩ Đen bên bờ sông.',
  },
  elrond: {
    id: 'elrond',
    name: 'Chúa Tể Elrond',
    title: 'Người Trị Vì Rivendell',
    accentColor: '#4E5D73',
    crestType: 'crown',
    lore: 'Triệu tập Hội Đồng và điều phối cân bằng các chất bài.',
  },
  galadriel: {
    id: 'galadriel',
    name: 'Nữ Hoàng Galadriel',
    title: 'Quý Bà Rừng Lothlórien',
    accentColor: '#3A7B80',
    crestType: 'mirror',
    lore: 'Nhìn thấu tương lai qua Tấm Gương Ánh Sáng và trao bảo vật cho Hội Đồng.',
  },
};

export const CHAPTERS: ChapterDef[] = [
  {
    id: 1,
    title: 'Chương 1: Bữa Tiệc Mong Đợi',
    englishTitle: 'A Long-Expected Party',
    subtitle: 'Hobbiton · Khởi đầu cho người mới',
    difficulty: 'Dễ (Khởi đầu)',
    storyIntro:
      'Bilbo tổ chức đại tiệc chia tay tại Hobbiton. Gandalf giúp thu hồi Lá Bài Thất Lạc và trao đổi 1 lá bài với Frodo trước khi ván đấu bắt đầu.',
    specialRuleText:
      'Gandalf nhận Lá Bài Thất Lạc vào tay, sau đó trao đổi bí mật 1 lá với Frodo (trừ lá 1 Nhẫn).',
    hasGandalfLostCardExchange: true,
    characters: [
      {
        characterId: 'frodo',
        required: true,
        goalLabel: 'Thắng ít nhất 2 lá Nhẫn',
        goalDescription: 'Thu thập tối thiểu 2 lá bài chất Nhẫn trong các trick bạn thắng.',
        setupPower: 'Nhận 1 lá từ Gandalf và đưa lại 1 lá làm Lá Thất Lạc mới.',
      },
      {
        characterId: 'gandalf',
        required: true,
        goalLabel: 'Thắng ít nhất 1 trick',
        goalDescription: 'Giành chiến thắng tối thiểu 1 trick bất kỳ trong ván.',
        setupPower: 'Lấy Lá Bài Thất Lạc vào tay rồi trao đổi 1 lá với Frodo.',
      },
      {
        characterId: 'bilbo',
        required: true,
        goalLabel: 'Thắng đúng 3 trick',
        goalDescription: 'Kết thúc ván với chính xác 3 trick để bữa tiệc trọn vẹn.',
      },
      {
        characterId: 'pippin',
        required: false,
        goalLabel: 'Thắng 0 trick',
        goalDescription: 'Không để bản thân thắng bất kỳ trick nào suốt cả 9 lượt.',
      },
    ],
  },
  {
    id: 2,
    title: 'Chương 2: Ba Người Là Bầu Bạn',
    englishTitle: 'Three Is Company',
    subtitle: 'Đường Rừng Shire · Ma Nhẫn Truy Đuổi',
    difficulty: 'Dễ (Khởi đầu)',
    storyIntro:
      'Các chàng Hobbit lên đường rời Shire trong đêm tối khi Ma Nhẫn Đen bắt đầu rình rập dọc theo những ngọn đồi.',
    specialRuleText:
      'Lá Ma Nhẫn Đen (1–4) được lật ngẫu nhiên đầu ván. Samwise phải thắng được lá Đồi Cỏ có số trùng với Ma Nhẫn Đen.',
    hasBlackRider: true,
    characters: [
      {
        characterId: 'frodo',
        required: true,
        goalLabel: 'Thắng ít nhất 2 lá Nhẫn',
        goalDescription: 'Thu thập tối thiểu 2 lá chất Nhẫn để giữ Nhẫn an toàn.',
      },
      {
        characterId: 'samwise',
        required: true,
        goalLabel: 'Thắng lá Đồi Cỏ trùng Ma Nhẫn',
        goalDescription: 'Kết thúc ván với lá Đồi Cỏ mang đúng con số của thẻ Ma Nhẫn.',
      },
      {
        characterId: 'merry',
        required: true,
        goalLabel: 'Thắng 1 hoặc 2 trick',
        goalDescription: 'Chỉ được thắng đúng 1 hoặc 2 trick, không được 0 hay 3+.',
      },
      {
        characterId: 'pippin',
        required: false,
        goalLabel: 'Thắng 0 trick',
        goalDescription: 'Giữ mình kín đáo, không ăn bất kỳ trick nào.',
      },
    ],
  },
  {
    id: 3,
    title: 'Chương 3: Lối Tắt Đến Nấm',
    englishTitle: 'A Short Cut to Mushrooms',
    subtitle: 'Rừng Marish · Phối hợp thứ tự trick',
    difficulty: 'Dễ (Khởi đầu)',
    storyIntro:
      'Băng qua cánh đồng nhà Maggot để tránh Kỵ Sĩ Đen, cả nhóm phải phân chia nhịp thắng trick thật khéo léo.',
    specialRuleText: 'Merry phải thắng ít nhất 1 trick nhưng luôn ít trick hơn Frodo.',
    characters: [
      {
        characterId: 'frodo',
        required: true,
        goalLabel: 'Thắng >= 2 trick & >= 1 lá Nhẫn',
        goalDescription: 'Thắng tối thiểu 2 trick và thu thập ít nhất 1 lá Nhẫn.',
      },
      {
        characterId: 'samwise',
        required: true,
        goalLabel: 'Thắng lá Rừng Thẳm >= 5',
        goalDescription: 'Ăn được ít nhất 1 lá chất Rừng Thẳm có giá trị từ 5 trở lên.',
      },
      {
        characterId: 'merry',
        required: true,
        goalLabel: 'Thắng >= 1 trick & ít hơn Frodo',
        goalDescription: 'Phải thắng ít nhất 1 trick nhưng tổng số trick nhỏ hơn Frodo.',
      },
      {
        characterId: 'pippin',
        required: true,
        goalLabel: 'Thắng đúng 1 trick',
        goalDescription: 'Pippin cần thắng chính xác 1 trick để tìm đường.',
      },
    ],
  },
  {
    id: 4,
    title: 'Chương 4: Khu Rừng Già',
    englishTitle: 'The Old Forest',
    subtitle: 'Cụ Liễu Già · Tom Bombadil xuất hiện',
    difficulty: 'Trung bình',
    storyIntro:
      'Những tán cây cổ thụ khép kín lối đi. Tom Bombadil xuất hiện với tiếng hát vang để giải cứu các Hobbit khỏi cơn mê ngủ.',
    specialRuleText: 'Tom Bombadil phải thắng ít nhất 2 lá Rừng Thẳm và tránh toàn bộ lá Bóng Tối.',
    characters: [
      {
        characterId: 'frodo',
        required: true,
        goalLabel: 'Thắng ít nhất 2 lá Nhẫn',
        goalDescription: 'Thu thập tối thiểu 2 lá chất Nhẫn.',
      },
      {
        characterId: 'tom_bombadil',
        required: true,
        goalLabel: 'Thắng >= 2 Rừng Thẳm & 0 Bóng Tối',
        goalDescription: 'Thu phục ít nhất 2 lá Rừng Thẳm và không thắng lá Bóng Tối nào.',
      },
      {
        characterId: 'samwise',
        required: true,
        goalLabel: 'Thắng >= 2 trick',
        goalDescription: 'Giành ít nhất 2 trick để kéo đồng đội khỏi rễ cây.',
      },
      {
        characterId: 'pippin',
        required: false,
        goalLabel: 'Thắng 0 trick',
        goalDescription: 'Tránh gây tiếng động — giữ đúng 0 trick.',
      },
    ],
  },
  {
    id: 5,
    title: 'Chương 5: Ngôi Nhà Tom Bombadil',
    englishTitle: 'In the House of Tom Bombadil',
    subtitle: 'Bờ Sông Withywindle · Tĩnh lặng',
    difficulty: 'Trung bình',
    storyIntro:
      'Trong căn nhà ấm áp bên dòng sông, Goldberry giúp cả nhóm gột rửa nỗi sợ hãi trước khi tiến vào vùng đồi sương mù.',
    specialRuleText: 'Goldberry thắng nhiều lá Rừng Thẳm hoặc Đồi Cỏ với đúng 2 trick; Tom giữ ít nhất 1 lá Nhẫn.',
    characters: [
      {
        characterId: 'frodo',
        required: true,
        goalLabel: 'Thắng đúng 1 lá Nhẫn',
        goalDescription: 'Chỉ thu thập chính xác 1 lá Nhẫn trong suốt ván.',
      },
      {
        characterId: 'tom_bombadil',
        required: true,
        goalLabel: 'Thắng >= 1 lá Nhẫn & >= 2 trick',
        goalDescription: 'Tom Bombadil cầm Nhẫn không hề hấn — thắng >= 1 lá Nhẫn và >= 2 trick.',
      },
      {
        characterId: 'goldberry',
        required: true,
        goalLabel: 'Thắng đúng 2 trick & 0 Bóng Tối',
        goalDescription: 'Ăn chính xác 2 trick và tuyệt đối không dính lá Bóng Tối.',
      },
      {
        characterId: 'merry',
        required: false,
        goalLabel: 'Thắng >= 1 lá Núi Đá',
        goalDescription: 'Ăn ít nhất 1 lá chất Núi Đá.',
      },
    ],
  },
  {
    id: 6,
    title: 'Chương 6: Sương Mù Đồi Mộ Cổ',
    englishTitle: 'Fog on the Barrow-Downs',
    subtitle: 'Barrow-Downs · Ác Linh Bóng Tối',
    difficulty: 'Trung bình',
    storyIntro:
      'Lạc trong sương mù dày đặc của những ngôi mộ cổ, bốn người bạn phải dè chừng từng lá Bóng Tối rình rập.',
    specialRuleText: 'Lá Ma Nhẫn Đen xuất hiện. Samwise phải thắng lá Đồi Cỏ trùng số Ma Nhẫn để gọi cứu viện.',
    hasBlackRider: true,
    characters: [
      {
        characterId: 'frodo',
        required: true,
        goalLabel: 'Thắng >= 2 trick & >= 1 lá Nhẫn',
        goalDescription: 'Thắng tối thiểu 2 trick và ít nhất 1 lá Nhẫn.',
      },
      {
        characterId: 'samwise',
        required: true,
        goalLabel: 'Thắng lá Đồi Cỏ trùng Ma Nhẫn',
        goalDescription: 'Giành được đúng lá Đồi Cỏ mang con số trên thẻ Ma Nhẫn.',
      },
      {
        characterId: 'merry',
        required: true,
        goalLabel: 'Thắng >= 2 lá Bóng Tối',
        goalDescription: 'Chủ động đón nhận ít nhất 2 lá Bóng Tối.',
      },
      {
        characterId: 'pippin',
        required: false,
        goalLabel: 'Thắng đúng 1 trick',
        goalDescription: 'Chỉ ăn duy nhất 1 trick.',
      },
    ],
  },
  {
    id: 7,
    title: 'Chương 7: Quán Chú Ngựa Nhỏ',
    englishTitle: 'At the Sign of the Prancing Pony',
    subtitle: 'Thị trấn Bree · Gặp Kẻ Lang Thang',
    difficulty: 'Trung bình',
    storyIntro:
      'Tại quán trọ Bree đầy mật thám, Frodo chỉ được để lộ Nhẫn một lần duy nhất trong khi Aragorn (Strider) lặng lẽ bảo vệ cả nhóm.',
    specialRuleText: 'Frodo chỉ ăn ĐÚNG 1 lá Nhẫn. Samwise cần giữ số trick >= Frodo.',
    characters: [
      {
        characterId: 'frodo',
        required: true,
        goalLabel: 'Thắng đúng 1 lá Nhẫn',
        goalDescription: 'Ăn chính xác 1 lá chất Nhẫn — không nhiều hơn, không ít hơn.',
      },
      {
        characterId: 'aragorn',
        required: true,
        goalLabel: 'Thắng >= 2 lá Bóng Tối & >= 2 trick',
        goalDescription: 'Đánh chặn ít nhất 2 lá Bóng Tối và thắng tối thiểu 2 trick.',
      },
      {
        characterId: 'samwise',
        required: true,
        goalLabel: 'Thắng trick >= Frodo',
        goalDescription: 'Che chở Frodo bằng cách thắng số trick bằng hoặc nhiều hơn Frodo.',
      },
      {
        characterId: 'merry',
        required: false,
        goalLabel: 'Thắng đúng 2 trick',
        goalDescription: 'Giữ nhịp hoàn hảo với chính xác 2 trick thắng.',
      },
    ],
  },
  {
    id: 8,
    title: 'Chương 8: Con Dao Trong Đêm (Weathertop)',
    englishTitle: 'A Knife in the Dark',
    subtitle: 'Amon Sûl · Cuộc phục kích Nazgûl',
    difficulty: 'Thử thách',
    storyIntro:
      'Trên đỉnh Weathertop lộng gió, Gandalf và Aragorn dồn lực đẩy lùi Bóng Tối trong khi Frodo và Pippin giữ vững đội hình.',
    specialRuleText: 'Gandalf thu nhận Lá Thất Lạc và trao đổi 1 lá với Frodo.',
    hasGandalfLostCardExchange: true,
    characters: [
      {
        characterId: 'frodo',
        required: true,
        goalLabel: 'Thắng >= 2 lá Nhẫn & >= 2 trick',
        goalDescription: 'Thu phục ít nhất 2 lá Nhẫn và thắng ít nhất 2 trick.',
      },
      {
        characterId: 'aragorn',
        required: true,
        goalLabel: 'Thắng >= 3 lá Bóng Tối',
        goalDescription: 'Hấp thụ ít nhất 3 lá chất Bóng Tối để đẩy lùi Ma Nhẫn.',
      },
      {
        characterId: 'gandalf',
        required: true,
        goalLabel: 'Thắng >= 2 trick',
        goalDescription: 'Giành ít nhất 2 trick sau khi trao đổi Lá Thất Lạc.',
        setupPower: 'Lấy Lá Bài Thất Lạc vào tay rồi trao đổi 1 lá với Frodo.',
      },
      {
        characterId: 'pippin',
        required: false,
        goalLabel: 'Thắng đúng 1 trick',
        goalDescription: 'Chỉ ăn duy nhất 1 trick trong trận đánh đêm.',
      },
    ],
  },
  {
    id: 9,
    title: 'Chương 9: Chạy Đua Đến Khúc Sông',
    englishTitle: 'Flight to the Ford',
    subtitle: 'Sông Bruinen · Glorfindel Tiếp Ứng',
    difficulty: 'Thử thách',
    storyIntro:
      'Glorfindel phi ngựa trắng đón đầu tại khúc sông Bruinen, mở đường cho Frodo băng qua dòng nước xiết thoát khỏi Nazgûl.',
    specialRuleText: 'Glorfindel cần thắng nhiều trick nhất bàn hoặc >= 3 trick để cản bước Kỵ Sĩ Đen.',
    characters: [
      {
        characterId: 'frodo',
        required: true,
        goalLabel: 'Thắng >= 2 lá Nhẫn',
        goalDescription: 'Giữ tối thiểu 2 lá Nhẫn qua sông an toàn.',
      },
      {
        characterId: 'glorfindel',
        required: true,
        goalLabel: 'Thắng >= 3 trick & >= 2 Đồi Cỏ',
        goalDescription: 'Chủ động thắng ít nhất 3 trick và 2 lá Đồi Cỏ.',
      },
      {
        characterId: 'aragorn',
        required: true,
        goalLabel: 'Thắng >= 2 lá Bóng Tối',
        goalDescription: 'Chặn hậu ít nhất 2 lá Bóng Tối.',
      },
      {
        characterId: 'samwise',
        required: false,
        goalLabel: 'Thắng đúng 1 hoặc 2 trick',
        goalDescription: 'Giữ từ 1 đến 2 trick bảo vệ hậu phương.',
      },
    ],
  },
  {
    id: 10,
    title: 'Chương 10: Nhiều Cuộc Gặp Gỡ (Rivendell)',
    englishTitle: 'Many Meetings',
    subtitle: 'Thung lũng Imladris · Hồi phục',
    difficulty: 'Trung bình',
    storyIntro:
      'Tại Rivendell yên bình, Chúa Tể Elrond và Gandalf cùng Frodo kiểm tra lại hành trang và những mảnh ghép còn thiếu.',
    specialRuleText: 'Gandalf lấy Lá Bài Thất Lạc trao đổi với Frodo. Elrond điều phối chất Núi Đá & Rừng Thẳm.',
    hasGandalfLostCardExchange: true,
    characters: [
      {
        characterId: 'frodo',
        required: true,
        goalLabel: 'Thắng >= 2 lá Nhẫn',
        goalDescription: 'Giữ tối thiểu 2 lá chất Nhẫn.',
      },
      {
        characterId: 'elrond',
        required: true,
        goalLabel: 'Thắng >= 2 Rừng & >= 2 Núi',
        goalDescription: 'Cân bằng sức mạnh Tiên tộc: ăn >= 2 Rừng Thẳm và >= 2 Núi Đá.',
      },
      {
        characterId: 'gandalf',
        required: true,
        goalLabel: 'Thắng đúng 2 trick',
        goalDescription: 'Thắng chính xác 2 trick để mở đường thảo luận.',
        setupPower: 'Lấy Lá Bài Thất Lạc vào tay rồi trao đổi 1 lá với Frodo.',
      },
      {
        characterId: 'bilbo',
        required: false,
        goalLabel: 'Thắng 0 hoặc 1 trick',
        goalDescription: 'Bilbo nghỉ ngơi tại Rivendell, ăn tối đa 1 trick.',
      },
    ],
  },
  {
    id: 11,
    title: 'Chương 11: Hội Đồng Elrond',
    englishTitle: 'The Council of Elrond',
    subtitle: 'Rivendell · Tứ Trụ Lập Lời Thề',
    difficulty: 'Thử thách',
    storyIntro:
      'Các đại diện của Người Lùn, Tiên tộc và Loài Người tụ họp tại Rivendell, lập nên Hội Đồng Nhẫn gồm 9 người.',
    specialRuleText: 'Legolas gom Rừng Thẳm, Gimli gom Núi Đá, Boromir dẫn đầu số trick bàn.',
    characters: [
      {
        characterId: 'frodo',
        required: true,
        goalLabel: 'Thắng ít nhất 2 lá Nhẫn',
        goalDescription: 'Đảm nhận gánh nặng với tối thiểu 2 lá Nhẫn.',
      },
      {
        characterId: 'legolas',
        required: true,
        goalLabel: 'Thắng >= 3 lá Rừng Thẳm',
        goalDescription: 'Thu thập ít nhất 3 lá bài chất Rừng Thẳm.',
      },
      {
        characterId: 'gimli',
        required: true,
        goalLabel: 'Thắng >= 3 lá Núi Đá',
        goalDescription: 'Thu thập ít nhất 3 lá bài chất Núi Đá.',
      },
      {
        characterId: 'boromir',
        required: true,
        goalLabel: 'Nhiều trick nhất & >= 1 lá Nhẫn',
        goalDescription: 'Thắng nhiều trick hơn từng người còn lại và có ít nhất 1 lá Nhẫn.',
      },
    ],
  },
  {
    id: 12,
    title: 'Chương 12: Chiếc Nhẫn Đi Về Phương Nam',
    englishTitle: 'The Ring Goes South',
    subtitle: 'Eregion · Đèo Caradhras',
    difficulty: 'Thử thách',
    storyIntro:
      'Hội Đồng tiến lên đỉnh núi tuyết Caradhras khắc nghiệt. Bão tuyết và bóng tối thử thách từng bước chân.',
    specialRuleText: 'Gimli cần ít nhất 2 Núi Đá; Aragorn gánh nhiều trick nhất hoặc >= 3 trick.',
    characters: [
      {
        characterId: 'frodo',
        required: true,
        goalLabel: 'Thắng >= 2 lá Nhẫn',
        goalDescription: 'Giữ tối thiểu 2 lá Nhẫn trong bão tuyết.',
      },
      {
        characterId: 'aragorn',
        required: true,
        goalLabel: 'Thắng >= 3 trick & >= 1 Bóng Tối',
        goalDescription: 'Mở đường xuyên tuyết với >= 3 trick và >= 1 Bóng Tối.',
      },
      {
        characterId: 'gimli',
        required: true,
        goalLabel: 'Thắng >= 2 Núi Đá & >= 2 trick',
        goalDescription: 'Thắng tối thiểu 2 lá Núi Đá và 2 trick.',
      },
      {
        characterId: 'pippin',
        required: false,
        goalLabel: 'Thắng 0 trick',
        goalDescription: 'Không để tuyết lở vì sai sót — giữ đúng 0 trick.',
      },
    ],
  },
  {
    id: 13,
    title: 'Chương 13: Cánh Cửa Durin',
    englishTitle: 'Doors of Durin',
    subtitle: 'Tây Môn Moria · Câu Đố Tiên Cổ',
    difficulty: 'Thử thách',
    storyIntro:
      'Trước vách đá đen sừng sững của Moria, Gandalf phải giải mật ngữ mở cổng trong khi thủy quái hồ nước rình rập.',
    specialRuleText: 'Gandalf thu nhận Lá Thất Lạc và phải thắng đúng 2 hoặc 3 trick.',
    hasGandalfLostCardExchange: true,
    characters: [
      {
        characterId: 'frodo',
        required: true,
        goalLabel: 'Thắng >= 2 lá Nhẫn',
        goalDescription: 'Thu phục tối thiểu 2 lá Nhẫn.',
      },
      {
        characterId: 'gandalf',
        required: true,
        goalLabel: 'Thắng 2 hoặc 3 trick',
        goalDescription: 'Ăn đúng 2 hoặc 3 trick để giải mã Cánh Cửa Durin.',
        setupPower: 'Lấy Lá Bài Thất Lạc vào tay rồi trao đổi 1 lá với Frodo.',
      },
      {
        characterId: 'legolas',
        required: true,
        goalLabel: 'Thắng >= 2 Rừng & >= 1 Núi',
        goalDescription: 'Thu thập ít nhất 2 lá Rừng Thẳm và 1 lá Núi Đá.',
      },
      {
        characterId: 'merry',
        required: false,
        goalLabel: 'Không thắng lá Bóng Tối nào',
        goalDescription: 'Giữ số lá Bóng Tối bằng 0.',
      },
    ],
  },
  {
    id: 14,
    title: 'Chương 14: Hành Trình Trong Bóng Tối',
    englishTitle: 'A Journey in the Dark',
    subtitle: 'Hầm Mỏ Moria · Hầm Mộ Balin',
    difficulty: 'Cao cấp',
    storyIntro:
      'Tiếng trống vang vọng từ vực sâu Khazad-dûm. Bóng Tối tràn ngập các đại sảnh, buộc chiến binh phải chia nhau chống đỡ.',
    specialRuleText: 'Aragorn và Gimli phải cùng nhau chia sẻ gánh nặng Núi Đá và Bóng Tối.',
    characters: [
      {
        characterId: 'frodo',
        required: true,
        goalLabel: 'Thắng >= 2 lá Nhẫn & >= 2 trick',
        goalDescription: 'Thắng ít nhất 2 lá Nhẫn và 2 trick.',
      },
      {
        characterId: 'gimli',
        required: true,
        goalLabel: 'Nhiều lá Núi Đá nhất bàn',
        goalDescription: 'Thắng nhiều lá Núi Đá hơn từng đồng đội khác.',
      },
      {
        characterId: 'aragorn',
        required: true,
        goalLabel: 'Thắng >= 3 lá Bóng Tối',
        goalDescription: 'Hấp thụ ít nhất 3 lá Bóng Tối trong hầm mỏ.',
      },
      {
        characterId: 'boromir',
        required: true,
        goalLabel: 'Thắng >= 2 trick & 0 lá Nhẫn',
        goalDescription: 'Chiến đấu dũng cảm với >= 2 trick nhưng không chạm vào lá Nhẫn nào.',
      },
    ],
  },
  {
    id: 15,
    title: 'Chương 15: Cây Cầu Khazad-dûm',
    englishTitle: 'The Bridge of Khazad-dûm',
    subtitle: 'Balrog · "Ngươi Không Thể Đi Qua!"',
    difficulty: 'Cao cấp',
    storyIntro:
      'Gandalf đứng chặn Balrog lửa trên cây cầu đá hẹp để cả Hội Đồng chạy thoát ra khỏi Đông Môn.',
    specialRuleText: 'Gandalf thu nhận Lá Thất Lạc và phải một mình gánh >= 3 lá Bóng Tối + >= 3 trick.',
    hasGandalfLostCardExchange: true,
    characters: [
      {
        characterId: 'frodo',
        required: true,
        goalLabel: 'Thắng >= 2 lá Nhẫn',
        goalDescription: 'Giữ tối thiểu 2 lá Nhẫn.',
      },
      {
        characterId: 'gandalf',
        required: true,
        goalLabel: 'Thắng >= 3 Bóng Tối & >= 3 trick',
        goalDescription: 'Chặn đứng Balrog: ăn >= 3 lá Bóng Tối và >= 3 trick.',
        setupPower: 'Lấy Lá Bài Thất Lạc vào tay rồi trao đổi 1 lá với Frodo.',
      },
      {
        characterId: 'samwise',
        required: true,
        goalLabel: 'Thắng >= 1 trick & 0 Bóng Tối',
        goalDescription: 'Đưa các Hobbit rút lui an toàn: >= 1 trick và 0 Bóng Tối.',
      },
      {
        characterId: 'legolas',
        required: false,
        goalLabel: 'Thắng đúng 2 trick',
        goalDescription: 'Bắn yểm trợ đúng 2 trick.',
      },
    ],
  },
  {
    id: 16,
    title: 'Chương 16: Rừng Vàng Lothlórien',
    englishTitle: 'Lothlórien',
    subtitle: 'Caras Galadhon · Vương Quốc Tiên',
    difficulty: 'Cao cấp',
    storyIntro:
      'Rời Moria trong đau thương, Hội Đồng bước vào khu rừng Mallorn rực rỡ ánh vàng nơi thời gian như ngừng trôi.',
    specialRuleText: 'Legolas và Galadriel kiểm soát chất Rừng Thẳm; Gimli vượt qua định kiến cổ xưa.',
    characters: [
      {
        characterId: 'frodo',
        required: true,
        goalLabel: 'Thắng đúng 1 hoặc 2 lá Nhẫn',
        goalDescription: 'Giữ đúng 1 hoặc 2 lá Nhẫn.',
      },
      {
        characterId: 'galadriel',
        required: true,
        goalLabel: 'Thắng đúng 2 trick & >= 2 Rừng',
        goalDescription: 'Ăn chính xác 2 trick và thu thập ít nhất 2 lá Rừng Thẳm.',
      },
      {
        characterId: 'legolas',
        required: true,
        goalLabel: 'Nhiều lá Rừng Thẳm nhất bàn',
        goalDescription: 'Thắng nhiều lá Rừng Thẳm hơn hẳn mọi người còn lại.',
      },
      {
        characterId: 'gimli',
        required: true,
        goalLabel: 'Thắng >= 2 Núi Đá & 0 Bóng Tối',
        goalDescription: 'Giữ vững >= 2 lá Núi Đá và sạch bóng tối.',
      },
    ],
  },
  {
    id: 17,
    title: 'Chương 17: Tấm Gương Galadriel',
    englishTitle: 'The Mirror of Galadriel',
    subtitle: 'Lời Tiên Tri & Thử Thách Tâm Trí',
    difficulty: 'Cao cấp',
    storyIntro:
      'Nước bạc trong Tấm Gương phản chiếu những viễn cảnh khắc nghiệt. Frodo và Sam phải nhìn thẳng vào định mệnh.',
    specialRuleText: 'Samwise cần thắng ít nhất 2 trick và 1 Đồi Cỏ; Galadriel giữ chính xác 1 lá Nhẫn.',
    characters: [
      {
        characterId: 'frodo',
        required: true,
        goalLabel: 'Thắng >= 2 lá Nhẫn & >= 2 trick',
        goalDescription: 'Thắng tối thiểu 2 lá Nhẫn và 2 trick.',
      },
      {
        characterId: 'galadriel',
        required: true,
        goalLabel: 'Thắng đúng 1 lá Nhẫn',
        goalDescription: 'Thử nghiệm tâm trí: giữ chính xác 1 lá chất Nhẫn.',
      },
      {
        characterId: 'samwise',
        required: true,
        goalLabel: 'Thắng >= 2 trick & >= 2 Đồi Cỏ',
        goalDescription: 'Nhớ về quê hương Shire: ăn >= 2 trick và >= 2 lá Đồi Cỏ.',
      },
      {
        characterId: 'aragorn',
        required: false,
        goalLabel: 'Thắng >= 2 Bóng Tối',
        goalDescription: 'Đứng vững trước viễn cảnh chiến tranh: >= 2 lá Bóng Tối.',
      },
    ],
  },
  {
    id: 18,
    title: 'Chương 18: Tan Rã Hội Đồng (Amon Hen)',
    englishTitle: 'The Breaking of the Fellowship',
    subtitle: 'Parth Galen · Trận Chiến Cuối Cùng',
    difficulty: 'Cao cấp',
    storyIntro:
      'Bên dòng Anduin tại Amon Hen, Hội Đồng chia ngả. Boromir chiến đấu đến hơi thở cuối cùng để bảo vệ Merry và Pippin, còn Frodo cùng Sam lặng lẽ tiến về Mordor.',
    specialRuleText: 'Chương kết: Mọi vai trò đều mang áp lực cực đại — chỉ một sai lầm sẽ khiến Hội Đồng thất bại.',
    characters: [
      {
        characterId: 'frodo',
        required: true,
        goalLabel: 'Thắng >= 3 lá Nhẫn',
        goalDescription: 'Một mình gánh gánh nặng cuối: thu phục ít nhất 3 lá chất Nhẫn.',
      },
      {
        characterId: 'samwise',
        required: true,
        goalLabel: 'Thắng >= 2 trick & >= 1 Đồi Cỏ',
        goalDescription: 'Theo sát Frodo về Mordor với >= 2 trick và >= 1 Đồi Cỏ.',
      },
      {
        characterId: 'aragorn',
        required: true,
        goalLabel: 'Thắng >= 2 Bóng Tối & >= 2 trick',
        goalDescription: 'Dẫn dắt Thợ Săn Ba Người: ăn >= 2 Bóng Tối và >= 2 trick.',
      },
      {
        characterId: 'boromir',
        required: true,
        goalLabel: 'Nhiều trick nhất & 0 lá Nhẫn',
        goalDescription: 'Vượt qua cám dỗ cuối: thắng nhiều trick nhất bàn nhưng 0 lá Nhẫn.',
      },
    ],
  },
];

export function getChapterById(id: number): ChapterDef {
  return CHAPTERS.find((c) => c.id === id) || CHAPTERS[0];
}
