import { CharacterProfile, PlayerColorKey } from '../types/game.ts';

export const PLAYER_COLORS: Record<
  PlayerColorKey,
  {
    label: string;
    hex: string;
    bg: string;
    softBg: string;
    border: string;
    text: string;
    ring: string;
  }
> = {
  red: {
    label: 'Đỏ Ruby',
    hex: '#EF4444',
    bg: 'bg-red-500',
    softBg: 'bg-red-500/15',
    border: 'border-red-500',
    text: 'text-red-400',
    ring: 'ring-red-400',
  },
  blue: {
    label: 'Xanh Dương',
    hex: '#3B82F6',
    bg: 'bg-blue-500',
    softBg: 'bg-blue-500/15',
    border: 'border-blue-500',
    text: 'text-blue-400',
    ring: 'ring-blue-400',
  },
  emerald: {
    label: 'Xanh Ngọc',
    hex: '#10B981',
    bg: 'bg-emerald-500',
    softBg: 'bg-emerald-500/15',
    border: 'border-emerald-500',
    text: 'text-emerald-400',
    ring: 'ring-emerald-400',
  },
  purple: {
    label: 'Tím Hoàng Gia',
    hex: '#8B5CF6',
    bg: 'bg-violet-500',
    softBg: 'bg-violet-500/15',
    border: 'border-violet-500',
    text: 'text-violet-400',
    ring: 'ring-violet-400',
  },
};

export const CHARACTERS: CharacterProfile[] = [
  {
    id: 'minh',
    name: 'Doanh Nhân Minh',
    title: 'Ông Trùm Bất Động Sản',
    avatar: '/src/assets/images/char_tycoon_minh_1795793831048.jpg',
    bio: 'Quyết đoán trên từng thương vụ lớn, chuyên săn đất vàng ở các đô thị trung tâm.',
    badgeText: 'Tài Chính',
    defaultColor: 'blue',
  },
  {
    id: 'coba',
    name: 'Cô Ba Sài Gòn',
    title: 'Nữ Hoàng Thương Mại',
    avatar: '/src/assets/images/char_saigon_ba_1795793830991.jpg',
    bio: 'Nắm giữ mạng lưới khách sạn cao cấp khắp miền Nam với phong thái sang trọng.',
    badgeText: 'Thương Mại',
    defaultColor: 'red',
  },
  {
    id: 'baphi',
    name: 'Bác Ba Phi',
    title: 'Điền Chủ Miền Tây',
    avatar: '/src/assets/images/char_mekong_phi_1795793831950.jpg',
    bio: 'Hào sảng, nhiều chiêu bài bất ngờ và luôn biết cách xoay chuyển thế cờ.',
    badgeText: 'Nông Sản',
    defaultColor: 'emerald',
  },
  {
    id: 'linh',
    name: 'Kỹ Sư Linh',
    title: 'Nhà Sáng Lập Công Nghệ',
    avatar: '/src/assets/images/char_tech_linh_1795793831696.jpg',
    bio: 'Tính toán xác suất tung xúc xắc chính xác và tối ưu hóa dòng tiền thuê nhà.',
    badgeText: 'Công Nghệ',
    defaultColor: 'purple',
  },
  {
    id: 'hai',
    name: 'Thuyền Trưởng Hải',
    title: 'Vua Cảng Biển',
    avatar: '/src/assets/images/char_captain_hai_1795793832753.jpg',
    bio: 'Ưa thích thâu tóm chuỗi vịnh đảo và các khu nghỉ dưỡng ven biển Việt Nam.',
    badgeText: 'Hàng Hải',
    defaultColor: 'blue',
  },
  {
    id: 'trang',
    name: 'Nghệ Sĩ Trang',
    title: 'Bà Hoàng Du Lịch',
    avatar: '/src/assets/images/char_artist_trang_1795793833095.jpg',
    bio: 'Đam mê tổ chức lễ hội văn hóa để nhân đôi sức hút cho từng vùng đất di sản.',
    badgeText: 'Du Lịch',
    defaultColor: 'red',
  },
];

export function getCharacterById(id: string): CharacterProfile {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
