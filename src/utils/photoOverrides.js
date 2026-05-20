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

  // Manually corrected place photos (local files)
  "Rose Spa DAKAO":          "/photos/rose-spa-dakao.jpg",
  "Pizza 4P's":              "/photos/pizza-4ps.jpg",
  "Pizza 4P's Hai Ba Trung": "/photos/pizza-4ps-hai-ba-trung.jpg",
  "Bunnyhillconcept":        "/photos/bunnyhill.jpg",
  // Add more local files here: "Place Name": "/photos/filename.jpg"

  // Hotlinked image overrides (curated via the ?debug=1 PhotoResolver)
  "Airbnb · Phú Nhuận":          "https://cf.bstatic.com/xdata/images/hotel/max1024x768/780326822.jpg?k=cbf6aceb2cd0a7d3f9ce3f6754d684310cecd0ef267834521b7d406e1cbf256f&o=",
  "Anan Saigon":                 "https://beaumondetraveler.com/wp-content/uploads/2024/01/w9999.png",
  "Bánh Canh Cua 87":            "https://cdn.corner.inc/place-photo/AelY_CvyJbF61I9wRqPjd0NMr0FamhP71BolSaD2d9TCtLOJetK9WKA_xTi95xmdJNfvl0wfOMsx8PM8hP-ORwJ5d4-kQVX9jstjdr0VOmMWqkGez1i-jEC9vWmzx4QvvPkm_uaT1F4HL3J-vhCVzdqbJnz_GTo8JC7ji9NSxtlfX8BHdKYc.jpeg",
  "Bánh Mì Hồng Hoa":            "https://thecitylane.com/wp-content/uploads/2025/03/X1002682.jpg",
  "Bánh Mì Huynh Hoa":           "https://banhmihuynhhoa.vn/wp-content/uploads/2024/05/cua-hang.png",
  "Bò Né Bà Nũi":                "https://img.mservice.com.vn/common/u/05e07d15ed1a84ee51cdfe60756960e55412b5dcd748a2e496a53522eb6597fa/1f7903fe-128b-407f-8dbd-5903cdfb7cb9iqaq0hpp.jpg",
  "Bò Né Thanh Tuyền":           "https://cdn.corner.inc/place-photo/ATJ83zhHJOWeMcruSAfgjAbNTLkXk1kmft9jD0UFQecfq5he2lklA3PQlNnhB3Px2b--KDzEd6I0nKGIruQvAVGw_s9xlpuGsl3eiq5JT-S6y9pDXF6ohnb24igk6S3V3OvO-ug6MpaMDp2hh-4447pdkRdXndJT58WtrCG_W4bKyXqJHTaY.jpeg",
  "Buffet Cửu Vân Long Premium": "https://pasgo.vn/Upload/anh-chi-tiet/slide-cuu-van-long-bitexco-1-normal-2280245160861.webp",
  "Bún Thịt Nướng Chị Tuyền":    "https://media.timeout.com/images/106285722/750/422/image.jpg",
  "Chạng Vạng Rooftop":          "https://mgisolutions-coffee.imgix.net/craft-coffee/chang-vang-rooftop-1.png",
  "Chill Skybar & Dining":       "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRI8Gljmt9qDyue1ErTOFjX0ut_9hc0k8ApNg&s",
  "Dalaland Coffee":             "https://en.kosupatravel.com/wp-content/uploads/2025/06/20240628102811.jpg",
  "Garden Kisses":               "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRw7I9uxh9sarowcG5xT3zyy5DrZgmzl3sxIw&s",
  "HAEU Beauty Salon":           "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/29/cf/c0/78/haeu-is-located-on-ngo.jpg?w=1200&h=-1&s=1",
  "HỢP 合 Skybar":                "https://vietnamnightlife.com/uploads/images/2025/12/1767001048-single_product2-hopskybarcover.jpg",
  "KUDOCHI Onsen":               "https://res.klook.com/images/w_1200,h_630,c_fill,q_65/w_80,x_15,y_15,g_south_west,l_Klook_water_br_trans_yhcmh3/activities/lrugybcx1y796rqqma8k/KUDOCHIOnsen:VietnamsFirstFullyPrivateJapaneseOnsenSauna-KlookSingapore.jpg",
  "Mặn Mòi (Tao Đàn)":           "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/30/ca/84/b6/khu-v-c-ngoai-tr-i-v.jpg?w=900&h=500&s=1",
  "MonoBooth Photobooth":        "https://www.reviewphotobooth.com/storage/categories/logos/JwmkGgjlRZbes8Qo6ZBWCL5yAenycLT9ONVtQJaR.jpg",
  "ngâm CAFE":                   "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2d/0e/4a/4e/ngam-ca-phe.jpg?w=900&h=500&s=1",
  "Ngọt Ngào":                   "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTh42G6TCGBTRilgLEyDDEtf8m1qp53UF67aA&s",
  "nhà tạo cafe":                "https://lh3.googleusercontent.com/gps-cs-s/APNQkAGdYvnvLZi2HBYhVgqhyJ8Fj5te-sQ8f9aW-O-L3CXl093xWgT9mGz9fT6Fo1vS7kRn90RVIoMkzhCJKNRuQE5aOkAiqki2bkLN10-mjYNp6qA3Y2w66eaqKCI5hCDSLov8DGe_CjyVI5k=w289-h312-n-k-no",
  "Oasis Cafe":                  "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2e/fa/8f/2a/caption.jpg?w=200&h=200&s=1",
  "PANG PANG CRAB POT":          "https://lh3.googleusercontent.com/gps-cs-s/APNQkAHZqn1LQXnKpzEm4P1FecfcqVwUaCaa6PAu3xJPrRtUNZXn_I_mU3ogX5Cf6DkSw_tMHK8NYobOiKO9nZDwkVAONXIWg_WJgUwqJuzVfKjaUNuoI8D71Xknj6gkeNssjt0NL_XG8maA4m7c=s1360-w1360-h1020-rw",
  "Phở Miến gà Kỳ Đồng":         "https://images2.thanhnien.vn/Uploaded/2014/saigonamthuc.thanhnien.com.vn/Pictures201405/Tan_Nhan/MiengaKydong3.jpg",
  "Phở Việt Nam":                "https://lh3.googleusercontent.com/gps-cs-s/APNQkAHaIXoXc6mY9trG8wAVr08BWpLqqop_kuCUic5-S0wVVA-S523QE6mgG_689KkXuACqKA99d2umtVGfasfNq_p679mtWf_0WYastFR_Xd9gHzjXkQSsHUckq8fFaANbMNNH08-vZxuVWOlY=s1360-w1360-h1020-rw",
  "Quán Thuý 94 - Miến Cua":     "https://cdn.corner.inc/place-photo/ATJ83zgtItEA0nOoaCafJ1UCDEogQDclPRXM8EIshAmLPbncdBf-puWbrp53gbQI_AsKLUP2qJYmI1a9v1qVX-OqkyGxwsIM3C9FQH99pCCGamceQ5XaDH77sUjrrjOZc4HCTtdeYd9KlyWF7L8kxQM7biWUvM-I_EHxqlBDqIbfK35hqwGg.jpeg",
  "Ramen Tomidaya":              "https://lh3.googleusercontent.com/gps-cs-s/APNQkAGJCf_mVC0bMNbdiY6OpVMVZ-xYdIRUfJrV2T5ehvsfV5RJVcNNrPup3t6F6Zbjs2wYkg17t1OUQHOTNhyrUV6s52bCu1d5LeY7kz7IWEYm2oMCFaLC-VJxhFoxjIhOBLC93oauck8h7i5v=s1354-k-no",
  "Social Club Rooftop Bar":     "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2d/d1/e6/e9/social-club-rooftop-bar.jpg?w=900&h=500&s=1",
  "Sol Kitchen & Bar":           "https://lh3.googleusercontent.com/gps-cs-s/APNQkAF36XwcKhDnGsGunUd9jH0jSJOzyGQfPff0IQJN7cB6BfFVHH3fpVFj3_nVwidj3Fvtq0Isdx6z-CmCSpeMjnBJWsjLqgW4VkBvHKM_JYqdTFpt3z8yxkYEBOmSJh3rxCvermDQ=w289-h312-n-k-no",
  "The 350F Dessert & More":     "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSZ1qMsJl5W-9o1vwHZcmpg0lmEWLJaDjl_hw&s",
  "The Cafe Apartment":          "https://cms.vietnamcoracle.com/wp-content/uploads/2024/10/42-Nguyen-Hue-Finished-4294.jpg",
  "The New Playground":          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSO-nSfGBysCyP2Bu_f4oqNtiHDUrpf9iZxFA&s",
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
