// Canonical Google Maps place_ids per location name.
//
// When a location has a place_id here, the photo proxy fetches the official
// Place Details photo — same data Wanderlog uses, and what the business owner
// actually has on their Google profile. No more fuzzy text search picking the
// wrong "Oasis Cafe" three blocks away.
//
// HOW TO ADD ENTRIES
//   1. Open the planner with ?debug=1 in the URL.
//   2. In the Debug Panel, click "Resolve photo IDs" — it asks Google for
//      every location and prints a JSON block here.
//   3. Paste the block below, replacing this object, then commit + deploy.
//
//   OR manually: open the place on Google Maps → URL has
//      "data=...!1s<place_id>" → copy that ChIJ… string.
//
// Keys MUST exactly match the location `name` field (the label shown on the
// card). Diacritics matter; copy from data/locations.js or the KML.

export const PLACE_IDS = {
  // Populated by the resolver below. Currently empty.
};
