import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Compass, Info, Sparkles, XCircle } from 'lucide-react';
import { CHAPTERS, SUIT_META } from '../game/chapters';
import { Card, Suit } from '../game/types';
import { CharacterPortrait } from './CharacterPortrait';
import { PlayingCard, SuitEmblem } from './PlayingCard';

interface TutorialViewProps {
  onStartPractice: () => void;
  onCreateRoom: () => void;
}

const SUIT_LIST: Suit[] = ['hills', 'forests', 'mountains', 'shadows', 'rings'];

const PRACTICE_HAND: Card[] = [
  { id: 'hills-8', suit: 'hills', rank: 8 },
  { id: 'mountains-3', suit: 'mountains', rank: 3 },
  { id: 'mountains-7', suit: 'mountains', rank: 7 },
  { id: 'rings-2', suit: 'rings', rank: 2 },
];

export const TutorialView: React.FC<TutorialViewProps> = ({
  onStartPractice,
  onCreateRoom,
}) => {
  const [step, setStep] = useState(0);
  const [selectedSuit, setSelectedSuit] = useState<Suit>('hills');
  const [drillCardId, setDrillCardId] = useState<string | null>(null);
  const [drillFeedback, setDrillFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [oneRingClaim, setOneRingClaim] = useState<boolean>(true);

  const steps = [
    '01. Bộ Bài Trung Địa (37 Lá)',
    '02. Luật Theo Chất & Ăn Trick',
    '03. Chất Nhẫn & Chiếc Nhẫn Duy Nhất',
    '04. Chơi Đồng Đội & Mục Tiêu',
    '05. Trao Đổi Đầu Ván & Thực Chiến',
  ];

  const handleDrillClick = (card: Card) => {
    setDrillCardId(card.id);
    if (card.suit !== 'mountains') {
      setDrillFeedback({
        ok: false,
        text: `Chưa hợp lệ! Lượt này Gandalf dẫn lá 5 Núi Đá. Trên tay bạn đang có lá Núi Đá (3 hoặc 7), nên luật bắt buộc bạn phải đánh chất Núi Đá.`,
      });
      return;
    }
    if (card.rank === 7) {
      setDrillFeedback({
        ok: true,
        text: `Chính xác! 7 Núi Đá hợp lệ và lớn hơn 5 Núi Đá của Gandalf nên bạn đang tạm dẫn đầu để ăn trick này.`,
      });
    } else {
      setDrillFeedback({
        ok: true,
        text: `Hợp lệ! 3 Núi Đá tuân thủ đúng luật theo chất, nhưng nhỏ hơn 5 Núi Đá nên bạn sẽ nhường quyền ăn trick cho đồng đội (rất hữu ích nếu bạn đang đóng vai Pippin!).`,
      });
    }
  };

  const chapter1 = CHAPTERS[0];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <div className="text-xs font-medium text-[#D6B46A] tracking-wide mb-2">
          Hướng Dẫn Từng Bước · Dành Cho Người Mới
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-[#F5EEDB] text-balance">
          Làm Chủ Trò Chơi Trong 3 Phút
        </h1>
        <p className="mt-2 text-[#C8C0AB] max-w-2xl leading-relaxed">
          Khác với Tiến Lên hay Poker, đây là board game <strong className="text-[#F5EEDB]">hợp tác 100%</strong>. Cả 4 người cùng thắng nếu mọi nhân vật đều hoàn thành nhiệm vụ riêng sau 9 lượt đánh (9 trick).
        </p>
      </div>

      {/* Step Navigation Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-[#111E15] border border-[#C6932B]/25 rounded-xl mb-8">
        {steps.map((label, idx) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(idx)}
            className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              step === idx
                ? 'bg-[#C6932B] text-[#111810] font-semibold'
                : 'text-[#C8C0AB] hover:text-[#F5EEDB] hover:bg-[#192B1F]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Step Content Container */}
      <div className="bg-[#122017] border border-[#C6932B]/30 rounded-2xl p-6 sm:p-8 shadow-xl">
        {step === 0 && (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-6 space-y-4">
              <h2 className="text-2xl font-bold text-[#F5EEDB]">
                Bộ bài gồm 37 lá và 1 Lá Bài Thất Lạc
              </h2>
              <p className="text-[#C8C0AB] leading-relaxed">
                Bộ bài chuẩn có <strong className="text-[#F5EEDB]">37 lá</strong> chia làm 5 chất. Đầu mỗi chương, hệ thống tráo bài và úp riêng <strong className="text-[#E5B85C]">1 Lá Bài Thất Lạc</strong> (không bao giờ là lá 1 Nhẫn). 36 lá còn lại chia đều cho 4 người, mỗi người <strong className="text-[#F5EEDB]">9 lá</strong> để đánh đúng 9 lượt.
              </p>

              <div className="space-y-2 pt-2">
                {SUIT_LIST.map((suit) => {
                  const meta = SUIT_META[suit];
                  const active = selectedSuit === suit;
                  return (
                    <button
                      key={suit}
                      type="button"
                      onClick={() => setSelectedSuit(suit)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#1A2D20] border-[#C6932B]'
                          : 'bg-[#0E1811] border-[#C6932B]/20 hover:border-[#C6932B]/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <SuitEmblem suit={suit} size={26} />
                        <div>
                          <div className="text-sm font-semibold text-[#F5EEDB]">
                            {meta.label} ({meta.english})
                          </div>
                          <div className="text-xs text-[#A8A08C]">{meta.description}</div>
                        </div>
                      </div>
                      <span className="font-mono text-xs text-[#E5B85C] tabular-nums whitespace-nowrap shrink-0">
                        1–{meta.maxRank}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-6 bg-[#0D1610] border border-[#C6932B]/20 rounded-xl p-6">
              <div className="text-xs text-[#D6B46A] mb-4">
                Xem trước chất: {SUIT_META[selectedSuit].label} · Số lá: {SUIT_META[selectedSuit].maxRank}
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                {Array.from({ length: SUIT_META[selectedSuit].maxRank }, (_, i) => i + 1)
                  .filter((r) => r <= 4 || r === SUIT_META[selectedSuit].maxRank)
                  .map((rank) => (
                    <PlayingCard
                      key={`${selectedSuit}-${rank}`}
                      card={{ id: `${selectedSuit}-${rank}`, suit: selectedSuit, rank }}
                    />
                  ))}
              </div>
              <p className="mt-5 text-xs text-[#A8A08C] text-center leading-relaxed">
                Trong mỗi chất thường, lá số cao hơn luôn thắng lá số nhỏ hơn. Riêng <strong className="text-[#E5B85C]">Chất Nhẫn</strong> là Chất Chủ (Trump) — thắng mọi chất thường!
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[#F5EEDB]">
                Cách Đánh 1 Trick & Luật Bắt Buộc Theo Chất
              </h2>
              <p className="mt-2 text-[#C8C0AB] leading-relaxed max-w-3xl">
                Mỗi lượt (gọi là 1 <strong className="text-[#F5EEDB]">Trick</strong>), người dẫn đánh ra 1 lá đầu tiên. 3 người tiếp theo theo chiều kim đồng hồ: <strong className="text-[#E5B85C]">nếu trên tay có lá cùng chất với lá dẫn thì BẮT BUỘC phải đánh chất đó</strong>. Chỉ khi hết chất đó mới được đánh chất khác (hoặc đánh lá Nhẫn để chặt).
              </p>
            </div>

            <div className="grid lg:grid-cols-12 gap-6 items-center bg-[#0D1610] border border-[#C6932B]/25 rounded-xl p-6">
              <div className="lg:col-span-4 flex flex-col items-center text-center space-y-3">
                <div className="text-xs text-[#D6B46A]">Gandalf vừa dẫn lượt bằng:</div>
                <PlayingCard card={{ id: 'mountains-5', suit: 'mountains', rank: 5 }} />
                <div className="text-xs text-[#A8A08C]">Chất dẫn: Núi Đá (Mountains)</div>
              </div>

              <div className="lg:col-span-8 space-y-4">
                <div className="text-sm font-medium text-[#F5EEDB]">
                  Thực hành: Bài trên tay bạn bên dưới — hãy bấm chọn 1 lá bạn muốn đánh!
                </div>
                <div className="flex flex-wrap gap-3">
                  {PRACTICE_HAND.map((card) => (
                    <PlayingCard
                      key={card.id}
                      card={card}
                      playable={true}
                      selected={drillCardId === card.id}
                      onClick={() => handleDrillClick(card)}
                    />
                  ))}
                </div>
                {drillFeedback && (
                  <div
                    className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
                      drillFeedback.ok
                        ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-100'
                        : 'bg-rose-950/50 border-rose-500/40 text-rose-100'
                    }`}
                  >
                    {drillFeedback.ok ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <span>{drillFeedback.text}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-4">
              <h2 className="text-2xl font-bold text-[#F5EEDB]">
                Quyền Năng Chất Nhẫn & Chiếc Nhẫn Duy Nhất (1 Nhẫn)
              </h2>
              <div className="space-y-3 text-[#C8C0AB] leading-relaxed">
                <p>
                  <strong className="text-[#F5EEDB]">1. Luật Chưa Khai Mở Nhẫn:</strong> Ở đầu ván, thẻ Nhẫn ở trạng thái Khóa. Bạn <strong className="text-[#E5B85C]">không được phép đánh lá Nhẫn làm lá dẫn đầu trick</strong>, trừ khi trước đó đã có ai hết chất và đánh lá Nhẫn vào bàn (hoặc trên tay bạn chỉ còn toàn lá Nhẫn).
                </p>
                <p>
                  <strong className="text-[#F5EEDB]">2. Ai có 1 Nhẫn, người đó là Frodo:</strong> Người nhận được lá <strong className="text-[#E5B85C]">1 Nhẫn</strong> đầu ván bắt buộc vào vai Frodo và là người đánh lá đầu tiên của Trick 1.
                </p>
                <p>
                  <strong className="text-[#F5EEDB]">3. Đặc quyền của 1 Nhẫn:</strong> Khi bạn đánh lá 1 Nhẫn, bạn được <strong className="text-[#E5B85C]">TỰ CHỌN</strong> muốn lá này <em>Thắng luôn trick</em> (đè cả lá 5 Nhẫn!) hay <em>Nhường quyền thắng</em> (giá trị nhỏ nhất, chỉ tính là 1).
                </p>
              </div>
            </div>

            <div className="lg:col-span-5 bg-[#0D1610] border border-[#C6932B]/30 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-center gap-4">
                <PlayingCard card={{ id: 'rings-4', suit: 'rings', rank: 4 }} compact />
                <span className="text-xs text-[#A8A08C]">vs</span>
                <PlayingCard
                  card={{ id: 'rings-1', suit: 'rings', rank: 1 }}
                  highlighted={oneRingClaim}
                />
              </div>

              <div className="text-xs text-center text-[#D6B46A]">
                Thử bấm chuyển chế độ khi Frodo đánh lá 1 Nhẫn:
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOneRingClaim(true)}
                  className={`px-3 py-2.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    oneRingClaim
                      ? 'bg-[#C6932B] text-[#111810] border-[#E5B85C]'
                      : 'bg-[#15241A] text-[#C8C0AB] border-[#C6932B]/25'
                  }`}
                >
                  Kích Hoạt: Thắng Trick
                </button>
                <button
                  type="button"
                  onClick={() => setOneRingClaim(false)}
                  className={`px-3 py-2.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    !oneRingClaim
                      ? 'bg-[#C6932B] text-[#111810] border-[#E5B85C]'
                      : 'bg-[#15241A] text-[#C8C0AB] border-[#C6932B]/25'
                  }`}
                >
                  Giữ Kín: Nhường Thắng
                </button>
              </div>
              <p className="text-xs text-[#C8C0AB] text-center leading-relaxed">
                {oneRingClaim
                  ? 'Kết quả: 1 Nhẫn kích hoạt sức mạnh, đánh bại cả 4 Nhẫn để Frodo thu thập các lá Nhẫn về cho mục tiêu!'
                  : 'Kết quả: 1 Nhẫn có giá trị 1, nên lá 4 Nhẫn sẽ thắng trick — rất hữu ích khi Frodo đã đủ lá Nhẫn hoặc muốn nhường cho đồng đội.'}
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[#F5EEDB]">
                Chơi Đồng Đội: Cùng Thắng Hoặc Cùng Thua
              </h2>
              <p className="mt-2 text-[#C8C0AB] leading-relaxed max-w-3xl">
                Trong Chương 1 ({chapter1.title}), mỗi thành viên có một điều kiện hoàn thành khác nhau. Bạn không chỉ lo phần mình mà phải quan sát đồng đội — ví dụ: không dồn bài lớn bắt <strong className="text-[#F5EEDB]">Pippin</strong> phải ăn trick!
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {chapter1.characters.map((rule) => (
                <div
                  key={rule.characterId}
                  className="bg-[#0E1811] border border-[#C6932B]/25 rounded-xl p-4 flex flex-col gap-3"
                >
                  <div className="flex items-center gap-3">
                    <CharacterPortrait characterId={rule.characterId} size="sm" />
                    <div>
                      <div className="text-sm font-bold text-[#F5EEDB] capitalize">
                        {rule.characterId}
                      </div>
                      <div className="text-xs text-[#D6B46A]">{rule.goalLabel}</div>
                    </div>
                  </div>
                  <p className="text-xs text-[#C8C0AB] leading-relaxed">
                    {rule.goalDescription}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-[#182B1E] border border-[#C6932B]/30 text-sm text-[#E5DEC9]">
              <Info className="w-5 h-5 text-[#E5B85C] shrink-0 mt-0.5" />
              <span>
                Mẹo cho người mới: Khi chơi cùng AI, bạn có thể bật nút <strong className="text-[#F5EEDB]">Trợ lý luật chơi</strong> và bấm <strong className="text-[#F5EEDB]">Gợi ý từ Gandalf</strong> bất cứ lúc nào để biết lá bài nào tối ưu nhất cho cả 4 người!
              </span>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[#F5EEDB]">
              Giai Đoạn Trao Đổi Đầu Ván & Sẵn Sàng Chơi Thử
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-[#0E1811] border border-[#C6932B]/25 rounded-xl p-5 space-y-3">
                <div className="text-sm font-semibold text-[#E5B85C]">
                  Bước chuẩn bị đặc biệt (Chương 1 & 6)
                </div>
                <p className="text-sm text-[#C8C0AB] leading-relaxed">
                  Ở Chương 1, <strong className="text-[#F5EEDB]">Gandalf</strong> nhìn thấy và lấy <strong className="text-[#F5EEDB]">Lá Bài Thất Lạc</strong> vào tay (lên 10 lá), chọn 1 lá hữu ích (thường là lá Nhẫn!) đưa cho <strong className="text-[#F5EEDB]">Frodo</strong>. Sau đó Frodo bỏ 1 lá không cần thiết (không được bỏ 1 Nhẫn) làm Lá Bài Thất Lạc mới.
                </p>
              </div>
              <div className="bg-[#0E1811] border border-[#C6932B]/25 rounded-xl p-5 space-y-3">
                <div className="text-sm font-semibold text-[#E5B85C]">
                  Kiểm soát nhịp độ với Thẻ Ma Nhẫn (Chương 2+)
                </div>
                <p className="text-sm text-[#C8C0AB] leading-relaxed">
                  Từ Chương 2 trở đi, trò chơi mở thêm thử thách như <strong className="text-[#F5EEDB]">Ma Nhẫn Đen</strong> (Samwise phải săn đúng lá Đồi Cỏ cùng số) hay <strong className="text-[#F5EEDB]">so sánh số trick giữa Frodo và Merry</strong>. Càng lên chương cao càng hấp dẫn!
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={onStartPractice}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C6932B] hover:bg-[#D7A43A] text-[#111810] font-semibold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Thực Hành Chương 1 Với AI Ngay
              </button>
              <button
                type="button"
                onClick={onCreateRoom}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1A2D20] hover:bg-[#233B2A] border border-[#C6932B]/40 text-[#F5EEDB] font-semibold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Compass className="w-4 h-4 text-[#E5B85C]" />
                Tạo Phòng Chơi Với Bạn Bè
              </button>
            </div>
          </div>
        )}

        {/* Footer step controls */}
        <div className="mt-8 pt-6 border-t border-[#C6932B]/20 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#C6932B]/30 text-sm text-[#E5DEC9] disabled:opacity-35 hover:bg-[#192B1F] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Bước Trước
          </button>

          <span className="text-xs text-[#A8A08C] tabular-nums">
            Bước {step + 1} / {steps.length}
          </span>

          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C6932B] hover:bg-[#D7A43A] text-[#111810] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Bước Tiếp Theo
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartPractice}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C6932B] hover:bg-[#D7A43A] text-[#111810] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Vào Bàn Chơi Thử
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
