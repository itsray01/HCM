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
  // Clothes / boutiques
  "Bunnyhillconcept": "ChIJATiNVgAvdTER8qevJbGLNhA",
  "The New Playground": "ChIJwbgPCkgvdTERr8CnqMwa3co",
  "HUONG Boutique": "ChIJGUiXtDwvdTER96JUWDGdoxg",
  "COCOSIN STORE": "ChIJx1POdgAvdTERPPptl_3g96E",
  "Manné Code": "ChIJ75b4qAcvdTERnY_MFxo3-04",
  "La Vierge": "ChIJrSSbY18vdTERY-K6r0_mJIs",
  "DATT Official": "ChIJvfdxAY4vdTERB80trGexCB0",
  "COMPOUND GARMENT": "ChIJWSvzPNwvdTERSaezl4acb48",
  "Jirene Studio": "ChIJ6dysVwAvdTERZ7Dsa4HFT2Q",
  "Kisserine House": "ChIJ2xt6sbEvdTER1Ggn1MznYuU",
  "HUELLEYROSE": "ChIJe6uAytcvdTERgaCkMaJWh5k",
  "Rue Miche Boutique": "ChIJf3A3LNIvdTERYuaNqNunXEQ",
  "Mozaic Space": "ChIJBzF4_bgvdTERVhe6FULA9Z8",
  "Clothing Apartment": "ChIJ6e5IYAAvdTERV1rYeb-oIcE",
  "Whose Studio": "ChIJT4g4dwAvdTERkp8EdwG8pm8",
  "Mille Mille - Boutique Store - Trần Cao Vân": "ChIJTx8KLoYvdTERxfqNYWBgqew",
  "waa. studios": "ChIJH9H4mgAvdTERgIrs6VnMVrQ",
  "Rue Miche L'édition": "ChIJw44if4wvdTERIIdYEQM87HM",

  // Cafe / Food
  "Pizza 4P's Hai Ba Trung": "ChIJC-nWiTYvdTERGMJvRSoZ2f4",
  "Oasis Cafe": "ChIJbaeNZCspdTEREadFbltGF9s",
  "Bánh Canh Cua 14 ️": "ChIJl5Hp8RwvdTERzEOyi5tG-Bo",
  "Mặn Mòi, Tao Đàn - Homey Authentic Vietnamese Cuisine": "ChIJbZ2640UvdTERwM8WWGyOESs",
  "Phở Miến gà Kỳ Đồng": "ChIJW3XUti4vdTEROwTSqtSbq1I",
  "The 350F Dessert & More": "ChIJ1eEwkYApdTERH5sDAJvEMcU",
  "ME Cafe (Insane Aesthetic)": "ChIJIzXkifkodTERy1b-fmwbF0w",
  "GEM Cafe": "ChIJUyiYJNopdTERbwIsc_WjV1M",
  "The Cafe Apartment | Photobooth": "ChIJP4LyNAAvdTERp2XLe0QvLeU",
  "linh.café": "ChIJLyC7-JkvdTERkNwkwfb92DI",
  "Phở Việt Nam": "ChIJJSRONbovdTERyqDnjqShlKc",
  "Broken Rice?": "ChIJYbsEUwAvdTERgf-Pytwa5LY",
  "Soumaki - Your Healthy Food Soulmate - Lý Tự Trọng": "ChIJeY0bNdkvdTERGLAOf8OY6c4",
  "Bánh Mì Huynh Hoa - Lê Thị Riêng": "ChIJ9bBIK5ovdTERXOUNNEW8YGo",
  "Ốc Đào": "ChIJW2SKwawvdTERC3i1B0RZSHs",
  "Bún Thịt Nướng Chị Tuyền": "ChIJs6sAxtovdTERD0D38cp6FKg",
  "Bò Né Thanh Tuyền": "ChIJrV9kHGovdTERFoJyc5AT2aU",
  "Sol Kitchen & Bar": "ChIJ9SX_2pQvdTERPUHI65O6sTg",
  "Quince Saigon": "ChIJh2FeSBUvdTERCRKLSex0DA0",
  "Anan Saigon": "ChIJZ_dpJ0EvdTER5wOl-TLvN-8",
  "Én’s Kitchen- Italian Cuisine & more": "ChIJdXD4AAApdTERIMpECh-HBIE",
  "Moa Moa Pasta Club": "ChIJfQFPULQvdTER6MPXXqAqwgA",
  "Fellini Pasta": "ChIJR_lsb0IndTERsAoP5rD_luo",
  "Amano Pizza - Lê Thánh Tôn": "ChIJ0cM5PBwvdTEROSX7iBYl7XQ",
  "ThisThat Bakery Cafe": "ChIJ5cPbHPgndTERY3foBNZSfNg",
  "Garden Kisses": "ChIJBwNQu9sndTERHzFxcBaXI1A",
  "I HATE MONDAY DINING": "ChIJFQtAYLcndTERK_AjlC7x2BI",
  "ngâm CAFE": "ChIJtWNaUgAvdTER9SyDZFiSmx4",
  "Ngọt Ngào": "ChIJcSpATUIvdTERIGCUsvUwpYE",
  "nhà tạo cafe": "ChIJKU0jGQApdTERwUm5_UBdIUw",
  "Nobi bakes & teas - Tiệm bánh nhà Nobi chi nhánh 2": "ChIJt2ZMWQApdTERFXhVBmMGYFA",
  "Dalaland Coffee": "ChIJsfKJJP8ndTERqrIYh9evSb0",
  "Zion Sky Lounge & Dining": "ChIJzT5GAK8vdTERX5qsow6unI8",
  "Chill Skybar & Dining": "ChIJMRRuhj4vdTER1M4F3fECIGI",
  "Not A Bar": "ChIJxSLFs0YvdTERKOc0qdOtYrw",
  "Social Club Rooftop Bar": "ChIJO9BqXjYvdTERVrVlBcU1Ccc",
  "Banana Mama Rooftop Bar & Kitchen Saigon": "ChIJxa4FyIsvdTERU1iwNA7QgLQ",
  "Papaya Papa – Rooftop Restaurant, Bar & Club Ho Chi Minh City": "ChIJs1CmPgAvdTERGIGKdMyQktk",
  "Nyan Tei - Cat cafe": "ChIJicE_x8ArdTERM7yiWrfofUA",
  "Ramen Tomidaya": "ChIJ3UomWMwpdTERRf4xhYaziK8",
  "HỢP 合 Skybar": "ChIJiQd1CugvdTER5KNZ1hsspW8",
  "SUSHI JION": "ChIJE-JiSqcvdTERpFGP0kcXHt8",
  "Quán Cơm Tấm Hồng Calmette": "ChIJJ1PXvGsvdTERh2MhYPwhYgM",
  "Bếp Mẹ Ỉn": "ChIJcwyUxjgvdTERFwXMvGKDY0U",
  "PANG PANG CRAB POT": "ChIJf7-DMwAvdTERCiBUNcM2lfk",
  "Bánh Canh Cua 87": "ChIJBYD4rjgpdTERYZY2MCqxlio",
  "Buffet Cửu Vân Long Premium - Bitexco": "ChIJwY_6-cIvdTERSRUoI6FD6Tg",
  "Quán Thuý 94 - Miến Cua": "ChIJlRD5xMoodTERQiFYLoQ_OyQ",

  // For da funz
  "Photobooth (MonoBooth)": "ChIJWWkHHHQvdTERb3u-mBmODOo",
  "Chạng Vạng Rooftop": "ChIJCc1dBJwndTERSzEzCNcpNmc",
  "HAEU Beauty Salon": "ChIJw4XffewndTER1dmEIXzJaLQ",
  "KUDOCHI Onsen": "ChIJm-YQom-TUW0R7kluBHExjAk",
  "Rose Spa DAKAO - Herbal Hair Wash - Body & Foot MASSAGE for Men and Women": "ChIJlyjvFGwpdTERwsOgX_FPX7Q",
  "MonoConcept": "ChIJOzW8XQAvdTERCnVmSgGWYUI",
  "Little HaNoi Egg Coffee (Yersin)": "ChIJqZ7MThYvdTERh6VZ5ryLuDk",
  "Rose Spa Quận 10": "ChIJiwVgtU8vdTERFx0emtJjq9A",
  "Spa Nhà Suga Premium Korea Headspa": "ChIJ-QaJA98pdTERraMTO4DUJ-w",

  // Nails & Lash
  "Siêu thị NAIL LA MOS": "ChIJtR-nOAApdTERU9Kj-FqA7QY",
};
