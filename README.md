# HCM Trip Dashboard

React + Vite + Tailwind + Leaflet one-pager for the Ho Chi Minh City trip (May 25–30, 2026).

## Setup

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Data

- KML source is copied to `public/babys-hcm-trip.kml` and `src/data/babys-hcm-trip.kml` (raw import).
- `src/utils/parseKml.js` parses folders into categories; `src/data/locations.js` adds **Ramen Tomidaya** (itinerary-only coordinates).
- Itinerary IDs match parsed `locationId`s from the KML.
