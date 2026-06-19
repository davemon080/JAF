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
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { SEED_PRODUCTS, type Product } from "@/data/products";
import { DEFAULT_ZONES, type DeliveryZone } from "@/data/zones";
import logoAsset from "@/assets/jaf-logo.asset.json";

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
}, firebaseConfig.firestoreDatabaseId || "(default)");

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
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

export async function saveCouponToFirestore(coupon: { code: string; percent: number; expiry: string }) {
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

export async function fetchBrandingFromFirestore(): Promise<{ logoUrl: string; logoShape: "circle" | "square" } | null> {
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

export async function saveBrandingToFirestore(branding: { logoUrl: string; logoShape: "circle" | "square" }): Promise<void> {
  try {
    await setDoc(doc(db, "settings", "branding"), cleanUndefined(branding));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "settings/branding");
  }
}

export async function recordUserInFirestore(uid: string, email: string, fullName?: string): Promise<void> {
  try {
    const emailKey = email.toLowerCase().trim();
    if (!emailKey) return;
    const docRef = doc(db, "users", emailKey);
    await setDoc(docRef, {
      lastLoginAt: new Date().toISOString()
    }, { merge: true });
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
      lastLoginAt: new Date().toISOString()
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
    await setDoc(docRef, {
      lastLoginAt: new Date().toISOString()
    }, { merge: true });
    
    const verifiedUser = {
      uid: userData.uid,
      email: userData.email,
      displayName: userData.fullName || "",
      role: userData.role || "user"
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
      await setDoc(doc(db, "settings", "branding"), cleanUndefined({
        logoUrl: logoAsset.url,
        logoShape: "square",
      }));
    } else {
      const data = brandingSnap.data();
      if (data && (data.logoUrl?.includes("/__l5e") || data.logoUrl?.includes("jaf-logo.jpg"))) {
        console.log("Updating outdated placeholder logo URL in Firestore...");
        await setDoc(doc(db, "settings", "branding"), {
          logoUrl: logoAsset.url,
        }, { merge: true });
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
        lastLoginAt: new Date().toISOString()
      });
    } else {
      // In case password needs to be kept in sync or updated
      await setDoc(adminUserRef, {
        role: "admin",
        password: "eroll@12"
      }, { merge: true });
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
      password: password
    });
  } catch (err) {
    console.error("Error updating admin credentials in Firestore:", err);
    throw err;
  }
}
