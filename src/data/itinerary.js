/**
 * Master Plan — Days 1–6 (May 25–30, 2026).
 *
 * Three named exports:
 *   itineraryDays    → "Full Plan" overview; stops carry `group` annotations
 *   itineraryParents → tailored for the parents: traditional food, parks, spa, rest
 *   itineraryGfBff   → tailored for GF + BFF: cafés, shopping, beauty, onsen
 *
 * Stop flags:
 *   group: 'parents' | 'gf-bff'  (Full Plan only — which sub-group does this)
 *   shared: true                  (group views — this stop includes everyone)
 *   featured: true                → gold accent card
 *   alert: true                   → amber ring + "Time-critical" badge
 *   reservationRequired: true     → maroon badge
 *   travel: 'Walk' ≤ 0.8 km | 'Grab' > 0.8 km
 */

export const AIRBNB_LABEL   = 'Airbnb · Phú Nhuận';
export const AIRBNB_ADDRESS = '330/15B Đ. Phan Đình Phùng';
export const AIRBNB_ID      = 'airbnb-330-15b-phan-inh-phung-18';

// ─────────────────────────────────────────────────────────────────────────────
// Shared stop snippets (reused verbatim across group arrays)
// ─────────────────────────────────────────────────────────────────────────────

const S = {
  // ── Day 1 ────────────────────────────────────────────────────────────────
  d1_flight: {
    type: 'flight', label: 'Land at SGN', time: '17:15',
    detail: 'TR516 · Terminal 2 · Immigration + bag claim ~30 min · host check-in closes 18:00 · Conf #O4CMRB',
    cost: 1192.55,
    alert: true, shared: true,
  },
  d1_airbnb: {
    type: 'airbnb', locationId: AIRBNB_ID, label: AIRBNB_LABEL, time: '~17:45',
    note: AIRBNB_ADDRESS + ' · Check-in · Drop bags · Freshen up · 5 nights · Conf #6534514126',
    cost: 275.90,
    distance: 'SGN → Phú Nhuận ~25 km', travel: 'Grab', alert: true, shared: true,
  },
  d1_4p: {
    type: 'place', locationId: 'cafeFood-pizza-4p-s-hai-ba-trung-21',
    label: "Pizza 4P's Hai Ba Trung", time: '18:00',
    note: 'Reservation 6PM — book 3+ days ahead. Pei Qi: get the crab pasta (recco by Jen) + Margherita w/ burrata',
    reservationRequired: true,
    bookingUrl: 'https://booking.pizza4ps.com/?restaurants=5fa9505b813c2e003d7fa612',
    distance: '~1.3 km', travel: 'Grab', duration: '~2 hrs',
    featured: true, alert: true, shared: true,
  },

  // ── Day 2 ────────────────────────────────────────────────────────────────
  d2_shoot: {
    type: 'place', locationId: 'fun-family-photoshoot-69', label: 'Family Photoshoot',
    time: '08:00', note: 'Confirmed booking · 4 hours long · IG: @phongcuamo · everyone arrives together · wear pre-chosen outfits',
    distance: '~0.4 km', travel: 'Walk', duration: '~4 hrs',
    featured: true, alert: true, shared: true,
  },
  d2_airbnb: {
    type: 'airbnb', locationId: AIRBNB_ID, label: AIRBNB_LABEL, time: '07:45',
    note: AIRBNB_ADDRESS + ' · Light breakfast · pre-outfit check before photoshoot',
    alert: true, shared: true,
  },
  d2_pho: {
    type: 'place', locationId: 'cafeFood-pho-mien-ga-ky-ong-25',
    label: 'Phở Miến gà Kỳ Đồng', time: '10:30',
    note: 'MUST GO — Michelin Guide listed, highly recco by Jen. She loves their broken rice (pork chop rice). Arrive early, fills up fast',
    distance: '~1.6 km', travel: 'Grab', duration: '~45 min',
    featured: true, alert: true, shared: true,
  },
  d2_manmoi: {
    type: 'place', locationId: 'cafeFood-man-moi-tao-an-homey-authentic-vietnamese-cuisine-24',
    label: 'Mặn Mòi (Tao Đàn)', time: '12:30',
    note: 'MUST GO !!! Michelin Bib Gourmand · need reservation for dinner — confirm the day before',
    reservationRequired: true,
    bookingUrl: 'https://www.tablecheck.com/en/man-moi-tao-dan/reserve',
    distance: '~1.3 km', travel: 'Grab', duration: '~2 hrs',
    featured: true, alert: true, shared: true,
  },
  d2_pizza: {
    type: 'place', locationId: 'cafeFood-pizza-4p-s-hai-ba-trung-21',
    label: "Pizza 4P's Hai Ba Trung", time: '18:30',
    note: 'Book 3+ days ahead — Margherita w/ burrata is the move',
    reservationRequired: true,
    bookingUrl: 'https://booking.pizza4ps.com/?restaurants=5fa9505b813c2e003d7fa612',
    distance: '~1.3 km', travel: 'Grab', duration: '~2 hrs',
    featured: true, alert: true, shared: true,
  },
  d2_rooftop: {
    type: 'place', locationId: 'cafeFood-social-club-rooftop-bar-63',
    label: 'Social Club Rooftop Bar', time: '21:00',
    note: 'Panoramic D1/D3 skyline — arrive before 21:30 for best seats',
    distance: '~0.1 km', travel: 'Walk', duration: '~2 hrs',
    featured: true, shared: true,
  },

  // ── Day 3 ────────────────────────────────────────────────────────────────
  d3_airbnb: {
    type: 'airbnb', locationId: AIRBNB_ID, label: AIRBNB_LABEL, time: '09:00',
    note: AIRBNB_ADDRESS + ' · Start here', shared: true,
  },
  d3_anan: {
    type: 'place', locationId: 'cafeFood-anan-saigon-44', label: 'Anan Saigon',
    time: '18:00',
    note: 'Michelin-starred Vietnamese fine dining — email hello@anansaigon.com at least 2 weeks ahead, specify tasting menu + seating time (17:30 or 20:30).',
    reservationRequired: true,
    bookingUrl: 'https://anansaigon.com/booking/',
    distance: '~0.75 km', travel: 'Walk', duration: '~2.5 hrs',
    featured: true, alert: true, shared: true,
  },
  /** Shared dinner — everyone + parents */
  d3_ramen_dinner: {
    type: 'place', locationId: 'cafe-ramen-tomidaya-extra', label: 'Ramen Tomidaya',
    time: '18:30',
    note: 'Dinner with everyone + parents — tonkotsu or miso; grab a big table together',
    distance: '~2 km', travel: 'Grab', duration: '~1.5 hrs',
    featured: true, shared: true,
  },

  // ── Day 4 ────────────────────────────────────────────────────────────────
  d4_airbnb: {
    type: 'airbnb', locationId: AIRBNB_ID, label: AIRBNB_LABEL, time: '09:00',
    note: AIRBNB_ADDRESS + ' · Easy morning · head out when ready',
    shared: true,
  },
  d4_brunch: {
    type: 'place', locationId: 'cafeFood-ngot-ngao-56', label: 'Ngọt Ngào',
    time: '10:30', note: 'Sweet café brunch together — fuel up before the spa',
    distance: '~0.9 km', travel: 'Grab', duration: '~45 min', shared: true,
  },
  d4_rosespa: {
    type: 'place', locationId: 'fun-rose-spa-dakao-herbal-hair-wash-body-foot-massage-for-me-70',
    label: 'Rose Spa DAKAO', time: '11:30',
    note: 'Herbal hair wash + full body & foot massage — DM or call to book ahead, ask for the full 90-min package. For GF + parents.',
    reservationRequired: true,
    bookingUrl: 'https://www.instagram.com/rosespa_dakao/',
    distance: '~1.8 km', travel: 'Grab', duration: '~2.5 hrs', featured: true, shared: true,
  },

  // ── Day 5 ────────────────────────────────────────────────────────────────
  d5_airbnb: {
    type: 'airbnb', locationId: AIRBNB_ID, label: AIRBNB_LABEL, time: '10:00',
    note: AIRBNB_ADDRESS + ' · Start here', shared: true,
  },
  d5_rooftop: {
    type: 'place', locationId: 'cafeFood-chang-vang-rooftop-32', label: 'Chạng Vạng Rooftop',
    time: '17:00', note: 'Everyone meets here — best sunset in HCMC. Order drinks, stay until golden hour fades.',
    distance: '~1.7 km', travel: 'Grab', duration: '~2.5 hrs', featured: true, shared: true,
  },

  // ── Day 1 additions ──────────────────────────────────────────────────────
  d1_hop_skybar: {
    type: 'place', locationId: 'cafeFood-hop-skybar-extra',
    label: 'HỢP 合 Skybar', time: '21:00',
    note: 'Rooftop bar to close the first night — great views & cocktails',
    distance: '~1.5 km', travel: 'Grab', duration: '~1.5 hrs',
    group: 'gf-bff',
  },

  // ── Day 2 additions ──────────────────────────────────────────────────────
  d2_banh_mi_hong_hoa: {
    type: 'place', locationId: 'cafeFood-banh-mi-hong-hoa-extra',
    label: 'Bánh Mì Hồng Hoa', time: '12:30',
    note: 'Quick bánh mì stop — cheap eats right after the photoshoot winds down',
    distance: '~1.2 km', travel: 'Grab', duration: '~20 min',
    group: 'parents',
  },

  // ── Day 4 additions ──────────────────────────────────────────────────────
  d4_sushi_jion: {
    type: 'place', locationId: 'cafeFood-sushi-jion-extra',
    label: 'SUSHI JION', time: '19:00',
    note: 'Japanese sushi dinner — a nice change of pace. Good quality omakase options.',
    distance: '~2 km', travel: 'Grab', duration: '~1.5 hrs',
    group: 'gf-bff',
  },

  // ── Day 5 additions ──────────────────────────────────────────────────────
  d5_bo_ne_ba_nui: {
    type: 'place', locationId: 'cafeFood-bo-ne-ba-nui-extra',
    label: 'Bò Né Bà Nũi', time: '09:30',
    note: 'Classic HCMC morning sizzle plate — beef, fried egg & baguette. ~0.5 km from Airbnb',
    distance: '~0.5 km', travel: 'Walk', duration: '~45 min',
    group: 'parents',
  },
  d5_anan: {
    type: 'place', locationId: 'cafeFood-anan-saigon-44', label: 'Anan Saigon',
    time: '20:30',
    note: 'Michelin-starred Vietnamese fine dining — email hello@anansaigon.com 2+ weeks ahead, specify tasting menu + 20:30 seating. Last-night splurge.',
    reservationRequired: true,
    bookingUrl: 'https://anansaigon.com/booking/',
    distance: '~2 km', travel: 'Grab', duration: '~2.5 hrs',
    featured: true, alert: true, group: 'gf-bff',
  },

  // ── Day 6 ────────────────────────────────────────────────────────────────
  d6_airbnb: {
    type: 'airbnb', locationId: AIRBNB_ID, label: AIRBNB_LABEL, time: '07:30',
    note: AIRBNB_ADDRESS + ' · Pack everything · settle any charges', alert: true, shared: true,
  },
  d6_bone: {
    type: 'place', locationId: 'cafeFood-bo-ne-thanh-tuyen-40', label: 'Bò Né Thanh Tuyền',
    time: '08:00', note: 'Classic HCMC beef sizzle plate — the perfect last breakfast. Bring your bags so you Grab straight back to Airbnb for 10:00 checkout without an extra trip.',
    distance: '~4.5 km', travel: 'Grab', duration: '~1 hr', featured: true, shared: true,
  },
  d6_checkout: {
    type: 'airbnb', locationId: AIRBNB_ID, label: 'Return & Check-out', time: '10:00',
    note: AIRBNB_ADDRESS + " · Check-out by 10:00 — don't be late",
    distance: '~4.5 km', travel: 'Grab', alert: true, shared: true,
  },
  d6_airport: {
    type: 'place', locationId: null, label: 'Head to SGN Airport', time: '13:00',
    note: 'Allow 30–40 min Grab + 2 hrs airport buffer for international check-in',
    distance: '~15 km', travel: 'Grab', alert: true, shared: true,
  },
  d6_flight: {
    type: 'flight', label: 'Depart SGN', time: '15:40',
    detail: 'TR553 · Terminal 2 → Changi T1 · Arrive SIN 18:45', alert: true, shared: true,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// FULL PLAN  (itineraryDays — used by UI "Full Plan" tab + itineraryMeta)
// Stops carry `group: 'parents' | 'gf-bff'`; no group = shared
// ─────────────────────────────────────────────────────────────────────────────

export const itineraryDays = [
  {
    day: 1, dateLabel: 'Mon, May 25',
    subtitle: 'Arrival & first night in Phú Nhuận',
    returnTime: '23:00',
    stops: [
      S.d1_flight,
      S.d1_airbnb,
      S.d1_4p,
      {
        type: 'place',
        locationId: 'clothes-bunnyhillconcept-2',
        label: 'Bunnyhillconcept',
        time: '19:30',
        note: 'Local indie boutique — evening browse after 4P dinner',
        distance: '~1.1 km',
        travel: 'Grab',
        duration: '~1 hr',
        featured: false,
        group: 'gf-bff',
      },
      S.d1_hop_skybar,
    ],
  },
  {
    day: 2, dateLabel: 'Tue, May 26',
    subtitle: 'Photoshoot morning · D3 flavours & rooftop nightcap',
    wakeUp: '06:30', returnTime: '23:30',
    earlyNote: 'Photoshoot at 8:00 AM sharp — set two alarms',
    stops: [
      S.d2_airbnb,
      {
        type: 'place', locationId: null, label: 'Oasis Cafe',
        lat: 10.7927268, lng: 106.6710981,
        time: '07:00', note: 'Koi fish café — pretty pre-shoot breakfast spot, 21 min walk from Airbnb',
        distance: '~1.7 km', travel: 'Walk', duration: '~45 min', shared: true,
      },
      S.d2_shoot,
      S.d2_banh_mi_hong_hoa,
      S.d2_pho,
      {
        type: 'place', locationId: null, label: 'Tao Đàn Park — morning walk',
        time: '11:45', note: 'Beautiful French colonial park in D3 — stroll after phở before lunch',
        distance: '~0.5 km', travel: 'Walk', duration: '~45 min', group: 'parents',
      },
      {
        type: 'place', locationId: null, label: 'Bánh Canh Cua 14',
        lat: 10.759495, lng: 106.68017,
        time: '12:00', note: 'CRAB NOODLE SOUP — nomnom. Near Bến Thành Market (D1 south, ~3 km south of Tao Đàn Park). Grab there and back.',
        distance: '~3 km', travel: 'Grab', duration: '~1 hr', group: 'parents',
      },
      S.d2_manmoi,
      {
        type: 'place', locationId: 'cafeFood-the-350f-dessert-more-26', label: 'The 350F Dessert & More',
        time: '15:30', note: 'Tiramisu & Vietnamese desserts — afternoon treat before dinner',
        distance: '~2 km', travel: 'Grab', duration: '~1 hr', group: 'parents',
      },
      {
        type: 'place', locationId: 'cafeFood-ngam-cafe-55', label: 'ngâm CAFE',
        time: '15:30', note: 'Chill neighbourhood café — recharge before the evening',
        distance: '~1.1 km', travel: 'Grab', duration: '~1.5 hrs', group: 'gf-bff',
      },
      S.d2_pizza,
      {
        type: 'place', locationId: null, label: 'Sol Kitchen & Bar',
        lat: 10.774107, lng: 106.6971367,
        time: '19:30', note: 'Modern Latin American — stylish dinner alt, open 11–14 / 17–22:30',
        distance: '~1 km', travel: 'Grab', duration: '~2 hrs', group: 'gf-bff',
      },
      {
        type: 'place', locationId: null, label: 'Buffet Cửu Vân Long Premium',
        lat: 10.7765, lng: 106.7045,
        time: '19:30', note: 'Premium buffet at Saigon Marina IFC — option if everyone wants a big shared dinner',
        distance: '~4 km', travel: 'Grab', duration: '~2 hrs', shared: true,
      },
      S.d2_rooftop,
    ],
  },
  {
    day: 3, dateLabel: 'Wed, May 27',
    subtitle: 'District 1 — Pei Qi hair, groups split, ramen dinner together',
    wakeUp: '08:30', returnTime: '21:00',
    stops: [
      S.d3_airbnb,
      {
        type: 'place', locationId: 'cafeFood-banh-mi-huynh-hoa-le-thi-rieng-37',
        label: 'Bánh Mì Huynh Hoa', time: '10:00',
        note: "Saigon's most famous bánh mì — join the queue, worth every minute",
        distance: '~3.5 km', travel: 'Grab', duration: '~30 min', group: 'parents',
      },
      {
        type: 'place', locationId: 'cafeFood-pho-viet-nam-34', label: 'Phở Việt Nam',
        time: '12:30', note: 'Traditional phở lunch in D1 — simple, clean, authentic',
        distance: '~1.5 km', travel: 'Grab', duration: '~45 min', group: 'parents',
      },
      {
        type: 'place', locationId: 'cafeFood-nha-tao-cafe-57', label: 'nhà tạo cafe',
        time: '14:30', note: 'Quiet neighbourhood café — rest and people-watch before dinner',
        distance: '~1.2 km', travel: 'Grab', duration: '~1.5 hrs', group: 'parents',
      },
      {
        type: 'place', locationId: 'fun-haeu-beauty-salon-67', label: 'HAEU Beauty Salon',
        time: '11:30', note: 'Pei Qi — hair appointment (book ahead). Go here FIRST from Airbnb — avoids a double Thảo Điền trip.',
        distance: '~6 km', travel: 'Grab', duration: '~1.5 hrs',
        featured: true, group: 'gf-bff',
      },
      {
        type: 'place', locationId: null, label: 'Chaos Hair Atelier HCM',
        lat: 10.7835, lng: 106.6875,
        time: '12:00', note: 'Alternative hair atelier — if choosing this over HAEU. 290/18 Nam Kỳ Khởi Nghĩa, D3. Booking 12pm, 2–3 hrs.',
        distance: '~3.4 km', travel: 'Grab', duration: '~2.5 hrs',
        reservationRequired: true, group: 'gf-bff',
      },
      {
        type: 'place', locationId: 'cafeFood-the-cafe-apartment-photobooth-30',
        label: 'The Cafe Apartment', time: '13:30',
        note: 'Multi-floor café building — explore floor by floor, great photos. Grab here after HAEU.',
        distance: '~4.7 km', travel: 'Grab', duration: '~1.5 hrs',
        featured: true, group: 'gf-bff',
      },
      {
        type: 'place', locationId: 'cafeFood-photobooth-monobooth-31', label: 'MonoBooth Photobooth',
        time: '15:00', note: 'Right across from Cafe Apartment — print a strip',
        distance: '~0.2 km', travel: 'Walk', duration: '~30 min', group: 'gf-bff',
      },
      {
        type: 'place', locationId: 'clothes-the-new-playground-4', label: 'The New Playground',
        time: '15:30', note: 'Best local streetwear & indie brands in one spot — afternoon before reunion dinner',
        distance: '~0.5 km', travel: 'Walk', duration: '~1.5 hrs', group: 'gf-bff',
      },
      S.d3_ramen_dinner,
      {
        type: 'place', locationId: null, label: 'Chill Skybar & Dining',
        lat: 10.7705648, lng: 106.6943777,
        time: '21:30', note: 'Rooftop nightcap — finger food, sharing plates & cocktails with skyline views. Open 17:30–1:30',
        distance: '~3 km', travel: 'Grab', duration: '~2 hrs', group: 'gf-bff',
      },
    ],
  },
  {
    day: 4, dateLabel: 'Thu, May 28',
    subtitle: 'Brunch together · spa · groups split for the afternoon',
    wakeUp: '08:30', returnTime: '18:30',
    stops: [
      S.d4_airbnb,
      S.d4_brunch,
      S.d4_rosespa,
      {
        type: 'place', locationId: null, label: 'Quán Thuý 94 - Miến Cua',
        lat: 10.7910, lng: 106.6970,
        time: '14:15', note: 'Crab vermicelli noodles — Michelin-listed sister of Quán 94. 84 Đinh Tiên Hoàng, Đa Kao. Steps from Rose Spa — no Grab needed.',
        distance: '~0.7 km', travel: 'Walk', duration: '~1 hr', group: 'parents',
      },
      {
        type: 'airbnb', locationId: AIRBNB_ID, label: 'Rest at Airbnb',
        time: '14:00', note: 'Back to the apartment — afternoon nap, recovery time',
        distance: '~1.8 km', travel: 'Grab', group: 'parents',
      },
      {
        type: 'place', locationId: 'fun-kudochi-onsen-68', label: 'KUDOCHI Onsen',
        time: '14:30', note: 'Japanese-style bath house — the ultimate post-spa relaxation',
        distance: '~2.1 km', travel: 'Grab', duration: '~2 hrs',
        featured: true, group: 'gf-bff',
      },
      S.d4_sushi_jion,
    ],
  },
  {
    day: 5, dateLabel: 'Fri, May 29',
    subtitle: 'Groups split until sunset — reconvene at Chạng Vạng',
    wakeUp: '09:00', returnTime: '21:00',
    stops: [
      S.d5_airbnb,
      S.d5_bo_ne_ba_nui,
      {
        type: 'place', locationId: 'cafeFood-ngam-cafe-55', label: 'ngâm CAFE',
        time: '10:30', note: 'Relaxed neighbourhood café close to the Airbnb',
        distance: '~0.9 km', travel: 'Grab', duration: '~1.5 hrs', group: 'parents',
      },
      {
        type: 'place', locationId: null, label: 'Bánh Canh Cua 87',
        lat: 10.7905, lng: 106.6900,
        time: '12:00', note: 'BEST CRAB NOODLES — sister to Bánh Canh Cua 14, often the better bowl. Tân Định. 0.6 km from ngâm CAFE — most efficient lunch on Day 5.',
        distance: '~0.6 km', travel: 'Walk', duration: '~1 hr',
        featured: true, group: 'parents',
      },
      {
        type: 'place', locationId: 'cafeFood-bun-thit-nuong-chi-tuyen-39',
        label: 'Bún Thịt Nướng Chị Tuyền', time: '12:00',
        note: 'Alternative to Bánh Canh Cua 87 — traditional grilled pork noodles. Note: 3.2 km south, bigger detour from ngâm CAFE',
        distance: '~3.2 km', travel: 'Grab', duration: '~1 hr', group: 'parents',
      },
      {
        type: 'place', locationId: 'cafeFood-dalaland-coffee-59', label: 'Dalaland Coffee',
        time: '10:30', note: 'Thảo Điền institution — great brunch + aesthetic shots',
        distance: '~6.6 km', travel: 'Grab', duration: '~1.5 hrs',
        featured: true, group: 'gf-bff',
      },
      {
        type: 'place', locationId: 'fun-haeu-beauty-salon-67', label: 'HAEU Beauty Salon',
        time: '12:30', note: 'Nails / brows / hair touch-up — last full day treat',
        distance: '~0.65 km', travel: 'Walk', duration: '~1.5 hrs', group: 'gf-bff',
      },
      {
        type: 'place', locationId: 'cafeFood-garden-kisses-53', label: 'Garden Kisses',
        time: '14:30', note: 'Hidden garden café in Thảo Điền — perfect afternoon wind-down',
        distance: '~0.5 km', travel: 'Walk', duration: '~1.5 hrs', group: 'gf-bff',
      },
      S.d5_rooftop,
      S.d5_anan,
    ],
  },
  {
    day: 6, dateLabel: 'Sat, May 30',
    subtitle: 'Last breakfast · check-out · fly home',
    wakeUp: '07:00',
    stops: [S.d6_airbnb, S.d6_bone, S.d6_checkout, S.d6_airport, S.d6_flight],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PARENTS ITINERARY
// Traditional food, parks, spa, rest — relaxed pace
// ─────────────────────────────────────────────────────────────────────────────

export const itineraryParents = [
  {
    day: 1, dateLabel: 'Mon, May 25',
    subtitle: 'Arrival — check in, rest, dinner at 4P',
    returnTime: '22:30',
    stops: [
      S.d1_flight,
      S.d1_airbnb,
      S.d1_4p,
    ],
  },
  {
    day: 2, dateLabel: 'Tue, May 26',
    subtitle: 'Photoshoot morning · D3 traditional — park, dessert & rooftop',
    wakeUp: '06:30', returnTime: '22:30',
    earlyNote: 'Photoshoot at 8:00 AM sharp — set two alarms',
    stops: [
      S.d2_airbnb,
      S.d2_shoot,
      S.d2_banh_mi_hong_hoa,
      S.d2_pho,
      {
        type: 'place', locationId: null, label: 'Tao Đàn Park',
        time: '11:45', note: 'Shaded French colonial park in D3 — stroll after phở before lunch',
        distance: '~0.5 km', travel: 'Walk', duration: '~45 min',
      },
      S.d2_manmoi,
      {
        type: 'place', locationId: 'cafeFood-the-350f-dessert-more-26', label: 'The 350F Dessert & More',
        time: '15:30', note: 'Tiramisu, Vietnamese cakes & coffee — lovely afternoon stop',
        distance: '~2 km', travel: 'Grab', duration: '~1 hr',
      },
      S.d2_pizza,
      { ...S.d2_rooftop, note: 'Panoramic D1/D3 skyline — great night view. Leave by 23:00.' },
    ],
  },
  {
    day: 3, dateLabel: 'Wed, May 27',
    subtitle: 'D1 the traditional way — bánh mì, phở & ramen dinner with the group',
    wakeUp: '08:30', returnTime: '21:00',
    stops: [
      S.d3_airbnb,
      {
        type: 'place', locationId: 'cafeFood-banh-mi-huynh-hoa-le-thi-rieng-37',
        label: 'Bánh Mì Huynh Hoa', time: '10:00',
        note: "Saigon's most famous bánh mì joint — join the queue, worth every minute",
        distance: '~3.5 km', travel: 'Grab', duration: '~30 min', featured: true,
      },
      {
        type: 'place', locationId: null, label: 'D1 Old Quarter Walk',
        time: '11:00', note: 'Stroll Bến Thành area — street food stalls, old shop-houses, classic Saigon street scenes',
        distance: '~1 km', travel: 'Walk', duration: '~1.5 hrs',
      },
      {
        type: 'place', locationId: 'cafeFood-pho-viet-nam-34', label: 'Phở Việt Nam',
        time: '13:00', note: 'Traditional phở for lunch — simple, clean, authentic',
        distance: '~1.5 km', travel: 'Grab', duration: '~1 hr', featured: true,
      },
      {
        type: 'place', locationId: 'cafeFood-nha-tao-cafe-57', label: 'nhà tạo cafe',
        time: '15:00', note: 'Quiet neighbourhood café — rest before meeting everyone for ramen',
        distance: '~1.2 km', travel: 'Grab', duration: '~1.5 hrs',
      },
      S.d3_ramen_dinner,
    ],
  },
  {
    day: 4, dateLabel: 'Thu, May 28',
    subtitle: 'Brunch · spa · afternoon rest',
    wakeUp: '08:30', returnTime: '16:00',
    stops: [
      S.d4_airbnb,
      S.d4_brunch,
      S.d4_rosespa,
      {
        type: 'airbnb', locationId: AIRBNB_ID, label: 'Rest at Airbnb',
        time: '14:00', note: 'Back to the apartment — well-deserved afternoon nap before evening',
        distance: '~1.8 km', travel: 'Grab',
      },
    ],
  },
  {
    day: 5, dateLabel: 'Fri, May 29',
    subtitle: 'Relaxed Phú Nhuận day — café, noodles & the sunset reunion',
    wakeUp: '09:00', returnTime: '21:00',
    stops: [
      S.d5_airbnb,
      { ...S.d5_bo_ne_ba_nui, group: undefined, shared: false },
      {
        type: 'place', locationId: 'cafeFood-ngam-cafe-55', label: 'ngâm CAFE',
        time: '10:30', note: 'Charming neighbourhood café close to the Airbnb — easy, relaxed morning',
        distance: '~0.9 km', travel: 'Grab', duration: '~1.5 hrs',
      },
      {
        type: 'place', locationId: null, label: 'Bánh Canh Cua 87',
        lat: 10.7905, lng: 106.6900,
        time: '12:00', note: 'BEST CRAB NOODLES in Tân Định — only 0.6 km from ngâm CAFE, no backtracking. Sister spot to Bánh Canh Cua 14.',
        distance: '~0.6 km', travel: 'Walk', duration: '~1 hr', featured: true,
      },
      {
        type: 'place', locationId: 'cafeFood-bun-thit-nuong-chi-tuyen-39',
        label: 'Bún Thịt Nướng Chị Tuyền', time: '12:00',
        note: 'Alternative — traditional grilled pork noodles. Further south (3.2 km from ngâm CAFE), adds ~30 min extra travel vs Bánh Canh Cua 87',
        distance: '~3.2 km', travel: 'Grab', duration: '~1 hr', featured: true,
      },
      {
        type: 'place', locationId: null, label: 'Afternoon stroll — Phú Nhuận',
        time: '14:00', note: 'Walk around the neighbourhood, browse local shops, relax at the Airbnb',
        distance: '—', travel: null, duration: '~2 hrs',
      },
      S.d5_rooftop,
    ],
  },
  {
    day: 6, dateLabel: 'Sat, May 30',
    subtitle: 'Last breakfast · check-out · fly home',
    wakeUp: '07:00',
    stops: [S.d6_airbnb, S.d6_bone, S.d6_checkout, S.d6_airport, S.d6_flight],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// GF + BFF ITINERARY
// Trendy cafés, boutique shopping, beauty, onsen — full girls trip energy
// ─────────────────────────────────────────────────────────────────────────────

export const itineraryGfBff = [
  {
    day: 1, dateLabel: 'Mon, May 25',
    subtitle: 'Arrival — boutique run, dinner at 4P & rooftop nightcap',
    returnTime: '23:00',
    stops: [
      S.d1_flight,
      S.d1_airbnb,
      S.d1_4p,
      {
        type: 'place', locationId: 'clothes-bunnyhillconcept-2', label: 'Bunnyhillconcept',
        time: '19:30', note: 'Local indie boutique — good window shopping after dinner',
        distance: '~1.1 km', travel: 'Grab', duration: '~1 hr',
      },
      { ...S.d1_hop_skybar, group: undefined },
    ],
  },
  {
    day: 2, dateLabel: 'Tue, May 26',
    subtitle: 'Photoshoot morning · pho, Vietnamese lunch & rooftop nightcap',
    wakeUp: '06:30', returnTime: '23:30',
    earlyNote: 'Photoshoot at 8:00 AM sharp — set two alarms',
    stops: [
      S.d2_airbnb,
      S.d2_shoot,
      S.d2_pho,
      S.d2_manmoi,
      {
        type: 'place', locationId: 'cafeFood-ngam-cafe-55', label: 'ngâm CAFE',
        time: '15:30', note: 'Chill neighbourhood café — recharge before the evening',
        distance: '~1.1 km', travel: 'Grab', duration: '~1.5 hrs',
      },
      S.d2_pizza,
      S.d2_rooftop,
    ],
  },
  {
    day: 3, dateLabel: 'Wed, May 27',
    subtitle: 'D1 deep dive — cafés, Pei Qi hair, shopping — ramen dinner with parents',
    wakeUp: '08:30', returnTime: '21:00',
    stops: [
      S.d3_airbnb,
      {
        type: 'place', locationId: 'fun-haeu-beauty-salon-67', label: 'HAEU Beauty Salon',
        time: '11:30', note: 'Pei Qi — hair appointment (book ahead). Go here directly from Airbnb to avoid a double Thảo Điền round trip.',
        distance: '~6 km', travel: 'Grab', duration: '~1.5 hrs', featured: true,
      },
      {
        type: 'place', locationId: 'cafeFood-the-cafe-apartment-photobooth-30',
        label: 'The Cafe Apartment', time: '13:30',
        note: 'Multi-floor café building — explore every floor, great content. Grab here from Thảo Điền after hair.',
        distance: '~4.7 km', travel: 'Grab', duration: '~1.5 hrs', featured: true,
      },
      {
        type: 'place', locationId: 'cafeFood-photobooth-monobooth-31', label: 'MonoBooth Photobooth',
        time: '15:00', note: 'Print a photo strip as a trip keepsake',
        distance: '~0.2 km', travel: 'Walk', duration: '~30 min',
      },
      {
        type: 'place', locationId: 'clothes-the-new-playground-4', label: 'The New Playground',
        time: '15:30', note: 'Best local streetwear & indie brands — afternoon before reunion dinner',
        distance: '~0.5 km', travel: 'Walk', duration: '~1.5 hrs',
      },
      S.d3_ramen_dinner,
    ],
  },
  {
    day: 4, dateLabel: 'Thu, May 28',
    subtitle: 'Brunch · spa · onsen · sushi dinner — full self-care day',
    wakeUp: '08:30', returnTime: '21:30',
    stops: [
      S.d4_airbnb,
      S.d4_brunch,
      S.d4_rosespa,
      {
        type: 'place', locationId: 'fun-kudochi-onsen-68', label: 'KUDOCHI Onsen',
        time: '14:30', note: 'Japanese-style bath house — the ultimate post-spa relaxation',
        distance: '~2.1 km', travel: 'Grab', duration: '~2 hrs', featured: true,
      },
      { ...S.d4_sushi_jion, group: undefined },
    ],
  },
  {
    day: 5, dateLabel: 'Fri, May 29',
    subtitle: 'Thảo Điền girls day — coffee, salon, garden, sunset & Anan dinner',
    wakeUp: '09:00', returnTime: '23:30',
    stops: [
      S.d5_airbnb,
      {
        type: 'place', locationId: 'cafeFood-dalaland-coffee-59', label: 'Dalaland Coffee',
        time: '10:30', note: 'Thảo Điền institution — great brunch menu + aesthetic shots',
        distance: '~6.6 km', travel: 'Grab', duration: '~1.5 hrs', featured: true,
      },
      {
        type: 'place', locationId: 'fun-haeu-beauty-salon-67', label: 'HAEU Beauty Salon',
        time: '12:30', note: 'Nails / brows / hair touch-up — treat yourself on the last full day',
        distance: '~0.65 km', travel: 'Walk', duration: '~1.5 hrs',
      },
      {
        type: 'place', locationId: 'cafeFood-garden-kisses-53', label: 'Garden Kisses',
        time: '14:30', note: 'Hidden garden café — the perfect lazy afternoon before the sunset',
        distance: '~0.5 km', travel: 'Walk', duration: '~1.5 hrs',
      },
      S.d5_rooftop,
      { ...S.d5_anan, group: undefined },
    ],
  },
  {
    day: 6, dateLabel: 'Sat, May 30',
    subtitle: 'Last breakfast · check-out · fly home',
    wakeUp: '07:00',
    stops: [S.d6_airbnb, S.d6_bone, S.d6_checkout, S.d6_airport, S.d6_flight],
  },
];
