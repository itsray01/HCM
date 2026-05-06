/** DnD id helpers shared between Planner, DayBucket, DiscoveryPanel */

export const stopId = (dayIdx, stopIdx) => `stop:${dayIdx}:${stopIdx}`;
export const dayDroppableId = (dayIdx) => `day:${dayIdx}`;
export const discoveryDragId = (locationId) => `discovery:${locationId}`;

export function parseStopId(id) {
  if (typeof id !== 'string' || !id.startsWith('stop:')) return null;
  const parts = id.split(':');
  return { dayIdx: Number(parts[1]), stopIdx: Number(parts[2]) };
}

export function parseDayId(id) {
  if (typeof id !== 'string' || !id.startsWith('day:')) return null;
  return { dayIdx: Number(id.split(':')[1]) };
}

export function parseDiscoveryId(id) {
  if (typeof id !== 'string' || !id.startsWith('discovery:')) return null;
  return { locationId: id.slice('discovery:'.length) };
}
