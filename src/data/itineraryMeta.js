/**
 * Day badges for discovery grid — derived from all three itinerary groups.
 */
import { itineraryDays, itineraryParents, itineraryGfBff } from './itinerary.js';

/** @type {Map<string, number[]>} */
export const locationIdToDays = (() => {
  const map = new Map();
  const allGroups = [...itineraryDays, ...itineraryParents, ...itineraryGfBff];

  for (const day of allGroups) {
    for (const stop of day.stops) {
      if (stop.type === 'place' && stop.locationId) {
        const cur = map.get(stop.locationId) || [];
        if (!cur.includes(day.day)) map.set(stop.locationId, [...cur, day.day]);
      }
    }
  }
  return map;
})();
