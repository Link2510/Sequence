/* Auto-generated browser port of server.ts room logic (Firebase Hosting). Do not edit by hand. */
import { BOARD_TILES, CHANCE_CARDS, JAIL_BAIL, START_SALARY } from '../data/boardData.ts';
import { CHARACTERS, getCharacterById } from '../data/characters.ts';
import { ChanceCard, ChanceNoticeEvent, LogEntry, MoneyTransferEvent, PendingModal, Player, PlayerColorKey, PropertyState, TurnStep, VictorySummary } from '../types/game.ts';
import { ClientWsMessage, GameActionPayload, RoomGameState, RoomPublicView, RoomSlotView, ServerWsMessage, SlotKind } from '../types/room.ts';
import { calculateBuyoutPrice, calculateMaxLiquidationCash, calculateRent, calculateSellValue, checkVictoryConditions, chooseAIFestivalTile, chooseAILevelToBuy, chooseAIWorldTourTile, formatMoney, getPlayerOwnedTiles, getTileById, shouldAIBuyout } from './gameLogic.ts';

const ALLOWED_COLORS: PlayerColorKey[] = ['blue', 'red', 'emerald', 'purple'];
const ALLOWED_CHAR_IDS = new Set(CHARACTERS.map((c) => c.id));
const ALLOWED_STARTING_CASH = new Set([10000, 15000, 20000]);

interface InternalSlot {
  slotIndex: number;
  kind: SlotKind;
  clientId: string | null;
  name: string;
  characterId: string;
  color: PlayerColorKey;
  ready: boolean;
  connected: boolean;
}

interface InternalPlayerMeta {
  slotIndex: number;
  clientId: string | null;
  doublesStreak: number;
}

type PendingAfterPaid =
  | { kind: 'JAIL_BAIL_MOVE'; playerId: number; steps: number }
  | { kind: 'RENT_BUYOUT'; playerId: number; tileId: number }
  | null;

interface InternalRoom {
  code: string;
  hostClientId: string;
  status: 'WAITING' | 'PLAYING' | 'GAME_OVER';
  startingCash: number;
  slots: InternalSlot[];
  game: RoomGameState | null;
  playerMeta: Record<number, InternalPlayerMeta>;
  extraTurn: boolean;
  pendingAfterPaid: PendingAfterPaid;
  moveSeq: number;
  transferSeq: number;
  chanceSeq: number;
  aiTimer: ReturnType<typeof setTimeout> | null;
  disconnectTimer: ReturnType<typeof setTimeout> | null;
  updatedAt: number;
}

const rooms = new Map<string, InternalRoom>();
const socketClientMap = new Map<any, { clientId: string; roomCode: string | null }>();

function generateRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  if (rooms.has(code)) return generateRoomCode();
  return code;
}

function sanitizeName(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim().slice(0, 18);
  return trimmed.length > 0 ? trimmed : fallback;
}

function sendWs(ws: any, msg: ServerWsMessage) {
  try { ws.send(JSON.stringify(msg)); } catch { /* ignore */ }
}

function toPublicView(room: InternalRoom, viewerClientId: string): RoomPublicView {
  const yourSlot = room.slots.find((s) => s.clientId === viewerClientId);
  const slots: RoomSlotView[] = room.slots.map((s) => ({
    slotIndex: s.slotIndex,
    kind: s.kind,
    isHost: s.clientId !== null && s.clientId === room.hostClientId,
    isYou: s.clientId !== null && s.clientId === viewerClientId,
    name: s.name,
    characterId: s.characterId,
    color: s.color,
    ready: s.ready,
    connected: s.connected,
  }));

  return {
    code: room.code,
    status: room.status,
    startingCash: room.startingCash,
    yourSlotIndex: yourSlot ? yourSlot.slotIndex : null,
    isHost: room.hostClientId === viewerClientId,
    slots,
    game: room.game,
  };
}

function broadcastRoom(room: InternalRoom) {
  room.updatedAt = Date.now();
  for (const [ws, info] of socketClientMap.entries()) {
    if (info.roomCode === room.code) {
      sendWs(ws, { type: 'ROOM_STATE', room: toPublicView(room, info.clientId) });
    }
  }
}

function pushLog(
  room: InternalRoom,
  text: string,
  tone: LogEntry['tone'] = 'neutral'
) {
  if (!room.game) return;
  room.game.logs = [
    { id: `${Date.now()}-${Math.random()}`, text, tone },
    ...room.game.logs.slice(0, 29),
  ];
}

function pushTransfer(
  room: InternalRoom,
  fromId: number | 'BANK',
  toId: number | 'BANK',
  amount: number,
  reason: string
) {
  if (!room.game || amount <= 0) return;
  room.transferSeq += 1;
  const ev: MoneyTransferEvent = {
    id: `tr-${room.transferSeq}-${Date.now()}`,
    seq: room.transferSeq,
    fromId,
    toId,
    amount,
    reason,
  };
  room.game.recentTransfers = [...room.game.recentTransfers.slice(-3), ev];
}

function pushChanceEvent(
  room: InternalRoom,
  playerId: number,
  card: ChanceCard
) {
  if (!room.game) return;
  room.chanceSeq += 1;
  room.game.lastChanceEvent = {
    id: `ch-${room.chanceSeq}-${Date.now()}`,
    seq: room.chanceSeq,
    playerId,
    card,
  };
}

function clearAiTimer(room: InternalRoom) {
  if (room.aiTimer) {
    clearTimeout(room.aiTimer);
    room.aiTimer = null;
  }
}

function clearDisconnectTimer(room: InternalRoom) {
  if (room.disconnectTimer) {
    clearTimeout(room.disconnectTimer);
    room.disconnectTimer = null;
  }
}

function evaluateRoomVictory(room: InternalRoom): boolean {
  if (!room.game) return false;
  const summary: VictorySummary | null = checkVictoryConditions(
    room.game.players,
    room.game.ownership
  );
  if (summary) {
    clearAiTimer(room);
    clearDisconnectTimer(room);
    room.pendingAfterPaid = null;
    room.game.victory = summary;
    room.game.turnStep = 'GAME_END';
    room.game.pendingModal = null;
    room.status = 'GAME_OVER';
    return true;
  }
  return false;
}

function advanceRoomTurn(room: InternalRoom) {
  if (!room.game) return;
  clearDisconnectTimer(room);
  room.pendingAfterPaid = null;

  if (evaluateRoomVictory(room)) {
    broadcastRoom(room);
    return;
  }

  const players = room.game.players;
  const curIdx = room.game.currentPlayerIndex;
  const curPlayer = players[curIdx];

  if (room.extraTurn && curPlayer && !curPlayer.bankrupt && !curPlayer.inJail) {
    room.extraTurn = false;
    pushLog(room, `${curPlayer.name} được tung thêm lượt nhờ ra Đôi!`, 'good');
    room.game.turnStep = 'WAIT_ROLL';
    room.game.pendingModal = null;
    broadcastRoom(room);
    scheduleAITurnIfNeeded(room);
    scheduleDisconnectFallbackIfNeeded(room);
    return;
  }

  room.extraTurn = false;
  // Reset outgoing player's doublesStreak so it cannot carry over to a later round (e.g. after World Tour)
  if (curPlayer) {
    if (room.playerMeta[curPlayer.id]) {
      room.playerMeta[curPlayer.id].doublesStreak = 0;
    }
    if (curPlayer.doublesStreak !== 0) {
      room.game.players = players.map((p) =>
        p.id === curPlayer.id ? { ...p, doublesStreak: 0 } : p
      );
    }
  }

  let nextIdx = (curIdx + 1) % players.length;
  let guard = 0;
  while (room.game.players[nextIdx]?.bankrupt && guard < players.length) {
    nextIdx = (nextIdx + 1) % players.length;
    guard += 1;
  }

  room.game.currentPlayerIndex = nextIdx;
  room.game.turnStep = 'WAIT_ROLL';
  room.game.pendingModal = null;
  broadcastRoom(room);
  scheduleAITurnIfNeeded(room);
  scheduleDisconnectFallbackIfNeeded(room);
}

function eliminateRoomPlayer(
  room: InternalRoom,
  playerId: number,
  creditorId: number | null,
  reason: string
) {
  if (!room.game) return;
  clearDisconnectTimer(room);
  room.pendingAfterPaid = null;
  const victim = room.game.players.find((p) => p.id === playerId);
  const victimCash = Math.max(0, victim?.cash ?? 0);

  room.game.players = room.game.players.map((p) => {
    if (p.id === playerId) {
      return {
        ...p,
        cash: 0,
        bankrupt: true,
        inJail: false,
        worldTourReady: false,
        doublesStreak: 0,
      };
    }
    if (creditorId !== null && p.id === creditorId) {
      return { ...p, cash: p.cash + victimCash };
    }
    return p;
  });

  if (room.playerMeta[playerId]) {
    room.playerMeta[playerId].doublesStreak = 0;
  }

  if (creditorId !== null && victimCash > 0) {
    pushTransfer(
      room,
      playerId,
      creditorId,
      victimCash,
      `Tài sản thanh lý (${reason})`
    );
  }

  const nextOwnership = { ...room.game.ownership };
  for (const [k, prop] of Object.entries(nextOwnership)) {
    if (prop.ownerId === playerId) {
      delete nextOwnership[Number(k)];
    }
  }
  room.game.ownership = nextOwnership;
  room.game.pendingModal = null;
  room.extraTurn = false;

  pushLog(
    room,
    `${victim?.name ?? 'Người chơi'} đã phá sản (${reason})! Toàn bộ tài sản được thu hồi.`,
    'bad'
  );

  if (!evaluateRoomVictory(room)) {
    advanceRoomTurn(room);
  } else {
    broadcastRoom(room);
  }
}

function moveRoomPlayerSteps(
  room: InternalRoom,
  playerId: number,
  steps: number,
  collectStartOnPass = true
): number {
  if (!room.game) return 0;
  const player = room.game.players.find((p) => p.id === playerId);
  if (!player) return 0;

  const from = player.position;
  const total = BOARD_TILES.length;
  let pos = from;
  let passedStart = false;

  for (let i = 0; i < steps; i++) {
    pos = (pos + 1) % total;
    if (pos === 0 && collectStartOnPass) {
      passedStart = true;
    }
  }

  room.moveSeq += 1;
  room.game.lastMove = {
    seq: room.moveSeq,
    playerId,
    from,
    to: pos,
    steps,
  };

  room.game.players = room.game.players.map((p) => {
    if (p.id !== playerId) return p;
    return {
      ...p,
      position: pos,
      cash: passedStart ? p.cash + START_SALARY : p.cash,
    };
  });

  if (passedStart) {
    pushTransfer(room, 'BANK', playerId, START_SALARY, 'Lương qua ô Bắt Đầu');
    pushLog(
      room,
      `${player.name} đi qua ô BẮT ĐẦU, nhận +${formatMoney(START_SALARY)}.`,
      'good'
    );
  }

  return pos;
}

function chargeRoomPlayer(
  room: InternalRoom,
  playerId: number,
  amount: number,
  creditorId: number | null,
  reason: string,
  afterPaid?: () => void,
  pendingAction: PendingAfterPaid = null
) {
  if (!room.game) return;
  const payer = room.game.players.find((p) => p.id === playerId);
  if (!payer || payer.bankrupt) return;

  if (payer.cash >= amount) {
    room.game.players = room.game.players.map((p) => {
      if (p.id === playerId) return { ...p, cash: p.cash - amount };
      if (creditorId !== null && p.id === creditorId) {
        return { ...p, cash: p.cash + amount };
      }
      return p;
    });
    pushTransfer(room, playerId, creditorId ?? 'BANK', amount, reason);
    room.pendingAfterPaid = null;
    if (afterPaid) {
      afterPaid();
    } else {
      advanceRoomTurn(room);
    }
    return;
  }

  if (payer.isAI) {
    let workingCash = payer.cash;
    const workingOwnership = { ...room.game.ownership };
    const ownedTiles = getPlayerOwnedTiles(playerId, workingOwnership).sort(
      (a, b) =>
        calculateSellValue(a, workingOwnership[a.id]!) -
        calculateSellValue(b, workingOwnership[b.id]!)
    );

    for (const tile of ownedTiles) {
      if (workingCash >= amount) break;
      const prop = workingOwnership[tile.id]!;
      const sellVal = calculateSellValue(tile, prop);
      workingCash += sellVal;
      delete workingOwnership[tile.id];
      pushTransfer(room, 'BANK', playerId, sellVal, `Bán ${tile.name}`);
      pushLog(
        room,
        `${payer.name} bán ${tile.name} thu về ${formatMoney(sellVal)} để trả nợ.`,
        'warn'
      );
    }

    room.game.ownership = workingOwnership;
    if (workingCash >= amount) {
      room.game.players = room.game.players.map((p) => {
        if (p.id === playerId) return { ...p, cash: workingCash - amount };
        if (creditorId !== null && p.id === creditorId) {
          return { ...p, cash: p.cash + amount };
        }
        return p;
      });
      pushTransfer(room, playerId, creditorId ?? 'BANK', amount, reason);
      room.pendingAfterPaid = null;
      if (afterPaid) {
        afterPaid();
      } else {
        advanceRoomTurn(room);
      }
    } else {
      room.game.players = room.game.players.map((p) =>
        p.id === playerId ? { ...p, cash: workingCash } : p
      );
      eliminateRoomPlayer(room, playerId, creditorId, reason);
    }
    return;
  }

  const maxCash = calculateMaxLiquidationCash(payer, room.game.ownership);
  if (
    maxCash < amount &&
    getPlayerOwnedTiles(playerId, room.game.ownership).length === 0
  ) {
    eliminateRoomPlayer(room, playerId, creditorId, reason);
    return;
  }

  room.pendingAfterPaid = pendingAction;
  room.game.turnStep = 'RESOLVING';
  room.game.pendingModal = {
    forPlayerId: playerId,
    modal: {
      type: 'LIQUIDATE',
      amountOwed: amount,
      creditorId,
      reason,
    },
  };
  broadcastRoom(room);
  scheduleDisconnectFallbackIfNeeded(room);
}

function applyRoomChanceCard(
  room: InternalRoom,
  playerId: number,
  card: ChanceCard
) {
  if (!room.game) return;
  const actor = room.game.players.find((p) => p.id === playerId);
  if (!actor || actor.bankrupt) return;

  switch (card.kind) {
    case 'GAIN': {
      const gain = card.amount ?? 1000;
      room.game.players = room.game.players.map((p) =>
        p.id === playerId ? { ...p, cash: p.cash + gain } : p
      );
      pushTransfer(room, 'BANK', playerId, gain, `Cơ Hội: ${card.title}`);
      pushLog(
        room,
        `${actor.name} nhận +${formatMoney(gain)} (${card.title}).`,
        'good'
      );
      advanceRoomTurn(room);
      break;
    }
    case 'PAY': {
      const fee = card.amount ?? 500;
      pushLog(
        room,
        `${actor.name} bị trừ ${formatMoney(fee)} (${card.title}).`,
        'bad'
      );
      chargeRoomPlayer(room, playerId, fee, null, card.title);
      break;
    }
    case 'ESCAPE_CARD': {
      room.game.players = room.game.players.map((p) =>
        p.id === playerId ? { ...p, escapeCards: p.escapeCards + 1 } : p
      );
      pushLog(room, `${actor.name} nhận được 1 Thẻ Thoát Đảo Hoang.`, 'good');
      advanceRoomTurn(room);
      break;
    }
    case 'GO_JAIL': {
      room.extraTurn = false;
      room.game.players = room.game.players.map((p) =>
        p.id === playerId
          ? {
              ...p,
              position: 8,
              inJail: true,
              jailTurns: 0,
              doublesStreak: 0,
              worldTourReady: false,
            }
          : p
      );
      if (room.playerMeta[playerId]) {
        room.playerMeta[playerId].doublesStreak = 0;
      }
      pushLog(room, `${actor.name} gặp bão, bị đưa thẳng ra Đảo Hoang!`, 'bad');
      advanceRoomTurn(room);
      break;
    }
    case 'REPAIR': {
      const owned = getPlayerOwnedTiles(playerId, room.game.ownership);
      const totalBuildings = owned.reduce((acc, t) => {
        return acc + (room.game?.ownership[t.id]?.level ?? 0);
      }, 0);
      const fee = totalBuildings * (card.amount ?? 200);
      if (fee === 0) {
        pushLog(room, `${actor.name} không có công trình phải bảo trì.`, 'neutral');
        advanceRoomTurn(room);
      } else {
        pushLog(
          room,
          `${actor.name} trả ${formatMoney(fee)} phí bảo trì (${totalBuildings} công trình).`,
          'warn'
        );
        chargeRoomPlayer(room, playerId, fee, null, card.title);
      }
      break;
    }
    case 'STORM': {
      const oppBuilt = Object.entries(room.game.ownership).filter(
        ([, prop]) => prop.ownerId !== playerId && prop.level > 0 && prop.level < 4
      );
      if (oppBuilt.length === 0) {
        pushLog(
          room,
          'Thiên tai đi qua nhưng không có nhà đối thủ bị ảnh hưởng.',
          'neutral'
        );
        advanceRoomTurn(room);
      } else {
        const [tileStr, prop] =
          oppBuilt[Math.floor(Math.random() * oppBuilt.length)];
        const tid = Number(tileStr);
        const targetTile = getTileById(tid);
        room.game.ownership = {
          ...room.game.ownership,
          [tid]: { ...prop, level: (prop.level - 1) as 0 | 1 | 2 | 3 },
        };
        pushLog(
          room,
          `Bão làm ${targetTile.name} bị hạ xuống cấp ${prop.level - 1} nhà!`,
          'warn'
        );
        advanceRoomTurn(room);
      }
      break;
    }
    case 'MOVE_TO': {
      const targetId = card.targetTileId ?? 0;
      const totalTiles = BOARD_TILES.length;
      const steps =
        (targetId - actor.position + totalTiles) % totalTiles || totalTiles;
      const landed = moveRoomPlayerSteps(
        room,
        playerId,
        steps,
        card.collectStart ?? true
      );
      resolveRoomTileLanding(room, playerId, landed);
      break;
    }
  }
}

function resolveRoomTileLanding(
  room: InternalRoom,
  playerId: number,
  tileId: number
) {
  if (!room.game) return;
  const tile = getTileById(tileId);
  const actor = room.game.players.find((p) => p.id === playerId);
  if (!actor || actor.bankrupt) return;

  room.game.turnStep = 'RESOLVING';

  if (tile.type === 'START') {
    pushLog(room, `${actor.name} dừng tại ô BẮT ĐẦU.`, 'neutral');
    advanceRoomTurn(room);
    return;
  }

  if (tile.type === 'LOST_ISLAND') {
    room.extraTurn = false;
    room.game.players = room.game.players.map((p) =>
      p.id === playerId
        ? {
            ...p,
            inJail: true,
            jailTurns: 0,
            doublesStreak: 0,
            worldTourReady: false,
          }
        : p
    );
    if (room.playerMeta[playerId]) {
      room.playerMeta[playerId].doublesStreak = 0;
    }
    pushLog(room, `${actor.name} bị lạc vào Đảo Hoang!`, 'warn');
    advanceRoomTurn(room);
    return;
  }

  if (tile.type === 'WORLD_TOUR') {
    room.game.players = room.game.players.map((p) =>
      p.id === playerId ? { ...p, worldTourReady: true } : p
    );
    pushLog(
      room,
      `${actor.name} đến sân bay DU LỊCH — lượt sau có thể bay đến bất kỳ ô nào!`,
      'good'
    );
    advanceRoomTurn(room);
    return;
  }

  if (tile.type === 'FESTIVAL') {
    const owned = getPlayerOwnedTiles(playerId, room.game.ownership);
    if (owned.length === 0) {
      pushLog(
        room,
        `${actor.name} ghé ô LỄ HỘI nhưng chưa sở hữu tỉnh thành nào.`,
        'neutral'
      );
      advanceRoomTurn(room);
      return;
    }

    if (actor.isAI) {
      const targetId = chooseAIFestivalTile(playerId, room.game.ownership);
      if (targetId !== null) {
        const targetTile = getTileById(targetId);
        const nextOwn = { ...room.game.ownership };
        for (const [k, v] of Object.entries(nextOwn)) {
          if (v.ownerId === playerId && v.hasFestival) {
            nextOwn[Number(k)] = { ...v, hasFestival: false };
          }
        }
        nextOwn[targetId] = { ...nextOwn[targetId], hasFestival: true };
        room.game.ownership = nextOwn;
        pushLog(
          room,
          `${actor.name} tổ chức Lễ Hội x2 tiền thuê tại ${targetTile.name}!`,
          'good'
        );
      }
      advanceRoomTurn(room);
      return;
    }

    room.game.turnStep = 'SELECT_FESTIVAL';
    broadcastRoom(room);
    scheduleDisconnectFallbackIfNeeded(room);
    return;
  }

  if (tile.type === 'TAX') {
    const taxDue = tile.taxPercent
      ? Math.max(200, Math.round((actor.cash * tile.taxPercent) / 100))
      : tile.taxAmount ?? 500;
    pushLog(
      room,
      `${actor.name} dừng tại ${tile.name}, cần đóng ${formatMoney(taxDue)}.`,
      'warn'
    );
    chargeRoomPlayer(room, playerId, taxDue, null, `Đóng ${tile.name}`);
    return;
  }

  if (tile.type === 'CHANCE') {
    const card = CHANCE_CARDS[Math.floor(Math.random() * CHANCE_CARDS.length)];
    pushChanceEvent(room, playerId, card);
    if (actor.isAI) {
      pushLog(room, `${actor.name} rút Thẻ Cơ Hội: ${card.title}.`, 'neutral');
      applyRoomChanceCard(room, playerId, card);
      return;
    }
    room.game.pendingModal = {
      forPlayerId: playerId,
      modal: { type: 'CHANCE_CARD', card },
    };
    broadcastRoom(room);
    scheduleDisconnectFallbackIfNeeded(room);
    return;
  }

  // PROPERTY / RESORT
  const prop = room.game.ownership[tile.id];

  if (!prop) {
    if (actor.cash < (tile.price ?? 0)) {
      pushLog(
        room,
        `${actor.name} dừng tại ${tile.name} nhưng không đủ tiền mua.`,
        'neutral'
      );
      advanceRoomTurn(room);
      return;
    }

    if (actor.isAI) {
      const level = chooseAILevelToBuy(actor, tile, -1);
      if (level !== null) {
        const effectiveLevel = tile.type === 'RESORT' ? 0 : level;
        const cost = (tile.price ?? 0) + effectiveLevel * (tile.houseCost ?? 0);
        room.game.players = room.game.players.map((p) =>
          p.id === playerId ? { ...p, cash: p.cash - cost } : p
        );
        pushTransfer(room, playerId, 'BANK', cost, `Mua ${tile.name}`);
        room.game.ownership = {
          ...room.game.ownership,
          [tile.id]: {
            ownerId: playerId,
            level: effectiveLevel,
            hasFestival: false,
          },
        };
        pushLog(
          room,
          `${actor.name} mua ${tile.name}${
            effectiveLevel > 0 ? ` (+${effectiveLevel} nhà)` : ''
          } với giá ${formatMoney(cost)}.`,
          'good'
        );
      }
      advanceRoomTurn(room);
      return;
    }

    room.game.pendingModal = {
      forPlayerId: playerId,
      modal: { type: 'BUY_PROPERTY', tileId: tile.id },
    };
    broadcastRoom(room);
    scheduleDisconnectFallbackIfNeeded(room);
    return;
  }

  if (prop.ownerId === playerId) {
    if (tile.type === 'RESORT' || prop.level >= 4) {
      pushLog(room, `${actor.name} ghé thăm ${tile.name} của chính mình.`, 'neutral');
      advanceRoomTurn(room);
      return;
    }

    if (actor.isAI) {
      const nextLvl = chooseAILevelToBuy(actor, tile, prop.level);
      if (nextLvl !== null && nextLvl > prop.level) {
        const cost = (nextLvl - prop.level) * (tile.houseCost ?? 0);
        room.game.players = room.game.players.map((p) =>
          p.id === playerId ? { ...p, cash: p.cash - cost } : p
        );
        pushTransfer(room, playerId, 'BANK', cost, `Nâng cấp ${tile.name}`);
        room.game.ownership = {
          ...room.game.ownership,
          [tile.id]: { ...prop, level: nextLvl },
        };
        pushLog(
          room,
          `${actor.name} nâng cấp ${tile.name} lên ${
            nextLvl === 4 ? 'Khách Sạn 5★' : `${nextLvl} nhà`
          }.`,
          'good'
        );
      }
      advanceRoomTurn(room);
      return;
    }

    room.game.pendingModal = {
      forPlayerId: playerId,
      modal: { type: 'UPGRADE_PROPERTY', tileId: tile.id },
    };
    broadcastRoom(room);
    scheduleDisconnectFallbackIfNeeded(room);
    return;
  }

  // Opponent property
  const owner = room.game.players.find((p) => p.id === prop.ownerId);
  const rent = calculateRent(tile, room.game.ownership);
  pushLog(
    room,
    `${actor.name} vào đất ${tile.name} của ${owner?.name}, trả thuê ${formatMoney(rent)}.`,
    'bad'
  );

  chargeRoomPlayer(
    room,
    playerId,
    rent,
    prop.ownerId,
    `Tiền thuê ${tile.name}`,
    () => handleRoomRentBuyout(room, playerId, tile.id),
    { kind: 'RENT_BUYOUT', playerId, tileId: tile.id }
  );
}

function handleRoomRentBuyout(
  room: InternalRoom,
  playerId: number,
  tileId: number
) {
  if (!room.game) return;
  const tile = getTileById(tileId);
  const payerAfter = room.game.players.find((p) => p.id === playerId);
  const latestProp = room.game.ownership[tileId];
  const canBuyout =
    payerAfter &&
    !payerAfter.bankrupt &&
    latestProp &&
    latestProp.ownerId !== playerId &&
    tile.type === 'PROPERTY' &&
    latestProp.level < 4;

  if (!canBuyout) {
    advanceRoomTurn(room);
    return;
  }

  const buyoutPrice = calculateBuyoutPrice(tile, latestProp);
  if (payerAfter.cash < buyoutPrice) {
    advanceRoomTurn(room);
    return;
  }

  if (payerAfter.isAI) {
    if (shouldAIBuyout(payerAfter, tile, room.game.ownership, buyoutPrice)) {
      room.game.players = room.game.players.map((p) => {
        if (p.id === playerId) return { ...p, cash: p.cash - buyoutPrice };
        if (p.id === latestProp.ownerId)
          return { ...p, cash: p.cash + buyoutPrice };
        return p;
      });
      pushTransfer(
        room,
        playerId,
        latestProp.ownerId,
        buyoutPrice,
        `Thâu tóm ${tile.name}`
      );
      room.game.ownership = {
        ...room.game.ownership,
        [tileId]: { ...latestProp, ownerId: playerId },
      };
      pushLog(
        room,
        `${payerAfter.name} thâu tóm lại ${tile.name} với giá ${formatMoney(buyoutPrice)}!`,
        'warn'
      );
    }
    advanceRoomTurn(room);
    return;
  }

  room.game.turnStep = 'RESOLVING';
  room.game.pendingModal = {
    forPlayerId: playerId,
    modal: { type: 'BUYOUT_PROPERTY', tileId, buyoutPrice },
  };
  broadcastRoom(room);
  scheduleDisconnectFallbackIfNeeded(room);
}

function executeRoomDiceRoll(
  room: InternalRoom,
  playerId: number,
  isJailAttempt = false
) {
  if (!room.game) return;
  const actor = room.game.players.find((p) => p.id === playerId);
  if (!actor || actor.bankrupt) return;

  if (actor.worldTourReady && !isJailAttempt) {
    if (actor.isAI) {
      const destId = chooseAIWorldTourTile(actor, room.game.ownership);
      const destTile = getTileById(destId);
      pushLog(
        room,
        `${actor.name} bay thẳng từ Du Lịch tới ${destTile.name}!`,
        'good'
      );
      room.game.players = room.game.players.map((p) =>
        p.id === playerId ? { ...p, worldTourReady: false } : p
      );
      const total = BOARD_TILES.length;
      const steps = (destId - actor.position + total) % total || total;
      const landed = moveRoomPlayerSteps(room, playerId, steps, true);
      resolveRoomTileLanding(room, playerId, landed);
    } else {
      room.game.turnStep = 'SELECT_WORLD_TOUR';
      broadcastRoom(room);
      scheduleDisconnectFallbackIfNeeded(room);
    }
    return;
  }

  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  room.game.dice = [d1, d2];
  const isDoubles = d1 === d2;
  const totalSteps = d1 + d2;

  if (actor.inJail) {
    if (isDoubles) {
      pushLog(
        room,
        `${actor.name} tung ra Đôi ${d1}+${d2} và thoát khỏi Đảo Hoang!`,
        'good'
      );
      room.game.players = room.game.players.map((p) =>
        p.id === playerId
          ? { ...p, inJail: false, jailTurns: 0, doublesStreak: 0 }
          : p
      );
      if (room.playerMeta[playerId]) {
        room.playerMeta[playerId].doublesStreak = 0;
      }
      room.extraTurn = false;
      const landed = moveRoomPlayerSteps(room, playerId, totalSteps, true);
      resolveRoomTileLanding(room, playerId, landed);
      return;
    }

    const newTurns = actor.jailTurns + 1;
    if (newTurns >= 3) {
      pushLog(
        room,
        `${actor.name} hết 3 lượt ở Đảo Hoang, buộc phải trả ${formatMoney(JAIL_BAIL)} để rời đảo.`,
        'warn'
      );
      room.game.players = room.game.players.map((p) =>
        p.id === playerId
          ? { ...p, inJail: false, jailTurns: 0, doublesStreak: 0 }
          : p
      );
      if (room.playerMeta[playerId]) {
        room.playerMeta[playerId].doublesStreak = 0;
      }
      room.extraTurn = false;
      chargeRoomPlayer(
        room,
        playerId,
        JAIL_BAIL,
        null,
        'Phí rời Đảo Hoang',
        () => {
          const landed = moveRoomPlayerSteps(room, playerId, totalSteps, true);
          resolveRoomTileLanding(room, playerId, landed);
        },
        { kind: 'JAIL_BAIL_MOVE', playerId, steps: totalSteps }
      );
    } else {
      room.game.players = room.game.players.map((p) =>
        p.id === playerId ? { ...p, jailTurns: newTurns } : p
      );
      pushLog(
        room,
        `${actor.name} tung ${d1}+${d2} (không ra Đôi), tiếp tục ở lại Đảo Hoang (${newTurns}/3).`,
        'neutral'
      );
      advanceRoomTurn(room);
    }
    return;
  }

  if (isDoubles) {
    const streak = (room.playerMeta[playerId]?.doublesStreak ?? 0) + 1;
    if (streak >= 3) {
      room.extraTurn = false;
      room.game.players = room.game.players.map((p) =>
        p.id === playerId
          ? {
              ...p,
              position: 8,
              inJail: true,
              jailTurns: 0,
              doublesStreak: 0,
              worldTourReady: false,
            }
          : p
      );
      if (room.playerMeta[playerId]) {
        room.playerMeta[playerId].doublesStreak = 0;
      }
      pushLog(
        room,
        `${actor.name} tung Đôi 3 lần liên tiếp! Bị đưa thẳng ra Đảo Hoang.`,
        'bad'
      );
      advanceRoomTurn(room);
      return;
    }
    room.extraTurn = true;
    if (room.playerMeta[playerId]) {
      room.playerMeta[playerId].doublesStreak = streak;
    }
    room.game.players = room.game.players.map((p) =>
      p.id === playerId ? { ...p, doublesStreak: streak } : p
    );
  } else {
    room.extraTurn = false;
    if (room.playerMeta[playerId]) {
      room.playerMeta[playerId].doublesStreak = 0;
    }
    room.game.players = room.game.players.map((p) =>
      p.id === playerId ? { ...p, doublesStreak: 0 } : p
    );
  }

  pushLog(
    room,
    `${actor.name} tung được ${d1} + ${d2} = ${totalSteps}${
      isDoubles ? ' (Đôi!)' : ''
    }.`,
    'neutral'
  );

  const landed = moveRoomPlayerSteps(room, playerId, totalSteps, true);
  resolveRoomTileLanding(room, playerId, landed);
}

function scheduleAITurnIfNeeded(room: InternalRoom) {
  clearAiTimer(room);
  if (room.status !== 'PLAYING' || !room.game) return;
  if (room.game.turnStep !== 'WAIT_ROLL' || room.game.pendingModal) return;

  const actor = room.game.players[room.game.currentPlayerIndex];
  if (!actor || !actor.isAI || actor.bankrupt) return;

  room.aiTimer = setTimeout(() => {
    if (room.status !== 'PLAYING' || !room.game) return;
    if (room.game.turnStep !== 'WAIT_ROLL' || room.game.pendingModal) return;
    const current = room.game.players[room.game.currentPlayerIndex];
    if (!current || !current.isAI || current.bankrupt) return;

    if (current.inJail) {
      if (current.escapeCards > 0) {
        room.game.players = room.game.players.map((p) =>
          p.id === current.id
            ? {
                ...p,
                inJail: false,
                jailTurns: 0,
                escapeCards: p.escapeCards - 1,
              }
            : p
        );
        pushLog(room, `${current.name} dùng Thẻ Thoát Đảo miễn phí.`, 'good');
        executeRoomDiceRoll(room, current.id, false);
        return;
      }
      if (current.cash >= JAIL_BAIL + 1000) {
        room.game.players = room.game.players.map((p) =>
          p.id === current.id
            ? { ...p, inJail: false, jailTurns: 0, cash: p.cash - JAIL_BAIL }
            : p
        );
        pushTransfer(room, current.id, 'BANK', JAIL_BAIL, 'Phí rời Đảo Hoang');
        pushLog(
          room,
          `${current.name} trả ${formatMoney(JAIL_BAIL)} rời Đảo Hoang.`,
          'warn'
        );
        executeRoomDiceRoll(room, current.id, false);
        return;
      }
      executeRoomDiceRoll(room, current.id, true);
      return;
    }

    executeRoomDiceRoll(room, current.id, false);
  }, 950);
}

function convertRoomPlayerToAI(
  room: InternalRoom,
  playerId: number,
  reasonLabel: string
) {
  if (room.status !== 'PLAYING' || !room.game) return;
  const meta = room.playerMeta[playerId];
  const slot = meta ? room.slots[meta.slotIndex] : undefined;
  const targetPlayer = room.game.players.find((p) => p.id === playerId);
  if (!targetPlayer || targetPlayer.isAI || targetPlayer.bankrupt) return;

  if (slot) {
    slot.kind = 'AI';
    slot.clientId = null;
    slot.connected = true;
  }
  if (meta) {
    meta.clientId = null;
  }

  const aiName = targetPlayer.name.endsWith('(AI)')
    ? targetPlayer.name
    : `${targetPlayer.name} (AI)`;
  if (slot) slot.name = aiName;

  room.game.players = room.game.players.map((p) =>
    p.id === playerId ? { ...p, isAI: true, name: aiName } : p
  );
  pushLog(room, `${targetPlayer.name} ${reasonLabel} — Máy AI tiếp quản.`, 'warn');

  const current = room.game.players[room.game.currentPlayerIndex];
  if (!current || current.id !== playerId) {
    broadcastRoom(room);
    return;
  }

  // If this player is blocking a modal or special selection, resolve as AI immediately
  const pending = room.game.pendingModal;
  if (pending && pending.forPlayerId === playerId) {
    const modal = pending.modal;
    room.game.pendingModal = null;
    if (modal?.type === 'CHANCE_CARD') {
      applyRoomChanceCard(room, playerId, modal.card);
      return;
    }
    if (modal?.type === 'JAIL_OPTIONS') {
      scheduleAITurnIfNeeded(room);
      broadcastRoom(room);
      return;
    }
    if (modal?.type === 'BUY_PROPERTY') {
      const tile = getTileById(modal.tileId);
      const lvl = chooseAILevelToBuy(current, tile, -1);
      if (lvl !== null) {
        const effectiveLevel = tile.type === 'RESORT' ? 0 : lvl;
        const cost = (tile.price ?? 0) + effectiveLevel * (tile.houseCost ?? 0);
        if (current.cash >= cost) {
          room.game.players = room.game.players.map((p) =>
            p.id === playerId ? { ...p, cash: p.cash - cost } : p
          );
          pushTransfer(room, playerId, 'BANK', cost, `Mua ${tile.name}`);
          room.game.ownership = {
            ...room.game.ownership,
            [tile.id]: {
              ownerId: playerId,
              level: effectiveLevel,
              hasFestival: false,
            },
          };
          pushLog(room, `${aiName} mua ${tile.name} giá ${formatMoney(cost)}.`, 'good');
        }
      }
      advanceRoomTurn(room);
      return;
    }
    if (modal?.type === 'UPGRADE_PROPERTY') {
      const tile = getTileById(modal.tileId);
      const prop = room.game.ownership[tile.id];
      if (prop && prop.ownerId === playerId) {
        const nextLvl = chooseAILevelToBuy(current, tile, prop.level);
        if (nextLvl !== null && nextLvl > prop.level) {
          const cost = (nextLvl - prop.level) * (tile.houseCost ?? 0);
          if (current.cash >= cost) {
            room.game.players = room.game.players.map((p) =>
              p.id === playerId ? { ...p, cash: p.cash - cost } : p
            );
            pushTransfer(room, playerId, 'BANK', cost, `Nâng cấp ${tile.name}`);
            room.game.ownership = {
              ...room.game.ownership,
              [tile.id]: { ...prop, level: nextLvl },
            };
          }
        }
      }
      advanceRoomTurn(room);
      return;
    }
    if (modal?.type === 'BUYOUT_PROPERTY') {
      const tile = getTileById(modal.tileId);
      const prop = room.game.ownership[tile.id];
      if (
        prop &&
        prop.ownerId !== playerId &&
        current.cash >= modal.buyoutPrice &&
        shouldAIBuyout(current, tile, room.game.ownership, modal.buyoutPrice)
      ) {
        room.game.players = room.game.players.map((p) => {
          if (p.id === playerId) return { ...p, cash: p.cash - modal.buyoutPrice };
          if (p.id === prop.ownerId)
            return { ...p, cash: p.cash + modal.buyoutPrice };
          return p;
        });
        pushTransfer(
          room,
          playerId,
          prop.ownerId,
          modal.buyoutPrice,
          `Thâu tóm ${tile.name}`
        );
        room.game.ownership = {
          ...room.game.ownership,
          [tile.id]: { ...prop, ownerId: playerId },
        };
      }
      advanceRoomTurn(room);
      return;
    }
    if (modal?.type === 'LIQUIDATE') {
      const pendingAction = room.pendingAfterPaid;
      room.pendingAfterPaid = null;
      chargeRoomPlayer(
        room,
        playerId,
        modal.amountOwed,
        modal.creditorId,
        modal.reason,
        () => {
          if (pendingAction?.kind === 'JAIL_BAIL_MOVE') {
            const landed = moveRoomPlayerSteps(
              room,
              pendingAction.playerId,
              pendingAction.steps,
              true
            );
            resolveRoomTileLanding(room, pendingAction.playerId, landed);
          } else if (pendingAction?.kind === 'RENT_BUYOUT') {
            handleRoomRentBuyout(
              room,
              pendingAction.playerId,
              pendingAction.tileId
            );
          } else {
            advanceRoomTurn(room);
          }
        },
        pendingAction
      );
      return;
    }
  }

  if (room.game.turnStep === 'SELECT_FESTIVAL') {
    const targetId = chooseAIFestivalTile(playerId, room.game.ownership);
    if (targetId !== null) {
      const targetTile = getTileById(targetId);
      const nextOwn = { ...room.game.ownership };
      for (const [k, v] of Object.entries(nextOwn)) {
        if (v.ownerId === playerId && v.hasFestival) {
          nextOwn[Number(k)] = { ...v, hasFestival: false };
        }
      }
      nextOwn[targetId] = { ...nextOwn[targetId], hasFestival: true };
      room.game.ownership = nextOwn;
      pushLog(
        room,
        `${aiName} tổ chức Lễ Hội x2 tiền thuê tại ${targetTile.name}!`,
        'good'
      );
    }
    advanceRoomTurn(room);
    return;
  }

  if (room.game.turnStep === 'SELECT_WORLD_TOUR') {
    const destId = chooseAIWorldTourTile(current, room.game.ownership);
    const destTile = getTileById(destId);
    pushLog(room, `${aiName} bay thẳng từ Du Lịch tới ${destTile.name}!`, 'good');
    room.game.players = room.game.players.map((p) =>
      p.id === playerId ? { ...p, worldTourReady: false } : p
    );
    const total = BOARD_TILES.length;
    const steps = (destId - current.position + total) % total || total;
    const landed = moveRoomPlayerSteps(room, playerId, steps, true);
    resolveRoomTileLanding(room, playerId, landed);
    return;
  }

  scheduleAITurnIfNeeded(room);
  broadcastRoom(room);
}

function scheduleDisconnectFallbackIfNeeded(room: InternalRoom) {
  clearDisconnectTimer(room);
  if (room.status !== 'PLAYING' || !room.game) return;
  const current = room.game.players[room.game.currentPlayerIndex];
  if (!current || current.isAI || current.bankrupt) return;

  const meta = room.playerMeta[current.id];
  const slot = meta ? room.slots[meta.slotIndex] : undefined;
  if (!slot || slot.connected) return;

  const blockedPlayerId = current.id;
  room.disconnectTimer = setTimeout(() => {
    if (room.status !== 'PLAYING' || !room.game) return;
    const curNow = room.game.players[room.game.currentPlayerIndex];
    const metaNow = room.playerMeta[blockedPlayerId];
    const slotNow = metaNow ? room.slots[metaNow.slotIndex] : undefined;
    if (
      !curNow ||
      curNow.id !== blockedPlayerId ||
      curNow.isAI ||
      curNow.bankrupt ||
      !slotNow ||
      slotNow.connected
    ) {
      return;
    }
    convertRoomPlayerToAI(room, blockedPlayerId, 'mất kết nối quá lâu');
  }, 25000);
}

function startRoomMatch(room: InternalRoom) {
  clearAiTimer(room);
  clearDisconnectTimer(room);
  const activeSlots = room.slots.filter((s) => s.kind !== 'OPEN');
  if (activeSlots.length < 2) return;

  const players: Player[] = activeSlots.map((slot, idx) => {
    const char = getCharacterById(slot.characterId);
    return {
      id: idx,
      name: slot.name,
      isAI: slot.kind === 'AI',
      characterId: char.id,
      avatar: char.avatar,
      color: slot.color,
      cash: room.startingCash,
      position: 0,
      inJail: false,
      jailTurns: 0,
      escapeCards: 0,
      worldTourReady: false,
      doublesStreak: 0,
      bankrupt: false,
    };
  });

  const playerMeta: Record<number, InternalPlayerMeta> = {};
  activeSlots.forEach((slot, idx) => {
    playerMeta[idx] = {
      slotIndex: slot.slotIndex,
      clientId: slot.clientId,
      doublesStreak: 0,
    };
  });

  room.playerMeta = playerMeta;
  room.extraTurn = false;
  room.pendingAfterPaid = null;
  room.moveSeq = 0;
  room.transferSeq = 0;
  room.chanceSeq = 0;
  room.status = 'PLAYING';
  room.game = {
    players,
    ownership: {},
    currentPlayerIndex: 0,
    turnStep: 'WAIT_ROLL',
    dice: [1, 6],
    lastMove: null,
    pendingModal: null,
    logs: [
      {
        id: 'init',
        text: `Phòng ${room.code} bắt đầu với ${players.length} người chơi (${formatMoney(
          room.startingCash
        )}/người).`,
        tone: 'good',
      },
    ],
    victory: null,
    recentTransfers: [],
    lastChanceEvent: null,
  };

  broadcastRoom(room);
  scheduleAITurnIfNeeded(room);
}

function handleGameAction(
  room: InternalRoom,
  clientId: string,
  action: GameActionPayload
) {
  if (room.status !== 'PLAYING' || !room.game) return;
  const current = room.game.players[room.game.currentPlayerIndex];
  if (!current || current.bankrupt) return;

  const meta = room.playerMeta[current.id];
  if (!meta || meta.clientId !== clientId || current.isAI) return;

  switch (action.kind) {
    case 'ROLL_DICE': {
      if (room.game.turnStep !== 'WAIT_ROLL' || room.game.pendingModal) return;
      if (current.inJail) {
        room.game.pendingModal = {
          forPlayerId: current.id,
          modal: { type: 'JAIL_OPTIONS' },
        };
        broadcastRoom(room);
        scheduleDisconnectFallbackIfNeeded(room);
        return;
      }
      executeRoomDiceRoll(room, current.id, false);
      break;
    }

    case 'BUY_PROPERTY': {
      if (
        room.game.pendingModal?.forPlayerId !== current.id ||
        room.game.pendingModal.modal?.type !== 'BUY_PROPERTY'
      ) {
        return;
      }
      const tileId = room.game.pendingModal.modal.tileId;
      if (action.tileId !== tileId || room.game.ownership[tileId]) return;
      const tile = getTileById(tileId);
      const effectiveLevel: 0 | 1 | 2 | 3 =
        tile.type === 'RESORT'
          ? 0
          : ([0, 1, 2, 3].includes(action.targetLevel) ? action.targetLevel : 0);
      const cost = (tile.price ?? 0) + effectiveLevel * (tile.houseCost ?? 0);
      if (current.cash < cost) return;

      room.game.players = room.game.players.map((p) =>
        p.id === current.id ? { ...p, cash: p.cash - cost } : p
      );
      pushTransfer(room, current.id, 'BANK', cost, `Mua ${tile.name}`);
      room.game.ownership = {
        ...room.game.ownership,
        [tileId]: {
          ownerId: current.id,
          level: effectiveLevel,
          hasFestival: false,
        },
      };
      pushLog(
        room,
        `${current.name} mua ${tile.name}${
          effectiveLevel > 0 ? ` (+${effectiveLevel} nhà)` : ''
        } giá ${formatMoney(cost)}.`,
        'good'
      );
      advanceRoomTurn(room);
      break;
    }

    case 'UPGRADE_PROPERTY': {
      if (
        room.game.pendingModal?.forPlayerId !== current.id ||
        room.game.pendingModal.modal?.type !== 'UPGRADE_PROPERTY'
      ) {
        return;
      }
      const tileId = room.game.pendingModal.modal.tileId;
      const prop = room.game.ownership[tileId];
      if (!prop || prop.ownerId !== current.id) return;
      if (
        ![1, 2, 3, 4].includes(action.targetLevel) ||
        action.targetLevel <= prop.level
      ) {
        return;
      }
      const tile = getTileById(tileId);
      const cost = (action.targetLevel - prop.level) * (tile.houseCost ?? 0);
      if (current.cash < cost) return;

      room.game.players = room.game.players.map((p) =>
        p.id === current.id ? { ...p, cash: p.cash - cost } : p
      );
      pushTransfer(room, current.id, 'BANK', cost, `Nâng cấp ${tile.name}`);
      room.game.ownership = {
        ...room.game.ownership,
        [tileId]: { ...prop, level: action.targetLevel },
      };
      pushLog(
        room,
        `${current.name} nâng cấp ${tile.name} lên ${
          action.targetLevel === 4 ? 'Khách Sạn 5★' : `${action.targetLevel} nhà`
        }.`,
        'good'
      );
      advanceRoomTurn(room);
      break;
    }

    case 'BUYOUT_PROPERTY': {
      if (
        room.game.pendingModal?.forPlayerId !== current.id ||
        room.game.pendingModal.modal?.type !== 'BUYOUT_PROPERTY'
      ) {
        return;
      }
      const { tileId, buyoutPrice } = room.game.pendingModal.modal;
      const prop = room.game.ownership[tileId];
      if (!prop || current.cash < buyoutPrice) return;
      const tile = getTileById(tileId);

      room.game.players = room.game.players.map((p) => {
        if (p.id === current.id) return { ...p, cash: p.cash - buyoutPrice };
        if (p.id === prop.ownerId) return { ...p, cash: p.cash + buyoutPrice };
        return p;
      });
      pushTransfer(
        room,
        current.id,
        prop.ownerId,
        buyoutPrice,
        `Thâu tóm ${tile.name}`
      );
      room.game.ownership = {
        ...room.game.ownership,
        [tileId]: { ...prop, ownerId: current.id },
      };
      pushLog(
        room,
        `${current.name} thâu tóm ${tile.name} với giá ${formatMoney(buyoutPrice)}!`,
        'warn'
      );
      advanceRoomTurn(room);
      break;
    }

    case 'SKIP_BUY': {
      if (room.game.pendingModal?.forPlayerId !== current.id) return;
      advanceRoomTurn(room);
      break;
    }

    case 'CONFIRM_CHANCE': {
      if (
        room.game.pendingModal?.forPlayerId !== current.id ||
        room.game.pendingModal.modal?.type !== 'CHANCE_CARD'
      ) {
        return;
      }
      const card = room.game.pendingModal.modal.card;
      room.game.pendingModal = null;
      applyRoomChanceCard(room, current.id, card);
      break;
    }

    case 'JAIL_PAY_BAIL': {
      if (
        room.game.pendingModal?.forPlayerId !== current.id ||
        room.game.pendingModal.modal?.type !== 'JAIL_OPTIONS' ||
        current.cash < JAIL_BAIL
      ) {
        return;
      }
      room.game.players = room.game.players.map((p) =>
        p.id === current.id
          ? { ...p, inJail: false, jailTurns: 0, cash: p.cash - JAIL_BAIL }
          : p
      );
      pushTransfer(room, current.id, 'BANK', JAIL_BAIL, 'Phí rời Đảo Hoang');
      room.game.pendingModal = null;
      pushLog(
        room,
        `${current.name} trả ${formatMoney(JAIL_BAIL)} rời Đảo Hoang.`,
        'warn'
      );
      executeRoomDiceRoll(room, current.id, false);
      break;
    }

    case 'JAIL_USE_CARD': {
      if (
        room.game.pendingModal?.forPlayerId !== current.id ||
        room.game.pendingModal.modal?.type !== 'JAIL_OPTIONS' ||
        current.escapeCards <= 0
      ) {
        return;
      }
      room.game.players = room.game.players.map((p) =>
        p.id === current.id
          ? {
              ...p,
              inJail: false,
              jailTurns: 0,
              escapeCards: p.escapeCards - 1,
            }
          : p
      );
      room.game.pendingModal = null;
      pushLog(room, `${current.name} dùng Thẻ Thoát Đảo miễn phí.`, 'good');
      executeRoomDiceRoll(room, current.id, false);
      break;
    }

    case 'JAIL_ROLL_DOUBLES': {
      if (
        room.game.pendingModal?.forPlayerId !== current.id ||
        room.game.pendingModal.modal?.type !== 'JAIL_OPTIONS'
      ) {
        return;
      }
      room.game.pendingModal = null;
      executeRoomDiceRoll(room, current.id, true);
      break;
    }

    case 'SELECT_FESTIVAL_TILE': {
      if (room.game.turnStep !== 'SELECT_FESTIVAL') return;
      const prop = room.game.ownership[action.tileId];
      if (!prop || prop.ownerId !== current.id) return;
      const tile = getTileById(action.tileId);
      const nextOwn = { ...room.game.ownership };
      for (const [k, v] of Object.entries(nextOwn)) {
        if (v.ownerId === current.id && v.hasFestival) {
          nextOwn[Number(k)] = { ...v, hasFestival: false };
        }
      }
      nextOwn[action.tileId] = { ...nextOwn[action.tileId], hasFestival: true };
      room.game.ownership = nextOwn;
      pushLog(
        room,
        `${current.name} tổ chức Lễ Hội x2 tiền thuê tại ${tile.name}!`,
        'good'
      );
      advanceRoomTurn(room);
      break;
    }

    case 'SELECT_WORLD_TOUR_TILE': {
      if (room.game.turnStep !== 'SELECT_WORLD_TOUR') return;
      if (
        typeof action.tileId !== 'number' ||
        action.tileId < 0 ||
        action.tileId >= BOARD_TILES.length ||
        action.tileId === 24
      ) {
        return;
      }
      const tile = getTileById(action.tileId);
      room.game.players = room.game.players.map((p) =>
        p.id === current.id ? { ...p, worldTourReady: false } : p
      );
      pushLog(room, `${current.name} bay thẳng tới ${tile.name}!`, 'good');
      const total = BOARD_TILES.length;
      const steps =
        (action.tileId - current.position + total) % total || total;
      const landed = moveRoomPlayerSteps(room, current.id, steps, true);
      resolveRoomTileLanding(room, current.id, landed);
      break;
    }

    case 'SELL_PROPERTY_DEBT': {
      if (
        room.game.pendingModal?.forPlayerId !== current.id ||
        room.game.pendingModal.modal?.type !== 'LIQUIDATE'
      ) {
        return;
      }
      const prop = room.game.ownership[action.tileId];
      if (!prop || prop.ownerId !== current.id) return;
      const tile = getTileById(action.tileId);
      const sellValue = calculateSellValue(tile, prop);

      room.game.players = room.game.players.map((p) =>
        p.id === current.id ? { ...p, cash: p.cash + sellValue } : p
      );
      pushTransfer(room, 'BANK', current.id, sellValue, `Bán ${tile.name}`);
      const nextOwn = { ...room.game.ownership };
      delete nextOwn[action.tileId];
      room.game.ownership = nextOwn;
      pushLog(
        room,
        `${current.name} bán ${tile.name} thu về ${formatMoney(sellValue)}.`,
        'warn'
      );
      broadcastRoom(room);
      break;
    }

    case 'SETTLE_DEBT': {
      if (
        room.game.pendingModal?.forPlayerId !== current.id ||
        room.game.pendingModal.modal?.type !== 'LIQUIDATE'
      ) {
        return;
      }
      const { amountOwed, creditorId, reason } = room.game.pendingModal.modal;
      if (current.cash < amountOwed) return;
      room.game.players = room.game.players.map((p) => {
        if (p.id === current.id) return { ...p, cash: p.cash - amountOwed };
        if (creditorId !== null && p.id === creditorId) {
          return { ...p, cash: p.cash + amountOwed };
        }
        return p;
      });
      pushTransfer(room, current.id, creditorId ?? 'BANK', amountOwed, reason);
      room.game.pendingModal = null;

      const pendingAction = room.pendingAfterPaid;
      room.pendingAfterPaid = null;
      if (pendingAction?.kind === 'JAIL_BAIL_MOVE') {
        const landed = moveRoomPlayerSteps(
          room,
          pendingAction.playerId,
          pendingAction.steps,
          true
        );
        resolveRoomTileLanding(room, pendingAction.playerId, landed);
      } else if (pendingAction?.kind === 'RENT_BUYOUT') {
        handleRoomRentBuyout(room, pendingAction.playerId, pendingAction.tileId);
      } else {
        advanceRoomTurn(room);
      }
      break;
    }

    case 'DECLARE_BANKRUPTCY': {
      if (
        room.game.pendingModal?.forPlayerId !== current.id ||
        room.game.pendingModal.modal?.type !== 'LIQUIDATE'
      ) {
        return;
      }
      const { creditorId, reason } = room.game.pendingModal.modal;
      eliminateRoomPlayer(room, current.id, creditorId, reason);
      break;
    }
  }
}



export type EmitFn = (clientId: string, msg: ServerWsMessage) => void;
let emitFn: EmitFn = () => {};
export function setEmitFn(fn: EmitFn) { emitFn = fn; }
const fakeSockets = new Map<string, any>();
function ensureWs(clientId: string): any {
  let ws = fakeSockets.get(clientId);
  if (!ws) {
    ws = { clientId, roomCode: null, readyState: 1, send(raw: string) {
      try { emitFn(clientId, JSON.parse(raw)); } catch { /* ignore */ }
    } };
    fakeSockets.set(clientId, ws);
    socketClientMap.set(ws, { clientId: '', roomCode: null });
  }
  return ws;
}
export function handleBrowserMessage(clientId: string, raw: string) {
  const ws = ensureWs(clientId);
      let msg: ClientWsMessage;
      try {
        msg = JSON.parse(raw.toString()) as ClientWsMessage;
      } catch {
        sendWs(ws, { type: 'ERROR', message: 'Dữ liệu không hợp lệ.' });
        return;
      }

      if (!msg || typeof msg.type !== 'string' || typeof msg.clientId !== 'string' || msg.clientId.length < 4) {
        sendWs(ws, { type: 'ERROR', message: 'Thiếu mã định danh phiên.' });
        return;
      }

      const connInfo = socketClientMap.get(ws);
      if (connInfo) {
        connInfo.clientId = msg.clientId;
      }

      if (msg.type === 'CREATE_ROOM') {
        if (rooms.size >= 200) {
          sendWs(ws, { type: 'ERROR', message: 'Máy chủ đang đầy phòng.' });
          return;
        }
        const code = generateRoomCode();
        const hostName = sanitizeName(msg.playerName, 'Chủ Phòng');
        const charId =
          msg.characterId && ALLOWED_CHAR_IDS.has(msg.characterId)
            ? msg.characterId
            : CHARACTERS[0].id;
        const color =
          msg.color && ALLOWED_COLORS.includes(msg.color) ? msg.color : 'blue';

        const room: InternalRoom = {
          code,
          hostClientId: msg.clientId,
          status: 'WAITING',
          startingCash: 15000,
          slots: [
            {
              slotIndex: 0,
              kind: 'HUMAN',
              clientId: msg.clientId,
              name: hostName,
              characterId: charId,
              color,
              ready: true,
              connected: true,
            },
            {
              slotIndex: 1,
              kind: 'OPEN',
              clientId: null,
              name: 'Ghế trống',
              characterId: CHARACTERS[1].id,
              color: 'red',
              ready: false,
              connected: false,
            },
            {
              slotIndex: 2,
              kind: 'OPEN',
              clientId: null,
              name: 'Ghế trống',
              characterId: CHARACTERS[2].id,
              color: 'emerald',
              ready: false,
              connected: false,
            },
            {
              slotIndex: 3,
              kind: 'OPEN',
              clientId: null,
              name: 'Ghế trống',
              characterId: CHARACTERS[3].id,
              color: 'purple',
              ready: false,
              connected: false,
            },
          ],
          game: null,
          playerMeta: {},
          extraTurn: false,
          pendingAfterPaid: null,
          moveSeq: 0,
          transferSeq: 0,
          chanceSeq: 0,
          aiTimer: null,
          disconnectTimer: null,
          updatedAt: Date.now(),
        };

        rooms.set(code, room);
        if (connInfo) connInfo.roomCode = code;
        broadcastRoom(room);
        return;
      }

      if (msg.type === 'JOIN_ROOM') {
        const cleanCode = String(msg.code || '').trim().toUpperCase();
        if (!/^[A-Z0-9]{4,8}$/.test(cleanCode)) {
          sendWs(ws, { type: 'ERROR', message: 'Mã phòng không hợp lệ.' });
          return;
        }
        const room = rooms.get(cleanCode);
        if (!room) {
          sendWs(ws, { type: 'ERROR', message: `Không tìm thấy phòng ${cleanCode}.` });
          return;
        }

        // Reconnect existing player
        const existing = room.slots.find((s) => s.clientId === msg.clientId);
        if (existing) {
          existing.connected = true;
          clearDisconnectTimer(room);
          if (connInfo) connInfo.roomCode = room.code;
          broadcastRoom(room);
          return;
        }

        if (room.status !== 'WAITING') {
          sendWs(ws, {
            type: 'ERROR',
            message: 'Phòng này đã bắt đầu ván đấu.',
          });
          return;
        }

        const openSlot = room.slots.find((s) => s.kind === 'OPEN');
        if (!openSlot) {
          sendWs(ws, { type: 'ERROR', message: 'Phòng đã đủ 4 người chơi.' });
          return;
        }

        const takenChars = new Set(
          room.slots.filter((s) => s.kind !== 'OPEN').map((s) => s.characterId)
        );
        const freeChar =
          CHARACTERS.find((c) => !takenChars.has(c.id)) ?? CHARACTERS[openSlot.slotIndex];

        openSlot.kind = 'HUMAN';
        openSlot.clientId = msg.clientId;
        openSlot.name = sanitizeName(
          msg.playerName,
          `Bạn ${openSlot.slotIndex + 1}`
        );
        openSlot.characterId = freeChar.id;
        openSlot.ready = true;
        openSlot.connected = true;

        if (connInfo) connInfo.roomCode = room.code;
        broadcastRoom(room);
        return;
      }

      const code = String(msg.code || '').trim().toUpperCase();
      const room = rooms.get(code);
      if (!room) {
        sendWs(ws, { type: 'ERROR', message: 'Phòng không tồn tại.' });
        return;
      }

      if (msg.type === 'LEAVE_ROOM') {
        const slot = room.slots.find((s) => s.clientId === msg.clientId);
        if (slot) {
          if (msg.clientId === room.hostClientId) {
            const nextHuman = room.slots.find(
              (s) =>
                s.kind === 'HUMAN' &&
                s.clientId !== msg.clientId &&
                s.clientId !== null
            );
            if (nextHuman && nextHuman.clientId) {
              room.hostClientId = nextHuman.clientId;
            }
          }

          if (room.status === 'WAITING') {
            slot.kind = 'OPEN';
            slot.clientId = null;
            slot.name = 'Ghế trống';
            slot.ready = false;
            slot.connected = false;
          } else {
            slot.connected = false;
            if (room.status === 'PLAYING' && room.game) {
              const playerEntry = Object.entries(room.playerMeta).find(
                ([, m]) => m.clientId === msg.clientId
              );
              if (playerEntry) {
                const leavingId = Number(playerEntry[0]);
                if (connInfo) connInfo.roomCode = null;
                sendWs(ws, { type: 'ROOM_LEFT' });
                convertRoomPlayerToAI(room, leavingId, 'đã rời phòng');
                return;
              }
            }
          }
        }
        if (connInfo) connInfo.roomCode = null;
        sendWs(ws, { type: 'ROOM_LEFT' });
        broadcastRoom(room);
        return;
      }

      if (msg.type === 'UPDATE_MY_SLOT') {
        if (room.status !== 'WAITING') return;
        const slot = room.slots.find((s) => s.clientId === msg.clientId);
        if (!slot) return;
        if (msg.name !== undefined) slot.name = sanitizeName(msg.name, slot.name);
        if (msg.characterId && ALLOWED_CHAR_IDS.has(msg.characterId)) {
          slot.characterId = msg.characterId;
        }
        if (msg.color && ALLOWED_COLORS.includes(msg.color)) {
          slot.color = msg.color;
        }
        if (typeof msg.ready === 'boolean') slot.ready = msg.ready;
        broadcastRoom(room);
        return;
      }

      if (msg.type === 'SET_SLOT_KIND') {
        if (room.status !== 'WAITING' || room.hostClientId !== msg.clientId) {
          return;
        }
        const slot = room.slots[msg.slotIndex];
        if (!slot || slot.slotIndex === 0) return;

        if (msg.kind === 'AI') {
          const char = CHARACTERS[slot.slotIndex % CHARACTERS.length];
          slot.kind = 'AI';
          slot.clientId = null;
          slot.characterId = char.id;
          slot.name = `${char.name.split(' ').slice(-1)[0]} AI`;
          slot.ready = true;
          slot.connected = true;
        } else {
          slot.kind = 'OPEN';
          slot.clientId = null;
          slot.name = 'Ghế trống';
          slot.ready = false;
          slot.connected = false;
        }
        broadcastRoom(room);
        return;
      }

      if (msg.type === 'FILL_AI_SLOTS') {
        if (room.status !== 'WAITING' || room.hostClientId !== msg.clientId) {
          return;
        }
        const usedChars = new Set(
          room.slots.filter((s) => s.kind !== 'OPEN').map((s) => s.characterId)
        );
        for (const slot of room.slots) {
          if (slot.kind === 'OPEN') {
            const availChar =
              CHARACTERS.find((c) => !usedChars.has(c.id)) ??
              CHARACTERS[slot.slotIndex % CHARACTERS.length];
            usedChars.add(availChar.id);
            slot.kind = 'AI';
            slot.clientId = null;
            slot.characterId = availChar.id;
            slot.name = `${availChar.name.split(' ').slice(-1)[0]} AI`;
            slot.ready = true;
            slot.connected = true;
          }
        }
        broadcastRoom(room);
        return;
      }

      if (msg.type === 'SET_STARTING_CASH') {
        if (room.status !== 'WAITING' || room.hostClientId !== msg.clientId) {
          return;
        }
        if (ALLOWED_STARTING_CASH.has(msg.startingCash)) {
          room.startingCash = msg.startingCash;
          broadcastRoom(room);
        }
        return;
      }

      if (msg.type === 'START_ROOM_GAME') {
        if (room.status !== 'WAITING' || room.hostClientId !== msg.clientId) {
          return;
        }
        const activeCount = room.slots.filter((s) => s.kind !== 'OPEN').length;
        if (activeCount < 2) {
          sendWs(ws, {
            type: 'ERROR',
            message: 'Cần ít nhất 2 người chơi (Bạn bè hoặc AI) để bắt đầu.',
          });
          return;
        }
        startRoomMatch(room);
        return;
      }

      if (msg.type === 'RETURN_TO_WAITING') {
        if (room.hostClientId !== msg.clientId) return;
        clearAiTimer(room);
        clearDisconnectTimer(room);
        room.pendingAfterPaid = null;
        room.status = 'WAITING';
        room.game = null;
        broadcastRoom(room);
        return;
      }

      if (msg.type === 'GAME_ACTION') {
        handleGameAction(room, msg.clientId, msg.action);
      }
}
export function disconnectBrowserClient(clientId: string) {
  const ws = fakeSockets.get(clientId);
  if (!ws) return;
      const info = socketClientMap.get(ws);
      socketClientMap.delete(ws);
      if (info && info.roomCode) {
        const room = rooms.get(info.roomCode);
        if (room) {
          const slot = room.slots.find((s) => s.clientId === info.clientId);
          if (slot) {
            slot.connected = false;
            broadcastRoom(room);
            scheduleDisconnectFallbackIfNeeded(room);
          }
        }
      }
  socketClientMap.delete(ws);
  fakeSockets.delete(clientId);
}
export function getBrowserRoom(code: string) { return rooms.get(code) || null; }
