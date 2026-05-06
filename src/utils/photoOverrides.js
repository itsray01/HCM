/**
 * Manually curated photo overrides for specific locations.
 * These take priority over any API-fetched photo.
 * Keys are the exact place labels (case-sensitive) as they appear in the KML / stop.label.
 */
export const PHOTO_OVERRIDES = {
  // Flights / airport
  "Land at SGN":         "/photos/sgn-airport.jpg",
  "Depart SGN":          "/photos/sgn-airport.jpg",
  "Head to SGN Airport": "/photos/sgn-airport.jpg",

  // Manually corrected place photos
  "Rose Spa DAKAO":          "/photos/rose-spa-dakao.jpg",
  "Pizza 4P's":              "/photos/pizza-4ps.jpg",
  "Pizza 4P's Hai Ba Trung": "/photos/pizza-4ps-hai-ba-trung.jpg",
  "Bunnyhillconcept":        "/photos/bunnyhill.jpg",
  // Add more here as needed: "Place Name": "/photos/filename.jpg"
};

/**
 * Places whose auto-fetched photo was wrong and needs to be re-fetched.
 * Any Firestore-stored photoUrl for these labels will be discarded on load
 * so the improved Google Places search runs again.
 */
export const FORCE_REFETCH = new Set([
  "Mặn Mòi (Tao Đàn)",
  "The 350F Dessert & More",
]);
