import {
  BOARD_LINES,
  BOARD_TILES,
  COLOR_GROUP_META,
  MONOPOLY_GROUPS,
  RESORT_RENTS,
} from '../data/boardData.ts';
import {
  BoardTile,
  ColorGroup,
  Player,
  PropertyState,
  VictorySummary,
} from '../types/game.ts';

export function formatMoney(amount: number): string {
  const abs = Math.abs(Math.round(amount));
  const formatted = abs.toLocaleString('vi-VN');
  return `${amount < 0 ? '-' : ''}${formatted}K`;
}

export function getTileById(id: number): BoardTile {
  return BOARD_TILES[id] ?? BOARD_TILES[0];
}

export function playerHasMonopoly(
  playerId: number,
  group: ColorGroup,
  ownership: Record<number, PropertyState>
): boolean {
  if (group === 'resort') return false;
  const meta = COLOR_GROUP_META[group];
  return meta.tileIds.every((id) => ownership[id]?.ownerId === playerId);
}

export function getPlayerMonopolies(
  playerId: number,
  ownership: Record<number, PropertyState>
): ColorGroup[] {
  return MONOPOLY_GROUPS.filter((group) =>
    playerHasMonopoly(playerId, group, ownership)
  );
}

export function getPlayerResortCount(
  playerId: number,
  ownership: Record<number, PropertyState>
): number {
  return COLOR_GROUP_META.resort.tileIds.filter(
    (id) => ownership[id]?.ownerId === playerId
  ).length;
}

export function calculatePropertyValue(
  tile: BoardTile,
  prop: PropertyState
): number {
  const landPrice = tile.price ?? 0;
  const houseCost = tile.houseCost ?? 0;
  return landPrice + prop.level * houseCost;
}

export function calculateSellValue(
  tile: BoardTile,
  prop: PropertyState
): number {
  // Business Tour sells back at 50% of invested capital (or 60% for smoother comeback)
  return Math.round(calculatePropertyValue(tile, prop) * 0.6);
}

export function calculateBuyoutPrice(
  tile: BoardTile,
  prop: PropertyState
): number {
  // Business Tour rule: 2x current invested value, cannot buyout 5-star hotel (level 4) or resorts
  return calculatePropertyValue(tile, prop) * 2;
}

export function calculateRent(
  tile: BoardTile,
  ownership: Record<number, PropertyState>
): number {
  const prop = ownership[tile.id];
  if (!prop) return 0;

  if (tile.type === 'RESORT') {
    const resortCount = getPlayerResortCount(prop.ownerId, ownership);
    const idx = Math.max(0, Math.min(3, resortCount - 1));
    const base = RESORT_RENTS[idx];
    return prop.hasFestival ? base * 2 : base;
  }

  if (tile.type === 'PROPERTY' && tile.rents && tile.group) {
    let rent = tile.rents[prop.level];
    // Monopoly doubles base land rent (level 0)
    if (prop.level === 0 && playerHasMonopoly(prop.ownerId, tile.group, ownership)) {
      rent *= 2;
    }
    if (prop.hasFestival) {
      rent *= 2;
    }
    return rent;
  }

  return 0;
}

export function calculateNetWorth(
  player: Player,
  ownership: Record<number, PropertyState>
): number {
  if (player.bankrupt) return 0;
  let total = player.cash;
  for (const [tileIdStr, prop] of Object.entries(ownership)) {
    if (prop.ownerId === player.id) {
      const tile = getTileById(Number(tileIdStr));
      total += calculatePropertyValue(tile, prop);
    }
  }
  return total;
}

export function getPlayerOwnedTiles(
  playerId: number,
  ownership: Record<number, PropertyState>
): BoardTile[] {
  return Object.entries(ownership)
    .filter(([, prop]) => prop.ownerId === playerId)
    .map(([id]) => getTileById(Number(id)));
}

export function calculateMaxLiquidationCash(
  player: Player,
  ownership: Record<number, PropertyState>
): number {
  let cash = player.cash;
  for (const tile of getPlayerOwnedTiles(player.id, ownership)) {
    const prop = ownership[tile.id];
    if (prop) {
      cash += calculateSellValue(tile, prop);
    }
  }
  return cash;
}

export function checkVictoryConditions(
  players: Player[],
  ownership: Record<number, PropertyState>
): VictorySummary | null {
  const activePlayers = players.filter((p) => !p.bankrupt);

  // 1. Last survivor
  if (activePlayers.length === 1) {
    const winner = activePlayers[0];
    return {
      winnerId: winner.id,
      type: 'BANKRUPTCY',
      label: 'Độc Tôn Thương Trường',
      description: `${winner.name} là tỷ phú cuối cùng trụ vững khi tất cả đối thủ đều phá sản!`,
    };
  }

  for (const player of activePlayers) {
    // 2. 4 Resorts victory
    const resortCount = getPlayerResortCount(player.id, ownership);
    if (resortCount >= 4) {
      return {
        winnerId: player.id,
        type: 'FOUR_RESORTS',
        label: 'Ông Hoàng Du Lịch (4 Khu Nghỉ Dưỡng)',
        description: `${player.name} đã thâu tóm trọn bộ 4 kỳ quan và khu nghỉ dưỡng khắp Việt Nam!`,
      };
    }

    // 3. 3 Monopolies victory
    const monopolies = getPlayerMonopolies(player.id, ownership);
    if (monopolies.length >= 3) {
      return {
        winnerId: player.id,
        type: 'THREE_MONOPOLIES',
        label: 'Độc Quyền 3 Vùng Kinh Tế',
        description: `${player.name} đã hoàn thành độc quyền ${monopolies.length} cụm tỉnh thành chiến lược!`,
      };
    }

    // 4. Line victory (owning all buyable properties on one side)
    const completeLine = BOARD_LINES.find((line) =>
      line.tileIds.every((id) => ownership[id]?.ownerId === player.id)
    );
    if (completeLine) {
      return {
        winnerId: player.id,
        type: 'LINE_VICTORY',
        label: `Thống Lĩnh ${completeLine.name}`,
        description: `${player.name} đã sở hữu toàn bộ các tỉnh thành dọc theo ${completeLine.name}!`,
      };
    }
  }

  return null;
}

/** Smart AI helpers */
export function chooseAILevelToBuy(
  player: Player,
  tile: BoardTile,
  currentLevel: -1 | 0 | 1 | 2 | 3 | 4
): 0 | 1 | 2 | 3 | 4 | null {
  if (currentLevel >= 4) return null;
  const price = tile.price ?? 0;
  const houseCost = tile.houseCost ?? 0;
  const reserve = 450; // Keep small cash cushion if possible

  if (currentLevel === -1) {
    if (player.cash < price) return null;
    // Try buying land + houses directly
    for (const targetLevel of [3, 2, 1, 0] as const) {
      const cost = price + targetLevel * houseCost;
      if (player.cash - cost >= reserve || (targetLevel === 0 && player.cash >= price)) {
        return targetLevel;
      }
    }
    return 0;
  }

  // Upgrading existing owned tile
  const nextLevel = (currentLevel + 1) as 1 | 2 | 3 | 4;
  if (nextLevel > 4) return null;
  if (player.cash - houseCost >= reserve || (nextLevel === 4 && player.cash >= houseCost)) {
    return nextLevel;
  }
  return null;
}

export function shouldAIBuyout(
  player: Player,
  tile: BoardTile,
  ownership: Record<number, PropertyState>,
  buyoutPrice: number
): boolean {
  if (player.cash - buyoutPrice < 400) return false;
  // Prioritize completing a monopoly or high-value province
  if (tile.group && tile.group !== 'resort') {
    const groupTiles = COLOR_GROUP_META[tile.group].tileIds;
    const ownedInGroup = groupTiles.filter(
      (id) => ownership[id]?.ownerId === player.id
    ).length;
    if (ownedInGroup >= groupTiles.length - 1) return true;
  }
  return player.cash > buyoutPrice * 2.2;
}

export function chooseAIFestivalTile(
  playerId: number,
  ownership: Record<number, PropertyState>
): number | null {
  const owned = getPlayerOwnedTiles(playerId, ownership);
  if (owned.length === 0) return null;
  // Pick highest current rent tile that doesn't already have a festival
  const sorted = [...owned].sort((a, b) => {
    const festA = ownership[a.id]?.hasFestival ? 0 : 1;
    const festB = ownership[b.id]?.hasFestival ? 0 : 1;
    if (festA !== festB) return festB - festA;
    return calculateRent(b, ownership) - calculateRent(a, ownership);
  });
  return sorted[0]?.id ?? null;
}

export function chooseAIWorldTourTile(
  player: Player,
  ownership: Record<number, PropertyState>
): number {
  // 1. Prefer unowned resort if player already owns at least 1
  const myResorts = getPlayerResortCount(player.id, ownership);
  if (myResorts >= 1) {
    const unownedResort = COLOR_GROUP_META.resort.tileIds.find(
      (id) => !ownership[id]
    );
    if (unownedResort !== undefined && player.cash >= 1000) {
      return unownedResort;
    }
  }

  // 2. Prefer unowned property that completes a monopoly
  for (const group of MONOPOLY_GROUPS) {
    const ids = COLOR_GROUP_META[group].tileIds;
    const mine = ids.filter((id) => ownership[id]?.ownerId === player.id);
    const unowned = ids.filter((id) => !ownership[id]);
    if (mine.length === ids.length - 1 && unowned.length === 1) {
      const target = getTileById(unowned[0]);
      if (player.cash >= (target.price ?? 0)) {
        return target.id;
      }
    }
  }

  // 3. Prefer Festival if player has high-level properties
  const myHighProps = getPlayerOwnedTiles(player.id, ownership).filter(
    (t) => (ownership[t.id]?.level ?? 0) >= 2 && !ownership[t.id]?.hasFestival
  );
  if (myHighProps.length > 0) {
    return 16; // Festival
  }

  // 4. Otherwise pick highest affordable unowned property, or START (0)
  const affordableUnowned = BOARD_TILES.filter(
    (t) =>
      (t.type === 'PROPERTY' || t.type === 'RESORT') &&
      !ownership[t.id] &&
      player.cash >= (t.price ?? 0)
  ).sort((a, b) => (b.price ?? 0) - (a.price ?? 0));

  if (affordableUnowned.length > 0) {
    return affordableUnowned[0].id;
  }

  return 0; // Collect 2.000K at START
}
