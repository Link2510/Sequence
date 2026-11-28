import React, { useEffect, useState } from 'react';
import { BookOpen, Compass, Play, Swords, Users } from 'lucide-react';
import { CharacterPortrait } from './components/CharacterPortrait';
import { GameTable } from './components/GameTable';
import { MultiplayerView } from './components/MultiplayerView';
import { PlayingCard } from './components/PlayingCard';
import { TutorialView } from './components/TutorialView';
import { CHAPTERS, CHARACTERS } from './game/chapters';
import { dealChapter } from './game/engine';
import { CharacterId, GameState } from './game/types';
import { getLocalPlayerIdentity } from './services/roomService';

type AppView = 'HOME' | 'AI_SELECT' | 'PLAYING_AI' | 'MULTIPLAYER' | 'TUTORIAL';

const FEATURED_CHARACTERS: CharacterId[] = [
  'frodo',
  'gandalf',
  'samwise',
  'aragorn',
  'bilbo',
  'merry',
  'pippin',
  'tom_bombadil',
  'goldberry',
  'glorfindel',
  'elrond',
  'legolas',
  'gimli',
  'boromir',
  'galadriel',
];

export default function App() {
  const [view, setView] = useState<AppView>('HOME');
  const [selectedChapterId, setSelectedChapterId] = useState<number>(1);
  const [difficultyFilter, setDifficultyFilter] = useState<string>('ALL');
  const [soloGame, setSoloGame] = useState<GameState | null>(null);
  const [inviteRoomCode, setInviteRoomCode] = useState<string | null>(null);

  // Detect ?room=CODE invite link on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && roomParam.trim()) {
      setInviteRoomCode(roomParam.trim().toUpperCase());
      setView('MULTIPLAYER');
    }
  }, []);

  const launchSoloChapter = (chapterId: number) => {
    const { playerName } = getLocalPlayerIdentity();
    const state = dealChapter(chapterId, [
      { name: playerName || 'Bạn', isBot: false },
      { name: 'Đồng Đội Bắc', isBot: true },
      { name: 'Đồng Đội Đông', isBot: true },
      { name: 'Đồng Đội Tây', isBot: true },
    ]);
    setSelectedChapterId(chapterId);
    setSoloGame(state);
    setView('PLAYING_AI');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B150E] text-[#F5EEDB]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-[#0B150E]/95 backdrop-blur-md border-b border-[#C6932B]/25">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Wordmark */}
          <button
            type="button"
            onClick={() => setView('HOME')}
            className="font-display text-base sm:text-lg font-bold tracking-tight text-[#F5EEDB] hover:text-[#E5B85C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Fellowship Trick-Taking
          </button>

          {/* Zone 2: 4 Clean Single-Line Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#C8C0AB]">
            <button
              type="button"
              onClick={() => setView('HOME')}
              className={`hover:text-[#F5EEDB] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'HOME' ? 'text-[#E5B85C] underline underline-offset-8' : ''
              }`}
            >
              Trang Chủ
            </button>
            <button
              type="button"
              onClick={() => setView('AI_SELECT')}
              className={`hover:text-[#F5EEDB] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'AI_SELECT' || view === 'PLAYING_AI'
                  ? 'text-[#E5B85C] underline underline-offset-8'
                  : ''
              }`}
            >
              Đấu Với AI
            </button>
            <button
              type="button"
              onClick={() => setView('MULTIPLAYER')}
              className={`hover:text-[#F5EEDB] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'MULTIPLAYER' ? 'text-[#E5B85C] underline underline-offset-8' : ''
              }`}
            >
              Phòng Bạn Bè
            </button>
            <button
              type="button"
              onClick={() => setView('TUTORIAL')}
              className={`hover:text-[#F5EEDB] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'TUTORIAL' ? 'text-[#E5B85C] underline underline-offset-8' : ''
              }`}
            >
              Hướng Dẫn
            </button>
          </nav>

          {/* Zone 3: 1 Primary CTA */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => launchSoloChapter(selectedChapterId)}
              className="px-4 py-2 rounded-lg bg-[#C6932B] hover:bg-[#D7A43A] text-[#111810] text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Chơi Ngay
            </button>
          </div>
        </div>

        {/* Mobile Nav Row (keeps sticky <= 15%) */}
        <div className="md:hidden flex items-center justify-around border-t border-[#C6932B]/15 px-2 py-2 text-xs text-[#C8C0AB]">
          <button type="button" onClick={() => setView('HOME')} className="px-2 py-1 whitespace-nowrap">
            Trang Chủ
          </button>
          <button type="button" onClick={() => setView('AI_SELECT')} className="px-2 py-1 whitespace-nowrap">
            Đấu AI
          </button>
          <button type="button" onClick={() => setView('MULTIPLAYER')} className="px-2 py-1 whitespace-nowrap">
            Phòng Bạn Bè
          </button>
          <button type="button" onClick={() => setView('TUTORIAL')} className="px-2 py-1 whitespace-nowrap">
            Hướng Dẫn
          </button>
        </div>
      </header>

      <main className="flex-1">
        {view === 'HOME' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-16">
            {/* Hero Section (Balanced 2-column split with items-stretch) */}
            <section className="grid lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-between py-2 space-y-6">
                <div className="space-y-4">
                  <div className="text-xs sm:text-sm font-medium text-[#D6B46A]">
                    Board Game Hợp Tác · 37 Lá Bài · 18 Chương Chiến Dịch
                  </div>
                  <h1 className="text-3xl sm:text-5xl font-bold text-[#F5EEDB] leading-[1.15] text-balance">
                    The Fellowship of the Ring: Trick-Taking Game
                  </h1>
                  <p className="text-base text-[#C8C0AB] leading-relaxed max-w-xl">
                    Tái hiện trọn vẹn phiên bản board game hộp gốc qua phong cách kính màu Trung Địa. Luyện tập từng bước với AI thông minh hoặc tạo phòng mời bạn bè qua link chia sẻ tức thì.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => launchSoloChapter(1)}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#C6932B] hover:bg-[#D7A43A] text-[#111810] text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Swords className="w-4 h-4" />
                    Đấu Luyện Tập Với AI
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('MULTIPLAYER')}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#15261B] hover:bg-[#1D3325] border border-[#C6932B]/45 text-[#F5EEDB] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-[#E5B85C]" />
                    Tạo Phòng Chơi Bạn Bè
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('TUTORIAL')}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[#C6932B]/25 hover:border-[#C6932B]/60 text-[#E5DEC9] text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-[#D6B46A]" />
                    Hướng Dẫn Người Mới
                  </button>
                </div>

                {/* Mini Card Preview Strip */}
                <div className="pt-2 flex items-center gap-3 overflow-x-auto pb-1">
                  <PlayingCard card={{ id: 'hills-5', suit: 'hills', rank: 5 }} compact />
                  <PlayingCard card={{ id: 'forests-7', suit: 'forests', rank: 7 }} compact />
                  <PlayingCard card={{ id: 'mountains-6', suit: 'mountains', rank: 6 }} compact />
                  <PlayingCard card={{ id: 'shadows-8', suit: 'shadows', rank: 8 }} compact />
                  <PlayingCard card={{ id: 'rings-1', suit: 'rings', rank: 1 }} compact />
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="relative h-full min-h-[300px] lg:min-h-[420px] rounded-2xl overflow-hidden border border-[#C6932B]/45 shadow-2xl bg-[#111D15]">
                  <img
                    src="./src/assets/images/hero_fellowship_banner_1795802416488.jpg"
                    alt="Minh họa kính màu Hội Đồng Nhẫn khởi hành từ Shire"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B150E]/90 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-4 text-xs sm:text-sm text-[#F5EEDB]">
                    <span>Hành trình từ Hobbiton đến Hội Đồng Elrond</span>
                    <span className="font-mono text-[#E5B85C] whitespace-nowrap">4 Người / 9 Trick</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Mode Highlights (4-column KPI/feature strip below hero) */}
            <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 border-y border-[#C6932B]/20 py-8">
              <div className="space-y-1.5">
                <div className="text-sm font-display font-bold text-[#E5B85C]">Luật Chuẩn Hộp Gốc</div>
                <p className="text-xs text-[#C8C0AB] leading-relaxed">
                  Đủ 37 lá bài, 1 Lá Thất Lạc, quy tắc mở Nhẫn và quyền chọn Thắng/Nhường của 1 Nhẫn.
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="text-sm font-display font-bold text-[#E5B85C]">Hướng Dẫn Từng Bước</div>
                <p className="text-xs text-[#C8C0AB] leading-relaxed">
                  Bài tập tương tác trực tiếp trên tay giúp người chưa chơi bao giờ hiểu luật sau 3 phút.
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="text-sm font-display font-bold text-[#E5B85C]">AI Đồng Đội Thông Minh</div>
                <p className="text-xs text-[#C8C0AB] leading-relaxed">
                  Biết phối hợp cứu Pippin, nhường Nhẫn cho Frodo và có nút Gợi ý nước đi cho bạn.
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="text-sm font-display font-bold text-[#E5B85C]">Sẵn Sàng Firebase Spark</div>
                <p className="text-xs text-[#C8C0AB] leading-relaxed">
                  Tạo phòng gửi link mời bạn bè, cấu hình sẵn Hosting + Firestore rules gói Spark miễn phí.
                </p>
              </div>
            </section>

            {/* Chapters Selection */}
            <section className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#F5EEDB]">
                    Chiến Dịch Đầy Đủ 18 Chương
                  </h2>
                  <p className="text-sm text-[#C8C0AB] mt-1">
                    Trải nghiệm trọn vẹn hành trình từ Hobbiton đến Amon Hen cùng 3 đồng đội AI hoặc bạn bè.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setView('AI_SELECT')}
                  className="text-sm font-medium text-[#E5B85C] hover:underline cursor-pointer whitespace-nowrap"
                >
                  Xem toàn bộ 18 chương
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {CHAPTERS.slice(0, 6).map((chap) => (
                  <div
                    key={chap.id}
                    className="bg-[#122017] border border-[#C6932B]/25 hover:border-[#C6932B]/60 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="text-xs text-[#D6B46A]">
                        {chap.subtitle} · {chap.difficulty}
                      </div>
                      <h3 className="text-lg font-bold text-[#F5EEDB]">{chap.title}</h3>
                      <p className="text-xs text-[#C8C0AB] leading-relaxed">{chap.storyIntro}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => launchSoloChapter(chap.id)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#1A2D20] hover:bg-[#C6932B] hover:text-[#111810] border border-[#C6932B]/35 text-xs font-semibold text-[#F5EEDB] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Chơi Chương {chap.id} Với AI
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Fellowship Character Gallery */}
            <section className="space-y-5">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#F5EEDB]">
                  Nhân Vật Hội Đồng Nhẫn
                </h2>
                <p className="text-sm text-[#C8C0AB] mt-1">
                  Minh họa kính màu thủ công cùng mục tiêu bất đối xứng đặc trưng của từng nhân vật.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {FEATURED_CHARACTERS.map((id) => {
                  const ch = CHARACTERS[id];
                  return (
                    <div
                      key={id}
                      className="bg-[#122017] border border-[#C6932B]/25 rounded-2xl p-4 flex items-start gap-3.5"
                    >
                      <CharacterPortrait characterId={id} size="md" />
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[#F5EEDB]">{ch.name}</div>
                        <div className="text-xs text-[#D6B46A] mb-1.5">{ch.title}</div>
                        <p className="text-xs text-[#A8A08C] leading-relaxed">{ch.lore}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {view === 'AI_SELECT' && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-xs text-[#D6B46A] mb-1">Chế Độ Luyện Tập Đơn · Đầy Đủ 18 Chương</div>
                <h1 className="text-3xl font-bold text-[#F5EEDB]">Chọn Chương Đấu Với AI</h1>
                <p className="text-sm text-[#C8C0AB] mt-1">
                  Rèn luyện kỹ năng đọc bài và phối hợp mục tiêu cùng 3 AI đồng đội trước khi lập phòng cùng bạn bè.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 p-1 bg-[#111E15] border border-[#C6932B]/25 rounded-xl">
                {[
                  { key: 'ALL', label: 'Tất cả (18)' },
                  { key: 'Dễ (Khởi đầu)', label: 'Dễ' },
                  { key: 'Trung bình', label: 'Trung bình' },
                  { key: 'Thử thách', label: 'Thử thách' },
                  { key: 'Cao cấp', label: 'Cao cấp' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setDifficultyFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      difficultyFilter === tab.key
                        ? 'bg-[#C6932B] text-[#111810] font-semibold'
                        : 'text-[#C8C0AB] hover:text-[#F5EEDB]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {CHAPTERS.filter(
                (c) => difficultyFilter === 'ALL' || c.difficulty === difficultyFilter
              ).map((chap) => (
                <div
                  key={chap.id}
                  className="bg-[#122017] border border-[#C6932B]/30 rounded-2xl p-6 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-xs text-[#D6B46A]">
                      <span>{chap.subtitle}</span>
                      <span>{chap.difficulty}</span>
                    </div>
                    <h2 className="text-xl font-bold text-[#F5EEDB]">{chap.title}</h2>
                    <p className="text-sm text-[#C8C0AB] leading-relaxed">{chap.storyIntro}</p>
                    {chap.specialRuleText && (
                      <div className="text-xs text-[#E5B85C] bg-[#0D1610] border border-[#C6932B]/20 rounded-xl p-3">
                        Luật đặc biệt: {chap.specialRuleText}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {chap.characters.map((c) => (
                        <div key={c.characterId} className="text-xs text-[#E5DEC9]">
                          <strong className="text-[#F5EEDB]">{CHARACTERS[c.characterId].name}:</strong>{' '}
                          {c.goalLabel}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => launchSoloChapter(chap.id)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#C6932B] hover:bg-[#D7A43A] text-[#111810] text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Compass className="w-4 h-4" />
                    Bắt Đầu {chap.title.split(':')[0]}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'PLAYING_AI' && soloGame && (
          <GameTable
            gameState={soloGame}
            mySeatIndex={0}
            isHost={true}
            isMultiplayer={false}
            onUpdateGameState={setSoloGame}
            onRestartChapter={() => launchSoloChapter(soloGame.chapterId)}
            onNextChapter={() =>
              launchSoloChapter(Math.min(CHAPTERS.length, soloGame.chapterId + 1))
            }
            onLeaveTable={() => setView('AI_SELECT')}
          />
        )}

        {view === 'MULTIPLAYER' && (
          <MultiplayerView
            initialRoomCode={inviteRoomCode}
            onExitToHome={() => {
              setInviteRoomCode(null);
              setView('HOME');
            }}
          />
        )}

        {view === 'TUTORIAL' && (
          <TutorialView
            onStartPractice={() => launchSoloChapter(1)}
            onCreateRoom={() => setView('MULTIPLAYER')}
          />
        )}
      </main>

      <footer className="border-t border-[#C6932B]/15 py-6 px-4 sm:px-6 text-xs text-[#8E8774]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <span>The Fellowship of the Ring — Trick-Taking Game (Phiên bản Board Game Trực Tuyến)</span>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setView('TUTORIAL')} className="hover:text-[#E5DEC9] cursor-pointer">
              Hướng Dẫn
            </button>
            <button type="button" onClick={() => setView('MULTIPLAYER')} className="hover:text-[#E5DEC9] cursor-pointer">
              Phòng Bạn Bè
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
