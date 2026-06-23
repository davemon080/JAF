import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SEED_PRODUCTS, type Product } from "@/data/products";
import { DEFAULT_ZONES, type DeliveryZone } from "@/data/zones";
import logoAsset from "@/assets/jaf-logo.asset.json";
import {
  saveProductToFirestore,
  deleteProductFromFirestore,
  saveZoneToFirestore,
  saveCouponToFirestore,
  deleteCouponFromFirestore,
  saveOrderToFirestore,
  deleteOrderFromFirestore,
  saveBrandingToFirestore,
  type Ad,
  saveAdToFirestore,
  deleteAdFromFirestore,
} from "./firebase";

// ---------- Cart ----------
export interface CartLine {
  productId: string;
  size: string;
  color: string;
  qty: number;
}

interface CartState {
  lines: CartLine[];
  add: (line: CartLine) => void;
  remove: (i: number) => void;
  setQty: (i: number, qty: number) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (line) =>
        set((s) => {
          const idx = s.lines.findIndex(
            (l) => l.productId === line.productId && l.size === line.size && l.color === line.color,
          );
          if (idx >= 0) {
            const copy = [...s.lines];
            copy[idx] = { ...copy[idx], qty: copy[idx].qty + line.qty };
            return { lines: copy };
          }
          return { lines: [...s.lines, line] };
        }),
      remove: (i) => set((s) => ({ lines: s.lines.filter((_, idx) => idx !== i) })),
      setQty: (i, qty) =>
        set((s) => {
          const copy = [...s.lines];
          copy[i] = { ...copy[i], qty: Math.max(1, qty) };
          return { lines: copy };
        }),
      clear: () => set({ lines: [] }),
    }),
    { name: "jaf-cart" },
  ),
);

// ---------- Wishlist ----------
interface WishlistState {
  ids: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) =>
        set((s) => ({
          ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [...s.ids, id],
        })),
      has: (id) => get().ids.includes(id),
    }),
    { name: "jaf-wishlist" },
  ),
);

// ---------- Orders ----------
export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  size: string;
  color: string;
  qty: number;
}

export interface Order {
  ref: string;
  createdAt: string;
  customer: { name: string; email: string; phone: string };
  delivery: { zoneId: string; zoneLabel: string; fee: number; address: string; notes?: string };
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: "new" | "packed" | "out" | "delivered";
  rider?: string;
  couponCode?: string;
}

interface OrdersState {
  orders: Order[];
  add: (o: Order) => void;
  updateStatus: (ref: string, status: Order["status"]) => void;
  assignRider: (ref: string, rider: string) => void;
  remove: (ref: string) => void;
  setOrdersRaw: (orders: Order[]) => void;
}

export const useOrders = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      add: (o) => {
        set((s) => ({ orders: [o, ...s.orders] }));
        saveOrderToFirestore(o).catch((err) => console.error("Firestore sync error:", err));
      },
      updateStatus: (ref, status) => {
        set((s) => ({ orders: s.orders.map((o) => (o.ref === ref ? { ...o, status } : o)) }));
        const updated = get().orders.find((o) => o.ref === ref);
        if (updated) {
          saveOrderToFirestore(updated).catch((err) => console.error("Firestore sync error:", err));
        }
      },
      assignRider: (ref, rider) => {
        set((s) => ({ orders: s.orders.map((o) => (o.ref === ref ? { ...o, rider } : o)) }));
        const updated = get().orders.find((o) => o.ref === ref);
        if (updated) {
          saveOrderToFirestore(updated).catch((err) => console.error("Firestore sync error:", err));
        }
      },
      remove: (ref) => {
        set((s) => ({ orders: s.orders.filter((o) => o.ref !== ref) }));
        deleteOrderFromFirestore(ref).catch((err) => console.error("Firestore sync error:", err));
      },
      setOrdersRaw: (orders) => set({ orders }),
    }),
    { name: "jaf-orders" },
  ),
);

// ---------- Coupons ----------
export interface Coupon {
  code: string;
  percent: number;
  expiry: string;
}

interface CouponState {
  coupons: Coupon[];
  add: (c: Coupon) => void;
  remove: (code: string) => void;
  setCouponsRaw: (coupons: Coupon[]) => void;
}

export const useCoupons = create<CouponState>()(
  persist(
    (set) => ({
      coupons: [
        { code: "FIRSTJAF", percent: 10, expiry: "2026-12-31" },
        { code: "ABUJA5", percent: 5, expiry: "2026-12-31" },
      ],
      add: (c) => {
        set((s) => ({ coupons: [...s.coupons.filter((x) => x.code !== c.code), c] }));
        saveCouponToFirestore(c).catch((err) => console.error("Firestore sync error:", err));
      },
      remove: (code) => {
        set((s) => ({ coupons: s.coupons.filter((c) => c.code !== code) }));
        deleteCouponFromFirestore(code).catch((err) => console.error("Firestore sync error:", err));
      },
      setCouponsRaw: (coupons) => set({ coupons }),
    }),
    { name: "jaf-coupons" },
  ),
);

// ---------- Catalog (admin-editable) ----------
interface CatalogState {
  products: Product[];
  zones: DeliveryZone[];
  branding: { logoUrl: string; logoShape: "circle" | "square" };
  upsert: (p: Product) => void;
  remove: (id: string) => void;
  setZones: (z: DeliveryZone[]) => void;
  reset: () => void;
  setProductsRaw: (products: Product[]) => void;
  setZonesRaw: (zones: DeliveryZone[]) => void;
  setBranding: (branding: { logoUrl: string; logoShape: "circle" | "square" }) => void;
  setBrandingRaw: (branding: { logoUrl: string; logoShape: "circle" | "square" }) => void;
}

export const useCatalog = create<CatalogState>()(
  persist(
    (set) => ({
      products: SEED_PRODUCTS,
      zones: DEFAULT_ZONES,
      branding: { logoUrl: logoAsset.url, logoShape: "square" },
      upsert: (p) => {
        set((s) => {
          const i = s.products.findIndex((x) => x.id === p.id);
          if (i >= 0) {
            const copy = [...s.products];
            copy[i] = p;
            return { products: copy };
          }
          return { products: [p, ...s.products] };
        });
        saveProductToFirestore(p).catch((err) => console.error("Firestore sync error:", err));
      },
      remove: (id) => {
        set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
        deleteProductFromFirestore(id).catch((err) => console.error("Firestore sync error:", err));
      },
      setZones: (zones) => {
        set({ zones });
        zones.forEach((z) => {
          saveZoneToFirestore(z).catch((err) => console.error("Firestore sync error:", err));
        });
      },
      reset: () => {
        set({ products: SEED_PRODUCTS, zones: DEFAULT_ZONES });
        SEED_PRODUCTS.forEach((p) => {
          saveProductToFirestore(p).catch((err) => console.error("Firestore sync error:", err));
        });
        DEFAULT_ZONES.forEach((z) => {
          saveZoneToFirestore(z).catch((err) => console.error("Firestore sync error:", err));
        });
      },
      setProductsRaw: (products) => set({ products }),
      setZonesRaw: (zones) => set({ zones }),
      setBranding: (branding) => {
        set({ branding });
        saveBrandingToFirestore(branding).catch((err) =>
          console.error("Firestore sync error:", err),
        );
      },
      setBrandingRaw: (branding) => set({ branding }),
    }),
    {
      name: "jaf-catalog",
      version: 4,
      migrate: () => ({
        products: SEED_PRODUCTS,
        zones: DEFAULT_ZONES,
        branding: { logoUrl: logoAsset.url, logoShape: "square" },
      }),
    },
  ),
);

// ---------- Admin auth (mock) ----------
interface AdminState {
  authed: boolean;
  login: (pw: string) => boolean;
  logout: () => void;
  setAuthed: (authed: boolean) => void;
}

export const ADMIN_PASSWORD = "jaf-admin-2026";

export const useAdmin = create<AdminState>()(
  persist(
    (set) => ({
      authed: false,
      login: (pw) => {
        if (pw === ADMIN_PASSWORD) {
          set({ authed: true });
          return true;
        }
        return false;
      },
      logout: () => set({ authed: false }),
      setAuthed: (authed) => set({ authed }),
    }),
    { name: "jaf-admin" },
  ),
);

// ---------- Ads State ----------
interface AdsState {
  ads: Ad[];
  upsert: (ad: Ad) => void;
  remove: (id: string) => void;
  setAdsRaw: (ads: Ad[]) => void;
}

export const useAds = create<AdsState>()(
  persist(
    (set) => ({
      ads: [],
      upsert: (ad) => {
        set((s) => {
          const idx = s.ads.findIndex((x) => x.id === ad.id);
          if (idx >= 0) {
            const copy = [...s.ads];
            copy[idx] = ad;
            return { ads: copy };
          }
          return { ads: [ad, ...s.ads] };
        });
        saveAdToFirestore(ad).catch((err) => console.error("Firestore sync error:", err));
      },
      remove: (id) => {
        set((s) => ({ ads: s.ads.filter((ad) => ad.id !== id) }));
        deleteAdFromFirestore(id).catch((err) => console.error("Firestore sync error:", err));
      },
      setAdsRaw: (ads) => set({ ads }),
    }),
    { name: "jaf-ads" },
  ),
);
