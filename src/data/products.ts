const pTeeBlack =
  "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=90&w=1600";
const pTeeCream =
  "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=90&w=1600";
const pLsCharcoal =
  "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&q=90&w=1600";
const pHoodieBlack =
  "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=90&w=1600";
const pHoodieCream =
  "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=90&w=1600";
const pHoodieGrey =
  "https://images.unsplash.com/photo-1556821840-41031d20f69d?auto=format&fit=crop&q=90&w=1600";
const pCapTrucker =
  "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&q=90&w=1600";
const pCapDad =
  "https://images.unsplash.com/photo-1588850561338-20ab2fa788f0?auto=format&fit=crop&q=90&w=1600";
const pSetRoyal =
  "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&q=90&w=1600";
const pLsFriend =
  "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&q=90&w=1600";
const pTankWhite =
  "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=90&w=1600";
const pHoodieGold =
  "https://images.unsplash.com/photo-1620799140188-3b2a02fd9a55?auto=format&fit=crop&q=90&w=1600";

export type Category = "tees" | "hoodies" | "caps" | "sets";
export type ProductTag = "new-drop" | "limited" | "best-seller" | "sold-out" | "just-in";

export interface Review {
  name: string;
  rating: number;
  body: string;
  date: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  category: Category;
  price: number;
  images: string[];
  sizes: string[];
  colors: string[];
  stock: number;
  tag?: ProductTag;
  description: string;
  reviews: Review[];
  createdAt?: string;
}

export interface Ad {
  id: string;
  title: string;
  subtitle?: string;
  format: "banner" | "popup" | "card";
  imageUrl?: string;
  linkUrl?: string;
  badge?: string;
  active: boolean;
  expiryDate: string;
  createdAt: string;
  bgColor?: string;
  textColor?: string;
  clicks?: number;
}

const STANDARD_SIZES = ["S", "M", "L", "XL", "XXL"];

export const SEED_PRODUCTS: Product[] = [
  {
    id: "p1",
    slug: "situationship-tee-black",
    name: "SITUATIONSHIP TEE",
    subtitle: "HEAVYWEIGHT COTTON / JET BLACK",
    category: "tees",
    price: 24500,
    images: [pTeeBlack, pTeeCream],
    sizes: STANDARD_SIZES,
    colors: ["Jet Black", "Off-White"],
    stock: 24,
    tag: "just-in",
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    description:
      '260gsm boxy fit tee. Drop shoulder, ribbed crew, garment-washed for a broken-in hand. Printed front: "JUST A FRIEND."',
    reviews: [
      {
        name: "Tunde A.",
        rating: 5,
        body: "Fit is unreal. Arrived Abuja in two days.",
        date: "2025-04-02",
      },
      {
        name: "Zara M.",
        rating: 4,
        body: "Heavy but breathable. Wear it everywhere.",
        date: "2025-04-18",
      },
    ],
  },
  {
    id: "p2",
    slug: "no-strings-tee-cream",
    name: "NO STRINGS TEE",
    subtitle: "HEAVYWEIGHT COTTON / OFF-WHITE",
    category: "tees",
    price: 24500,
    images: [pTeeCream, pTeeBlack],
    sizes: STANDARD_SIZES,
    colors: ["Off-White", "Jet Black"],
    stock: 31,
    tag: "new-drop",
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    description: "The cream colorway. Same 260gsm cut, pigment-washed for that lived-in look.",
    reviews: [{ name: "Ifeanyi O.", rating: 5, body: "Cleanest fit I own.", date: "2025-03-22" }],
  },
  {
    id: "p3",
    slug: "delusional-long-sleeve",
    name: "DELUSIONAL LS",
    subtitle: "PIGMENT DYED / WASHED CHARCOAL",
    category: "tees",
    price: 28000,
    images: [pLsCharcoal, pTeeBlack],
    sizes: STANDARD_SIZES,
    colors: ["Washed Charcoal"],
    stock: 2,
    tag: "limited",
    description: "Boxy long sleeve in pigment-dyed charcoal. Extended hem, ribbed cuffs.",
    reviews: [
      {
        name: "Adaeze K.",
        rating: 5,
        body: "Heavyweight, drapes beautifully.",
        date: "2025-05-01",
      },
    ],
  },
  {
    id: "p4",
    slug: "seen-at-2am-tee",
    name: '"SEEN AT 2AM" TEE',
    subtitle: "OVERSIZED / JET BLACK",
    category: "tees",
    price: 22000,
    images: [pTeeBlack, pTeeCream],
    sizes: STANDARD_SIZES,
    colors: ["Jet Black"],
    stock: 18,
    description: "Back graphic prints the message you sent and they ignored.",
    reviews: [{ name: "Kemi A.", rating: 4, body: "Funny, well made.", date: "2025-04-12" }],
  },
  {
    id: "p5",
    slug: "vibes-only-hoodie",
    name: "VIBES ONLY HOODIE",
    subtitle: "450GSM FRENCH TERRY / BLACK",
    category: "hoodies",
    price: 48000,
    images: [pHoodieBlack, pHoodieCream],
    sizes: STANDARD_SIZES,
    colors: ["Jet Black", "Off-White"],
    stock: 14,
    tag: "best-seller",
    description:
      "Heavyweight 450gsm french terry. Cropped boxy fit, double-lined hood, kangaroo pocket.",
    reviews: [
      { name: "Femi D.", rating: 5, body: "Worth every kobo. Heavy hoodie.", date: "2025-03-18" },
      {
        name: "Nene U.",
        rating: 5,
        body: "Bought black and cream. Wearing both daily.",
        date: "2025-04-25",
      },
    ],
  },
  {
    id: "p6",
    slug: "brotherly-love-hoodie",
    name: '"BROTHERLY LOVE" HOODIE',
    subtitle: "450GSM FRENCH TERRY / OFF-WHITE",
    category: "hoodies",
    price: 48000,
    images: [pHoodieCream, pHoodieBlack],
    sizes: STANDARD_SIZES,
    colors: ["Off-White"],
    stock: 9,
    tag: "limited",
    description:
      "Back embroidery in tonal cream. The ones you keep getting introduced as a brother in.",
    reviews: [{ name: "Bola O.", rating: 5, body: "Embroidery is clean.", date: "2025-04-30" }],
  },
  {
    id: "p7",
    slug: "status-quo-zip-hoodie",
    name: "STATUS QUO ZIP",
    subtitle: "WASHED FRENCH TERRY / GREY",
    category: "hoodies",
    price: 52000,
    images: [pHoodieGrey, pHoodieBlack],
    sizes: STANDARD_SIZES,
    colors: ["Washed Grey"],
    stock: 7,
    tag: "new-drop",
    description: "Full-zip, washed for a vintage hand. YKK hardware, ribbed cuffs and hem.",
    reviews: [{ name: "Chidi V.", rating: 5, body: "Quality is insane.", date: "2025-05-04" }],
  },
  {
    id: "p8",
    slug: "friendzone-hoodie-black",
    name: "FRIENDZONE HOODIE",
    subtitle: "450GSM / JET BLACK",
    category: "hoodies",
    price: 45000,
    images: [pHoodieBlack, pHoodieGrey],
    sizes: STANDARD_SIZES,
    colors: ["Jet Black"],
    stock: 0,
    tag: "sold-out",
    description: "Sold out. Restock list opens on the next drop.",
    reviews: [],
  },
  {
    id: "p9",
    slug: "archive-trucker-cap",
    name: "ARCHIVE TRUCKER",
    subtitle: "MESH BACK / BLACK",
    category: "caps",
    price: 15000,
    images: [pCapTrucker, pCapDad],
    sizes: ["One Size"],
    colors: ["Jet Black"],
    stock: 22,
    tag: "new-drop",
    description: "Snap-back trucker, mesh ventilation, distressed brim, white tonal embroidery.",
    reviews: [
      {
        name: "Sade R.",
        rating: 5,
        body: "Fits perfect, looks better in person.",
        date: "2025-05-11",
      },
    ],
  },
  {
    id: "p10",
    slug: "zone-warning-dad-hat",
    name: "ZONE WARNING DAD HAT",
    subtitle: "WASHED COTTON / BLACK",
    category: "caps",
    price: 12000,
    images: [pCapDad, pCapTrucker],
    sizes: ["One Size"],
    colors: ["Jet Black"],
    stock: 30,
    description: "Low-profile dad hat. Curved brim, adjustable strap, tonal embroidery.",
    reviews: [{ name: "Mide T.", rating: 4, body: "Clean cap. Lightweight.", date: "2025-04-08" }],
  },
  {
    id: "p11",
    slug: "jaf-monogram-cap",
    name: "JAF MONOGRAM CAP",
    subtitle: "6 PANEL / BLACK",
    category: "caps",
    price: 14000,
    images: [pCapDad, pCapTrucker],
    sizes: ["One Size"],
    colors: ["Jet Black"],
    stock: 16,
    description: "6-panel cap with embroidered JAF monogram on the front panel.",
    reviews: [],
  },
  {
    id: "p12",
    slug: "no-labels-long-sleeve",
    name: "NO LABELS LS",
    subtitle: "RIBBED COTTON / OFF-WHITE",
    category: "tees",
    price: 26000,
    images: [pTeeCream, pLsCharcoal],
    sizes: STANDARD_SIZES,
    colors: ["Off-White"],
    stock: 19,
    description: "Slim ribbed long sleeve. Goes under everything.",
    reviews: [{ name: "Ronke A.", rating: 5, body: "Perfect base layer.", date: "2025-04-22" }],
  },
  {
    id: "p13",
    slug: "jaf-up-down-royal-blue",
    name: "JAF UP & DOWN SET — ROYAL BLUE",
    subtitle: "TEE + JOGGER SET / ROYAL BLUE",
    category: "sets",
    price: 38000,
    images: [pSetRoyal, pTeeCream],
    sizes: STANDARD_SIZES,
    colors: ["Royal Blue", "Black/Gold"],
    stock: 11,
    tag: "just-in",
    description:
      "The Up & Down: heavyweight white cotton tee with a bold blue JAF monogram, paired with matching royal blue joggers. Trademark JAF mark on both pieces.",
    reviews: [
      {
        name: "Halima B.",
        rating: 5,
        body: "Set fits like a glove. The blue is loud in the best way.",
        date: "2026-05-22",
      },
      {
        name: "Tobi E.",
        rating: 5,
        body: "Got compliments all day in Abuja. Quality is real.",
        date: "2026-05-28",
      },
      {
        name: "Yusuf A.",
        rating: 4,
        body: "Wish it came in more colors. Bringing the gold one next.",
        date: "2026-06-01",
      },
    ],
  },
  {
    id: "p14",
    slug: "jaf-friend-long-sleeve-white",
    name: "JAF JUST A FRIEND LONG SLEEVE",
    subtitle: "HEAVYWEIGHT COTTON / WHITE",
    category: "tees",
    price: 28500,
    images: [pLsFriend, pLsCharcoal],
    sizes: STANDARD_SIZES,
    colors: ["White"],
    stock: 17,
    tag: "just-in",
    description:
      "Crisp white long sleeve with the trademark JAF mark on chest and a bold JUST A FRIEND banner across the back. 260gsm cotton, drop shoulder.",
    reviews: [
      {
        name: "Chioma N.",
        rating: 5,
        body: "The back print is everything. People stop me.",
        date: "2026-05-19",
      },
      {
        name: "Daniel I.",
        rating: 5,
        body: "Heavyweight as promised. Worth it.",
        date: "2026-05-25",
      },
      {
        name: "Aisha L.",
        rating: 4,
        body: "Runs slightly boxy — get true size.",
        date: "2026-06-03",
      },
      {
        name: "Mark B.",
        rating: 5,
        body: "JAF the friend zone with a body count. Iconic.",
        date: "2026-06-08",
      },
    ],
  },
  {
    id: "p15",
    slug: "jaf-trademark-tank-white",
    name: "JAF TRADEMARK TANK",
    subtitle: "RIBBED COTTON VEST / WHITE",
    category: "tees",
    price: 16500,
    images: [pTankWhite, pTeeCream],
    sizes: ["S", "M", "L", "XL"],
    colors: ["White", "Black/Gold"],
    stock: 25,
    tag: "just-in",
    description:
      "Ribbed white cotton tank with the trademark JAF mark centered on chest. Made-to-order. Layer it or wear it solo.",
    reviews: [
      {
        name: "Zee O.",
        rating: 5,
        body: "Perfect under everything. Ribbing is premium.",
        date: "2026-05-30",
      },
      { name: "Rita F.", rating: 4, body: "Clean cut. Gym-ready.", date: "2026-06-02" },
      {
        name: "Sam K.",
        rating: 5,
        body: "Said every liar with a second phone — bought 3.",
        date: "2026-06-10",
      },
    ],
  },
  {
    id: "p16",
    slug: "jaf-hoodie-black-gold",
    name: "JAF HOODIE — BLACK / GOLD",
    subtitle: "450GSM FRENCH TERRY / BLACK + GOLD",
    category: "hoodies",
    price: 52000,
    images: [pHoodieGold, pHoodieBlack],
    sizes: STANDARD_SIZES,
    colors: ["Black/Gold"],
    stock: 9,
    tag: "limited",
    description:
      "Heavyweight 450gsm black french terry hoodie with a foiled gold JAF monogram on the chest. The signature JAF black/gold colorway.",
    reviews: [
      {
        name: "Ifeoma J.",
        rating: 5,
        body: "The gold print catches light. Looks luxury in person.",
        date: "2026-05-15",
      },
      {
        name: "Bola R.",
        rating: 5,
        body: "My new favorite hoodie. Heavy and soft.",
        date: "2026-05-21",
      },
      {
        name: "Kunle D.",
        rating: 4,
        body: "Limited drop — glad I copped early.",
        date: "2026-05-27",
      },
      {
        name: "Nana O.",
        rating: 5,
        body: "Black and gold is THE JAF colorway. Loud.",
        date: "2026-06-05",
      },
    ],
  },
];

export const CATEGORY_LABELS: Record<Category, string> = {
  tees: "TEES",
  hoodies: "HOODIES",
  caps: "CAPS",
  sets: "SETS",
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export function getProductSmartTag(
  product: { id: string; stock: number; createdAt?: string; tag?: string },
  orders: any[] = [],
): "sold-out" | "limited" | "best-seller" | "just-in" | "new-drop" | undefined {
  // 1. Sold Out is highest priority
  if (product.stock === 0) {
    return "sold-out";
  }

  // 2. Limited is next priority
  if (product.stock > 0 && product.stock <= 3) {
    return "limited";
  }

  // 3. Best Seller
  // Calculate total units sold
  const soldQty = orders
    .flatMap((o) => o?.items || [])
    .filter((item) => item?.productId === product.id)
    .reduce((sum, item) => sum + (item?.qty || 0), 0);

  if (soldQty >= 3) {
    return "best-seller";
  }

  // 4. Just In / New Drop based on createdAt
  if (product.createdAt) {
    const createdDate = new Date(product.createdAt);
    if (!isNaN(createdDate.getTime())) {
      const ageMs = Date.now() - createdDate.getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const oneWeekMs = 7 * oneDayMs;

      if (ageMs > 0) {
        if (ageMs <= oneDayMs) {
          return "just-in";
        }
        if (ageMs <= oneWeekMs) {
          return "new-drop";
        }
      }
    }
  }

  // Fallback to pre-existing static tag or undefined
  if (product.tag) {
    return product.tag as any;
  }

  return undefined;
}
