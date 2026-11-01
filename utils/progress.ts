// The database stores a zero-based unlock index. Unlocks are milestones,
// not completion percentages: stations overlap after the seventh day.
export function stationNumber(index: number): number {
  return Math.min(7, Math.max(1, Math.trunc(index) + 1));
}
