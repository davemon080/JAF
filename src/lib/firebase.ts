/* eslint-disable @typescript-eslint/no-explicit-any */
import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  doc,
  collection,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  getDocFromServer,
  onSnapshot,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { SEED_PRODUCTS, type Product, type Ad } from "@/data/products";
import { DEFAULT_ZONES, type DeliveryZone } from "@/data/zones";
import logoAsset from "@/assets/jaf-logo.asset.json";

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
    useFetchStreams: false,
  },
  firebaseConfig.firestoreDatabaseId || "(default)",
);

export interface CustomUser {
  uid: string;
  email: string;
  displayName?: string;
  role?: string;
}

class CustomAuth {
  private listeners: ((user: CustomUser | null) => void)[] = [];
  public currentUser: CustomUser | null = null;

  constructor() {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("jaf-user-session");
      if (saved) {
        try {
          this.currentUser = JSON.parse(saved);
        } catch (e) {
          this.currentUser = null;
        }
      }
    }
  }

  onAuthStateChanged(callback: (user: CustomUser | null) => void) {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private triggerChange() {
    this.listeners.forEach((l) => l(this.currentUser));
  }

  setCurrentUser(user: CustomUser | null) {
    this.currentUser = user;
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      if (user) {
        localStorage.setItem("jaf-user-session", JSON.stringify(user));
      } else {
        localStorage.removeItem("jaf-user-session");
      }
    }
    this.triggerChange();
  }

  signOut() {
    this.setCurrentUser(null);
  }
}

export const auth = new CustomAuth();

// Test the connection as instructed by critical directive
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export function cleanUndefined(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  }
  if (typeof obj === "object" && obj.constructor === Object) {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        res[key] = cleanUndefined(val);
      }
    }
    return res;
  }
  return obj;
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ------ API Helpers ------

export async function fetchProductsFromFirestore(): Promise<Product[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "products"));
    const products: Product[] = [];
    querySnapshot.forEach((docSnap) => {
      products.push(docSnap.data() as Product);
    });
    return products;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "products");
    return [];
  }
}

export async function saveProductToFirestore(product: Product): Promise<void> {
  try {
    const docRef = doc(db, "products", product.id);
    await setDoc(docRef, cleanUndefined(product));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `products/${product.id}`);
  }
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "products", productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
  }
}

export async function fetchZonesFromFirestore(): Promise<DeliveryZone[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "zones"));
    const zones: DeliveryZone[] = [];
    querySnapshot.forEach((docSnap) => {
      zones.push(docSnap.data() as DeliveryZone);
    });
    return zones;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "zones");
    return [];
  }
}

export async function saveZoneToFirestore(zone: DeliveryZone): Promise<void> {
  try {
    await setDoc(doc(db, "zones", zone.id), cleanUndefined(zone));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `zones/${zone.id}`);
  }
}

export async function fetchCouponsFromFirestore() {
  try {
    const querySnapshot = await getDocs(collection(db, "coupons"));
    const coupons: any[] = [];
    querySnapshot.forEach((docSnap) => {
      coupons.push(docSnap.data());
    });
    return coupons;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "coupons");
    return [];
  }
}

export async function saveCouponToFirestore(coupon: {
  code: string;
  percent: number;
  expiry: string;
}) {
  try {
    await setDoc(doc(db, "coupons", coupon.code.toUpperCase()), cleanUndefined(coupon));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `coupons/${coupon.code}`);
  }
}

export async function deleteCouponFromFirestore(code: string) {
  try {
    await deleteDoc(doc(db, "coupons", code.toUpperCase()));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `coupons/${code}`);
  }
}

export async function fetchOrdersFromFirestore(): Promise<any[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "orders"));
    const orders: any[] = [];
    querySnapshot.forEach((docSnap) => {
      orders.push(docSnap.data());
    });
    // sort orders by createdAt descending
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "orders");
    return [];
  }
}

export async function saveOrderToFirestore(order: any): Promise<void> {
  try {
    await setDoc(doc(db, "orders", order.ref), cleanUndefined(order));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `orders/${order.ref}`);
  }
}

export async function deleteOrderFromFirestore(ref: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "orders", ref));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `orders/${ref}`);
  }
}

export async function fetchBrandingFromFirestore(): Promise<{
  logoUrl: string;
  logoShape: "circle" | "square";
} | null> {
  try {
    const docSnap = await getDoc(doc(db, "settings", "branding"));
    if (docSnap.exists()) {
      return docSnap.data() as { logoUrl: string; logoShape: "circle" | "square" };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, "settings/branding");
    return null;
  }
}

export async function saveBrandingToFirestore(branding: {
  logoUrl: string;
  logoShape: "circle" | "square";
}): Promise<void> {
  try {
    await setDoc(doc(db, "settings", "branding"), cleanUndefined(branding));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "settings/branding");
  }
}

// ------ Ads Helpers ------
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
}

export async function fetchAdsFromFirestore(): Promise<Ad[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "ads"));
    const ads: Ad[] = [];
    querySnapshot.forEach((docSnap) => {
      ads.push(docSnap.data() as Ad);
    });
    return ads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "ads");
    return [];
  }
}

export async function saveAdToFirestore(ad: Ad): Promise<void> {
  try {
    const docRef = doc(db, "ads", ad.id);
    await setDoc(docRef, cleanUndefined(ad));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `ads/${ad.id}`);
  }
}

export async function deleteAdFromFirestore(adId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "ads", adId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `ads/${adId}`);
  }
}

export async function recordUserInFirestore(
  uid: string,
  email: string,
  fullName?: string,
): Promise<void> {
  try {
    const emailKey = email.toLowerCase().trim();
    if (!emailKey) return;
    const docRef = doc(db, "users", emailKey);
    await setDoc(
      docRef,
      {
        lastLoginAt: new Date().toISOString(),
      },
      { merge: true },
    );
  } catch (err) {
    console.error("Error recording user:", err);
  }
}

export async function customSignUp(email: string, password: string, fullName: string) {
  try {
    const emailKey = email.toLowerCase().trim();
    if (!emailKey) throw new Error("Email is required.");

    const docRef = doc(db, "users", emailKey);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      throw new Error("An account with this email already exists.");
    }

    const uid = "u_" + Math.random().toString(36).substr(2, 9);
    const newUser = {
      uid,
      email: emailKey,
      fullName: fullName || "",
      password, // store user's password as requested in the table
      role: "user",
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    await setDoc(docRef, newUser);
    auth.setCurrentUser({ uid, email: emailKey, displayName: fullName, role: "user" });
    return newUser;
  } catch (error) {
    console.error("Custom sign up error:", error);
    throw error;
  }
}

export async function customSignIn(email: string, password: string) {
  try {
    const emailKey = email.toLowerCase().trim();
    if (!emailKey) throw new Error("Email is required.");

    const docRef = doc(db, "users", emailKey);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error("No account found with this email. Please register first.");
    }

    const userData = docSnap.data();
    if (userData.password !== password) {
      throw new Error("Incorrect password. Please try again.");
    }

    // Update lastLoginAt
    await setDoc(
      docRef,
      {
        lastLoginAt: new Date().toISOString(),
      },
      { merge: true },
    );

    const verifiedUser = {
      uid: userData.uid,
      email: userData.email,
      displayName: userData.fullName || "",
      role: userData.role || "user",
    };

    auth.setCurrentUser(verifiedUser);
    return verifiedUser;
  } catch (error) {
    console.error("Custom sign in error:", error);
    throw error;
  }
}

export async function customSignOut() {
  auth.signOut();
}

export interface UserDeliveryDetails {
  zoneId: "abuja" | "lafia";
  address: string;
  notes?: string;
  phone?: string;
  fullName?: string;
}

export async function getUserDeliveryDetails(email: string): Promise<UserDeliveryDetails | null> {
  try {
    const emailKey = email.toLowerCase().trim();
    if (!emailKey) return null;
    const docSnap = await getDoc(doc(db, "users", emailKey));
    if (docSnap.exists()) {
      const data = docSnap.data();
      return (data.deliveryDetails as UserDeliveryDetails) || null;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${email}`);
    return null;
  }
}

export async function saveUserDeliveryDetails(
  email: string,
  details: UserDeliveryDetails,
): Promise<void> {
  try {
    const emailKey = email.toLowerCase().trim();
    if (!emailKey) return;
    await setDoc(
      doc(db, "users", emailKey),
      {
        deliveryDetails: cleanUndefined(details),
      },
      { merge: true },
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${email}`);
  }
}

// ------ Auto-Seeding ------

export async function seedFirebaseIfEmpty() {
  try {
    const productsSnapshot = await getDocs(collection(db, "products"));
    if (productsSnapshot.empty) {
      console.log("Seeding products to Firestore...");
      for (const product of SEED_PRODUCTS) {
        await setDoc(doc(db, "products", product.id), cleanUndefined(product));
      }
    }

    const zonesSnapshot = await getDocs(collection(db, "zones"));
    if (zonesSnapshot.empty) {
      console.log("Seeding zones to Firestore...");
      for (const zone of DEFAULT_ZONES) {
        await setDoc(doc(db, "zones", zone.id), cleanUndefined(zone));
      }
    }

    const couponsSnapshot = await getDocs(collection(db, "coupons"));
    if (couponsSnapshot.empty) {
      console.log("Seeding default coupons to Firestore...");
      const defaultCoupons = [
        { code: "FIRSTJAF", percent: 10, expiry: "2026-12-31" },
        { code: "ABUJA5", percent: 5, expiry: "2026-12-31" },
      ];
      for (const coupon of defaultCoupons) {
        await setDoc(doc(db, "coupons", coupon.code), cleanUndefined(coupon));
      }
    }

    const brandingSnap = await getDoc(doc(db, "settings", "branding"));
    if (!brandingSnap.exists()) {
      console.log("Seeding default branding settings to Firestore...");
      await setDoc(
        doc(db, "settings", "branding"),
        cleanUndefined({
          logoUrl: logoAsset.url,
          logoShape: "square",
        }),
      );
    } else {
      const data = brandingSnap.data();
      if (data && (data.logoUrl?.includes("/__l5e") || data.logoUrl?.includes("jaf-logo.jpg"))) {
        console.log("Updating outdated placeholder logo URL in Firestore...");
        await setDoc(
          doc(db, "settings", "branding"),
          {
            logoUrl: logoAsset.url,
          },
          { merge: true },
        );
      }
    }

    const adminSnap = await getDoc(doc(db, "admin", "credentials"));
    if (!adminSnap.exists()) {
      console.log("Seeding default admin credentials to Firestore...");
      await setDoc(doc(db, "admin", "credentials"), {
        email: "adminjaf@gmail.com",
        password: "eroll@12",
      });
    }

    const adminUserRef = doc(db, "users", "adminjaf@gmail.com");
    const adminUserSnap = await getDoc(adminUserRef);
    if (!adminUserSnap.exists()) {
      console.log("Seeding admin user record to the users collection...");
      await setDoc(adminUserRef, {
        uid: "u_adminjaf",
        email: "adminjaf@gmail.com",
        fullName: "JAF Admin",
        password: "eroll@12",
        role: "admin",
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      });
    } else {
      // In case password needs to be kept in sync or updated
      await setDoc(
        adminUserRef,
        {
          role: "admin",
          password: "eroll@12",
        },
        { merge: true },
      );
    }

    const adsSnapshot = await getDocs(collection(db, "ads"));
    if (adsSnapshot.empty) {
      console.log("Seeding default ads to Firestore...");
      const defaultAds: Ad[] = [
        {
          id: "ad1",
          title: "ABUJA POP-UP SHOP",
          subtitle: "Get 15% off with code WUSE2 at the physical site",
          format: "banner",
          imageUrl: "https://iili.io/CxhVz4j.jpg",
          linkUrl: "/shop",
          badge: "EVENT",
          active: true,
          expiryDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          bgColor: "bg-gold text-ink",
          textColor: "text-ink",
        },
        {
          id: "ad2",
          title: "THE SITUATIONSHIP SERIES",
          subtitle: "Heavyweight Cotton Dropping Next Friday",
          format: "card",
          imageUrl: "https://iili.io/CzvuCUF.jpg",
          linkUrl: "/shop",
          badge: "UPCOMING DROP",
          active: true,
          expiryDate: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          bgColor: "bg-ink text-canvas",
          textColor: "text-canvas",
        },
      ];
      for (const ad of defaultAds) {
        await setDoc(doc(db, "ads", ad.id), cleanUndefined(ad));
      }
    }
  } catch (error) {
    console.error("Failed to seed Firebase database:", error);
  }
}

export async function getAdminCredentials() {
  try {
    const adminSnap = await getDoc(doc(db, "admin", "credentials"));
    if (adminSnap.exists()) {
      return adminSnap.data();
    }
    return null;
  } catch (err) {
    console.error("Error getting admin credentials from Firestore:", err);
    return null;
  }
}

export async function updateAdminCredentials(email: string, password: string) {
  try {
    await setDoc(doc(db, "admin", "credentials"), {
      email: email.trim(),
      password: password,
    });
  } catch (err) {
    console.error("Error updating admin credentials in Firestore:", err);
    throw err;
  }
}

export async function submitContactMessage(contact: {
  name: string;
  email: string;
  message: string;
}): Promise<void> {
  try {
    const docRef = doc(collection(db, "messages"));
    const id = docRef.id;
    await setDoc(
      docRef,
      cleanUndefined({
        id,
        name: contact.name.trim(),
        email: contact.email.toLowerCase().trim(),
        message: contact.message.trim(),
        createdAt: new Date().toISOString(),
      }),
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "messages");
  }
}

export async function fetchContactMessages(): Promise<any[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "messages"));
    const messages: any[] = [];
    querySnapshot.forEach((docSnap) => {
      messages.push(docSnap.data());
    });
    // Sort messages by createdAt descending
    return messages.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "messages");
    return [];
  }
}

export async function deleteContactMessageFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "messages", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `messages/${id}`);
  }
}

// ------ Real-Time Subscriptions ------

export function subscribeToProducts(callback: (products: Product[]) => void) {
  const path = "products";
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const products: Product[] = [];
      snapshot.forEach((docSnap) => {
        products.push(docSnap.data() as Product);
      });
      callback(products);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    },
  );
}

export function subscribeToZones(callback: (zones: DeliveryZone[]) => void) {
  const path = "zones";
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const zones: DeliveryZone[] = [];
      snapshot.forEach((docSnap) => {
        zones.push(docSnap.data() as DeliveryZone);
      });
      callback(zones);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    },
  );
}

export function subscribeToCoupons(callback: (coupons: any[]) => void) {
  const path = "coupons";
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const coupons: any[] = [];
      snapshot.forEach((docSnap) => {
        coupons.push(docSnap.data());
      });
      callback(coupons);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    },
  );
}

export function subscribeToOrders(callback: (orders: any[]) => void) {
  const path = "orders";
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const orders: any[] = [];
      snapshot.forEach((docSnap) => {
        orders.push(docSnap.data());
      });
      // Sort orders by createdAt descending
      orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(orders);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    },
  );
}

export function subscribeToBranding(
  callback: (branding: { logoUrl: string; logoShape: "circle" | "square" }) => void,
) {
  const path = "settings/branding";
  return onSnapshot(
    doc(db, "settings", "branding"),
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as { logoUrl: string; logoShape: "circle" | "square" });
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    },
  );
}

export function subscribeToAds(callback: (ads: Ad[]) => void) {
  const path = "ads";
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const ads: Ad[] = [];
      snapshot.forEach((docSnap) => {
        ads.push(docSnap.data() as Ad);
      });
      // Sort ads by createdAt descending
      ads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(ads);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    },
  );
}

// ------ Traffic Logging / Analytics Helpers ------

function getDeviceType(): "Mobile" | "Tablet" | "Desktop" {
  if (typeof window === "undefined") return "Desktop";
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "Tablet";
  }
  if (
    /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(
      ua,
    )
  ) {
    return "Mobile";
  }
  return "Desktop";
}

function getBrowserName(): string {
  if (typeof window === "undefined") return "Chrome";
  const ua = navigator.userAgent;
  if (ua.indexOf("Firefox") > -1) return "Firefox";
  if (ua.indexOf("SamsungBrowser") > -1) return "Samsung Browser";
  if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) return "Opera";
  if (ua.indexOf("Trident") > -1) return "Internet Explorer";
  if (ua.indexOf("Edge") > -1) return "Edge";
  if (ua.indexOf("Chrome") > -1) return "Chrome";
  if (ua.indexOf("Safari") > -1) return "Safari";
  return "Other";
}

let cachedSessionId: string | null = null;
function getSessionId(): string {
  if (typeof window === "undefined") return "SSR";
  if (cachedSessionId) return cachedSessionId;
  const key = "jaf_analytics_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = "sess_" + Math.random().toString(36).substring(2, 11);
    sessionStorage.setItem(key, id);
  }
  cachedSessionId = id;
  return id;
}

export async function logTrafficEvent(pathname: string): Promise<void> {
  try {
    if (typeof window === "undefined") return;

    // Skip logging admin and auth routes to avoid muddying metrics
    if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) {
      return;
    }

    const id = "evt_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
    const dateObj = new Date();
    const dateStr = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD

    const event = {
      id,
      path: pathname,
      timestamp: dateObj.toISOString(),
      date: dateStr,
      sessionId: getSessionId(),
      device: getDeviceType(),
      browser: getBrowserName(),
      referrer: document.referrer || "Direct Link",
    };

    await setDoc(doc(db, "traffic_events", id), cleanUndefined(event));
  } catch (error) {
    console.error("Failed to log traffic event:", error);
  }
}

export function subscribeToTrafficEvents(callback: (events: any[]) => void) {
  const path = "traffic_events";
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const events: any[] = [];
      snapshot.forEach((docSnap) => {
        events.push(docSnap.data());
      });
      // Sort events by timestamp descending
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(events);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    },
  );
}
