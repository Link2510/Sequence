import React from 'react';
import {
  Anchor,
  Building2,
  Crown,
  HelpCircle,
  Palmtree,
  Sparkles,
  X,
} from 'lucide-react';
import { COLOR_GROUP_META, JAIL_BAIL, RESORT_RENTS } from '../data/boardData';
import { PLAYER_COLORS } from '../data/characters';
import {
  BoardTile,
  PendingModal,
  Player,
  PropertyState,
} from '../types/game';
import {
  calculateMaxLiquidationCash,
  calculateRent,
  calculateSellValue,
  formatMoney,
  getPlayerOwnedTiles,
  getTileById,
} from '../utils/gameLogic';
import { BuildingVisual } from './BuildingVisual';

interface ActionModalProps {
  modal: PendingModal;
  inspectedTile: BoardTile | null;
  currentPlayer: Player;
  players: Player[];
  ownership: Record<number, PropertyState>;
  onCloseInspect: () => void;
  onBuyProperty: (tileId: number, targetLevel: 0 | 1 | 2 | 3) => void;
  onSkipBuy: () => void;
  onUpgradeProperty: (tileId: number, targetLevel: 1 | 2 | 3 | 4) => void;
  onBuyoutProperty: (tileId: number) => void;
  onConfirmChance: () => void;
  onJailPayBail: () => void;
  onJailUseCard: () => void;
  onJailRollDoubles: () => void;
  onSellPropertyForDebt: (tileId: number) => void;
  onSettleDebt: () => void;
  onDeclareBankruptcy: () => void;
}

export const ActionModal: React.FC<ActionModalProps> = ({
  modal,
  inspectedTile,
  currentPlayer,
  players,
  ownership,
  onCloseInspect,
  onBuyProperty,
  onSkipBuy,
  onUpgradeProperty,
  onBuyoutProperty,
  onConfirmChance,
  onJailPayBail,
  onJailUseCard,
  onJailRollDoubles,
  onSellPropertyForDebt,
  onSettleDebt,
  onDeclareBankruptcy,
}) => {
  // 1. Tile Inspector (passive view)
  if (!modal && inspectedTile) {
    const prop = ownership[inspectedTile.id];
    const owner = prop ? players.find((p) => p.id === prop.ownerId) : null;
    const groupMeta = inspectedTile.group
      ? COLOR_GROUP_META[inspectedTile.group]
      : null;

    return (
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onCloseInspect}
      >
        <div
          className="w-full max-w-sm bg-[#0F2C27] border border-white/15 rounded-2xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {groupMeta && <div className={`h-3 w-full ${groupMeta.barBg}`} />}
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-slate-400">
                  {groupMeta ? groupMeta.name : 'Ô Đặc Biệt'}
                </div>
                <h3 className="font-display text-xl font-bold text-white mt-0.5">
                  {inspectedTile.name}
                </h3>
                {inspectedTile.landmarkTag && (
                  <p className="text-xs text-amber-300 mt-0.5">
                    Địa danh: {inspectedTile.landmarkTag}
                  </p>
                )}
              </div>
              <button
                onClick={onCloseInspect}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inspectedTile.type === 'PROPERTY' && inspectedTile.rents && (
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-white/10">
                  <span className="text-slate-300">Giá mua đất</span>
                  <span className="font-mono-num font-bold text-white">
                    {formatMoney(inspectedTile.price ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/10">
                  <span className="text-slate-300">Chi phí mỗi cấp nhà</span>
                  <span className="font-mono-num font-bold text-white">
                    {formatMoney(inspectedTile.houseCost ?? 0)}
                  </span>
                </div>
                <div className="pt-1 space-y-1.5">
                  {[
                    'Đất trống (x2 nếu đủ bộ màu)',
                    '1 Nhà',
                    '2 Nhà',
                    '3 Nhà',
                    'Khách Sạn 5★ (Chống mua lại)',
                  ].map((label, idx) => (
                    <div
                      key={label}
                      className={`flex justify-between px-2 py-1 rounded ${
                        prop?.level === idx
                          ? 'bg-amber-500/20 text-amber-300 font-semibold'
                          : 'text-slate-300'
                      }`}
                    >
                      <span>{label}</span>
                      <span className="font-mono-num">
                        {formatMoney(inspectedTile.rents![idx])}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {inspectedTile.type === 'RESORT' && (
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-white/10">
                  <span className="text-slate-300">Giá sở hữu</span>
                  <span className="font-mono-num font-bold text-white">
                    {formatMoney(inspectedTile.price ?? 0)}
                  </span>
                </div>
                {RESORT_RENTS.map((rent, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between px-2 py-1 text-slate-300"
                  >
                    <span>Khi sở hữu {idx + 1} Khu Nghỉ Dưỡng</span>
                    <span className="font-mono-num text-cyan-300 font-semibold">
                      {formatMoney(rent)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {inspectedTile.type !== 'PROPERTY' && inspectedTile.type !== 'RESORT' && (
              <p className="mt-4 text-sm text-slate-300 leading-relaxed">
                {inspectedTile.subtitle || 'Ô sự kiện đặc biệt trên bản đồ Tour Kinh Doanh Việt Nam.'}
              </p>
            )}

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-slate-400">Chủ sở hữu</span>
              {owner ? (
                <span className="font-semibold text-white flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: PLAYER_COLORS[owner.color].hex }}
                  />
                  {owner.name}
                  {prop?.hasFestival ? ' · Đang Lễ Hội (x2)' : ''}
                </span>
              ) : (
                <span className="text-slate-400">Chưa có chủ</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!modal) return null;

  // 2. Buy Unowned Property / Resort
  if (modal.type === 'BUY_PROPERTY') {
    const tile = getTileById(modal.tileId);
    const groupMeta = tile.group ? COLOR_GROUP_META[tile.group] : null;
    const landPrice = tile.price ?? 0;
    const houseCost = tile.houseCost ?? 0;

    const options: { level: 0 | 1 | 2 | 3; label: string; cost: number; rent: number }[] =
      tile.type === 'RESORT'
        ? [{ level: 0, label: 'Mua Khu Nghỉ Dưỡng', cost: landPrice, rent: 250 }]
        : [
            { level: 0, label: 'Chỉ mua Đất', cost: landPrice, rent: tile.rents![0] },
            { level: 1, label: 'Đất + 1 Nhà', cost: landPrice + houseCost, rent: tile.rents![1] },
            { level: 2, label: 'Đất + 2 Nhà', cost: landPrice + houseCost * 2, rent: tile.rents![2] },
            { level: 3, label: 'Đất + 3 Nhà', cost: landPrice + houseCost * 3, rent: tile.rents![3] },
          ];

    return (
      <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0F2C27] border border-white/15 rounded-2xl overflow-hidden shadow-2xl">
          {groupMeta && <div className={`h-3 w-full ${groupMeta.barBg}`} />}
          <div className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400">
                Đất Vô Chủ · {groupMeta?.name}
              </span>
              <span className="font-mono-num text-xs text-slate-300">
                Tiền mặt: {formatMoney(currentPlayer.cash)}
              </span>
            </div>

            <h3 className="font-display text-2xl font-bold text-white mt-1 flex items-center gap-2">
              {tile.type === 'RESORT' ? (
                <Palmtree className="w-5 h-5 text-cyan-400" />
              ) : (
                <Building2 className="w-5 h-5 text-amber-400" />
              )}
              {tile.name}
            </h3>
            {tile.landmarkTag && (
              <p className="text-xs text-slate-300 mt-1">
                Danh thắng nổi bật: {tile.landmarkTag}
              </p>
            )}

            <div className="mt-5 space-y-2.5">
              {options.map((opt) => {
                const canAfford = currentPlayer.cash >= opt.cost;
                return (
                  <button
                    key={opt.level}
                    disabled={!canAfford}
                    onClick={() => onBuyProperty(tile.id, opt.level)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border flex items-center justify-between gap-3 text-left transition-all ${
                      canAfford
                        ? 'bg-white/5 hover:bg-emerald-500/20 border-white/15 hover:border-emerald-400 cursor-pointer'
                        : 'bg-black/20 border-white/5 opacity-45 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-10 rounded-lg bg-black/25 border border-white/10 flex items-center justify-center shrink-0">
                        <BuildingVisual
                          level={opt.level}
                          type={tile.type === 'RESORT' ? 'RESORT' : 'PROPERTY'}
                          accentColor={PLAYER_COLORS[currentPlayer.color].hex}
                          size="md"
                        />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">
                          {opt.label}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Tiền thuê thu về: {formatMoney(opt.rent)}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono-num text-sm font-bold text-amber-400 shrink-0">
                      -{formatMoney(opt.cost)}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={onSkipBuy}
              className="mt-4 w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-sm font-semibold transition-colors cursor-pointer"
            >
              Bỏ Qua Không Mua
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Upgrade Own Property
  if (modal.type === 'UPGRADE_PROPERTY') {
    const tile = getTileById(modal.tileId);
    const prop = ownership[tile.id];
    const currentLevel = prop?.level ?? 0;
    const houseCost = tile.houseCost ?? 0;
    const groupMeta = tile.group ? COLOR_GROUP_META[tile.group] : null;

    const upgradeLevels = ([1, 2, 3, 4] as const).filter(
      (lvl) => lvl > currentLevel
    );

    return (
      <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0F2C27] border border-white/15 rounded-2xl overflow-hidden shadow-2xl">
          {groupMeta && <div className={`h-3 w-full ${groupMeta.barBg}`} />}
          <div className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400">
                Đất Của Bạn · Nâng Cấp Công Trình
              </span>
              <span className="font-mono-num text-xs text-slate-300">
                Tiền mặt: {formatMoney(currentPlayer.cash)}
              </span>
            </div>

            <h3 className="font-display text-2xl font-bold text-white mt-1">
              {tile.name}
            </h3>

            <div className="mt-5 space-y-2.5">
              {upgradeLevels.map((lvl) => {
                const cost = (lvl - currentLevel) * houseCost;
                const canAfford = currentPlayer.cash >= cost;
                const newRent = tile.rents ? tile.rents[lvl] : 0;

                return (
                  <button
                    key={lvl}
                    disabled={!canAfford}
                    onClick={() => onUpgradeProperty(tile.id, lvl)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border flex items-center justify-between gap-3 text-left transition-all ${
                      canAfford
                        ? 'bg-white/5 hover:bg-amber-500/15 border-white/15 hover:border-amber-400 cursor-pointer'
                        : 'bg-black/20 border-white/5 opacity-45 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-10 rounded-lg bg-black/25 border border-white/10 flex items-center justify-center shrink-0">
                        <BuildingVisual
                          level={lvl}
                          type="PROPERTY"
                          accentColor={PLAYER_COLORS[currentPlayer.color].hex}
                          size="md"
                        />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-1.5">
                          {lvl === 4 ? (
                            <>
                              <Crown className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                              Khách Sạn 5★ (Chống mua lại)
                            </>
                          ) : (
                            `Nâng lên ${lvl} Nhà`
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Tiền thuê mới: {formatMoney(newRent)}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono-num text-sm font-bold text-amber-400 shrink-0">
                      -{formatMoney(cost)}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={onSkipBuy}
              className="mt-4 w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-sm font-semibold transition-colors cursor-pointer"
            >
              Giữ Nguyên Hiện Tại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Buyout Opponent Property
  if (modal.type === 'BUYOUT_PROPERTY') {
    const tile = getTileById(modal.tileId);
    const prop = ownership[tile.id];
    const owner = prop ? players.find((p) => p.id === prop.ownerId) : null;
    const canAfford = currentPlayer.cash >= modal.buyoutPrice;

    return (
      <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0F2C27] border border-amber-400/40 rounded-2xl p-6 shadow-2xl">
          <div className="text-xs font-semibold text-amber-400">
            Cơ Hội Thâu Tóm Doanh Nghiệp
          </div>
          <h3 className="font-display text-2xl font-bold text-white mt-1">
            Mua lại {tile.name}?
          </h3>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Bạn đã trả tiền thuê cho <strong className="text-white">{owner?.name}</strong>.
            Vì tỉnh này chưa nâng lên Khách sạn 5★, bạn có quyền mua lại với giá gấp đôi giá trị hiện tại.
          </p>

          <div className="mt-4 p-4 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between">
            <span className="text-sm text-slate-300">Giá thâu tóm</span>
            <span className="font-mono-num text-lg font-extrabold text-amber-400">
              {formatMoney(modal.buyoutPrice)}
            </span>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={onSkipBuy}
              className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-sm font-semibold cursor-pointer"
            >
              Không Mua
            </button>
            <button
              disabled={!canAfford}
              onClick={() => onBuyoutProperty(tile.id)}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                canAfford
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              Thâu Tóm Ngay
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. Chance Card Reveal
  if (modal.type === 'CHANCE_CARD') {
    return (
      <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-gradient-to-b from-amber-50 to-white text-slate-900 rounded-2xl p-6 shadow-2xl border-2 border-amber-400 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-700 flex items-center justify-center mx-auto mb-3">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div className="text-xs font-bold text-amber-700">THẺ CƠ HỘI</div>
          <h3 className="font-display text-xl font-extrabold text-slate-900 mt-1">
            {modal.card.title}
          </h3>
          <p className="text-sm text-slate-700 mt-3 leading-relaxed">
            {modal.card.description}
          </p>
          <button
            onClick={onConfirmChance}
            className="mt-6 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm cursor-pointer transition-colors"
          >
            Xác Nhận
          </button>
        </div>
      </div>
    );
  }

  // 6. Lost Island (Jail) Options
  if (modal.type === 'JAIL_OPTIONS') {
    const canPayBail = currentPlayer.cash >= JAIL_BAIL;

    return (
      <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0F2C27] border border-amber-400/40 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Anchor className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-white">
                Đang ở Đảo Hoang
              </h3>
              <p className="text-xs text-slate-300">
                Lượt bị kẹt thứ {currentPlayer.jailTurns + 1} / 3
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed mb-5">
            Chọn cách thoát khỏi Đảo Hoang: tung xúc xắc ra Đôi, nộp phí tàu cao tốc, hoặc dùng Thẻ Thoát Đảo.
          </p>

          <div className="space-y-2.5">
            <button
              onClick={onJailRollDoubles}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer transition-colors"
            >
              Tung Xúc Xắc Thử Vận May (Ra Đôi Để Thoát)
            </button>

            <button
              disabled={!canPayBail}
              onClick={onJailPayBail}
              className={`w-full py-3 px-4 rounded-xl border text-sm font-semibold flex items-center justify-between ${
                canPayBail
                  ? 'bg-white/10 hover:bg-white/15 border-white/15 text-white cursor-pointer'
                  : 'bg-black/20 border-white/5 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>Trả phí tàu cao tốc thoát đảo</span>
              <span className="font-mono-num text-amber-300">
                -{formatMoney(JAIL_BAIL)}
              </span>
            </button>

            {currentPlayer.escapeCards > 0 && (
              <button
                onClick={onJailUseCard}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-300 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Dùng Thẻ Thoát Đảo Miễn Phí ({currentPlayer.escapeCards})
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 7. Debt Liquidation Modal
  if (modal.type === 'LIQUIDATE') {
    const ownedTiles = getPlayerOwnedTiles(currentPlayer.id, ownership);
    const maxCash = calculateMaxLiquidationCash(currentPlayer, ownership);
    const canSettleNow = currentPlayer.cash >= modal.amountOwed;
    const cannotRecover = maxCash < modal.amountOwed;

    return (
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-[#0F2C27] border border-rose-500/50 rounded-2xl p-6 shadow-2xl">
          <div className="text-xs font-semibold text-rose-400">
            Cảnh Báo Thanh Khoản
          </div>
          <h3 className="font-display text-xl font-bold text-white mt-1">
            Cần thanh toán {formatMoney(modal.amountOwed)}
          </h3>
          <p className="text-xs text-slate-300 mt-1">{modal.reason}</p>

          <div className="grid grid-cols-2 gap-3 my-4 p-3 rounded-xl bg-black/30 border border-white/10">
            <div>
              <div className="text-xs text-slate-400">Tiền mặt hiện có</div>
              <div className="font-mono-num text-lg font-bold text-emerald-300">
                {formatMoney(currentPlayer.cash)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Cần thêm tối thiểu</div>
              <div className="font-mono-num text-lg font-bold text-rose-400">
                {formatMoney(Math.max(0, modal.amountOwed - currentPlayer.cash))}
              </div>
            </div>
          </div>

          {!canSettleNow && ownedTiles.length > 0 && (
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1 mb-4">
              {ownedTiles.map((tile) => {
                const prop = ownership[tile.id]!;
                const sellValue = calculateSellValue(tile, prop);
                return (
                  <div
                    key={tile.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div>
                      <div className="text-sm font-bold text-white">{tile.name}</div>
                      <div className="text-xs text-slate-400">
                        Cấp {prop.level === 4 ? 'Khách sạn 5★' : `${prop.level} nhà`}
                      </div>
                    </div>
                    <button
                      onClick={() => onSellPropertyForDebt(tile.id)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono-num font-bold text-xs cursor-pointer"
                    >
                      Bán +{formatMoney(sellValue)}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {canSettleNow ? (
            <button
              onClick={onSettleDebt}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm cursor-pointer"
            >
              Thanh Toán {formatMoney(modal.amountOwed)} Ngay
            </button>
          ) : cannotRecover ? (
            <button
              onClick={onDeclareBankruptcy}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm cursor-pointer"
            >
              Không Đủ Khả Năng Chi Trả · Tuyên Bố Phá Sản
            </button>
          ) : (
            <div className="text-center text-xs text-amber-300">
              Hãy bán bớt tài sản phía trên cho đến khi đủ tiền mặt để thanh toán.
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};
