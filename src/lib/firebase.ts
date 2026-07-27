/* eslint-disable @typescript-eslint/no-explicit-any */
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  collection,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  updateDoc,
  increment,
  query,
  where,
} from "firebase/firestore";
import {
  getAuth,
  signInWithEmailAndPassword as fbSignInWithEmailAndPassword,
  createUserWithEmailAndPassword as fbCreateUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup as fbSignInWithPopup,
  updatePassword,
  updateEmail,
  signInAnonymously as fbSignInAnonymously,
  sendPasswordResetEmail as fbSendPasswordResetEmail,
  confirmPasswordReset as fbConfirmPasswordReset,
  verifyPasswordResetCode as fbVerifyPasswordResetCode,
} from "firebase/auth";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  listAll,
  deleteObject,
  getMetadata,
} from "firebase/storage";
import firebaseConfig from "../../firebase-applet-config.json";
import { SEED_PRODUCTS, type Product, type Ad } from "@/data/products";
import { DEFAULT_ZONES, type DeliveryZone } from "@/data/zones";
import logoAsset from "@/assets/jaf-logo.asset.json";

const app = initializeApp(firebaseConfig);
const dbId =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

export const db = dbId ? getFirestore(app, dbId) : getFirestore(app);

export const fbAuth = getAuth(app);
export const storage = getStorage(app);

export interface CustomUser {
  uid: string;
  email: string;
  displayName?: string;
  role?: string;
}

export function isAnAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normal = email.toLowerCase().trim();
  return (
    normal === "adminjaf@gmail.com" ||
    normal === "davemon080@gmail.com" ||
    normal === "daveimagodei@gmail.com"
  );
}

class CustomAuth {
  private listeners: ((user: CustomUser | null) => void)[] = [];
  public currentUser: CustomUser | null = null;
  public initialized: boolean = false;

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

    // Subscribe to real Firebase authentication
    fbOnAuthStateChanged(fbAuth, async (user) => {
      try {
        if (user) {
          const emailKey = user.email?.toLowerCase().trim() || "";
          if (emailKey) {
            const isAdmin = isAnAdminEmail(emailKey);
            let role = isAdmin ? "admin" : "user";
            let fullName = user.displayName || "";
            try {
              const userDocSnap = await getDoc(doc(db, "users", emailKey));
              if (userDocSnap.exists()) {
                const uData = userDocSnap.data();
                role = uData.role || role;
                fullName = uData.fullName || fullName;
              } else {
                // Create user record in Firestore if it doesn't exist (e.g. first Google Sign-In)
                await setDoc(doc(db, "users", emailKey), {
                  uid: user.uid,
                  email: emailKey,
                  fullName: fullName,
                  createdAt: new Date().toISOString(),
                  lastLoginAt: new Date().toISOString(),
                  role: role,
                });
              }
              this.setCurrentUser({
                uid: user.uid,
                email: emailKey,
                displayName: fullName,
                role,
              });
            } catch (err) {
              console.error("Error fetching/migrating user profile on auth state change:", err);
              // Fallback
              this.setCurrentUser({
                uid: user.uid,
                email: emailKey,
                displayName: fullName,
                role: isAdmin ? "admin" : "user",
              });
            }
          }
        } else {
          this.setCurrentUser(null);
        }
      } finally {
        this.initialized = true;
        this.triggerChange();
      }
    });
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

  async signOut() {
    try {
      await fbSignOut(fbAuth);
    } catch (err) {
      console.error("Firebase signOut error:", err);
    }
    this.setCurrentUser(null);
  }
}

export const auth = new CustomAuth();

// Test connection helper
async function testConnection() {
  try {
    await getDoc(doc(db, "test", "connection"));
  } catch (error) {
    // Ignore test connection error
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
  const errMsg = error instanceof Error ? error.message : String(error);
  const isPermissionError =
    errMsg.toLowerCase().includes("permission") || errMsg.toLowerCase().includes("insufficient");

  const errInfo = {
    error: errMsg,
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

  // Log and bypass warning/info instead of throwing if the user logs out or has no permissions during read transitions.
  if (
    isPermissionError &&
    (!auth.currentUser ||
      operationType === OperationType.GET ||
      operationType === OperationType.LIST)
  ) {
    console.warn(
      "Gracefully handled Firestore permission error during transition/read:",
      JSON.stringify(errInfo),
    );
    return; // Bypass throwing
  }

  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ------ API Helpers ------

export async function fetchProductsFromFirestore(): Promise<Product[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "products"));
    const products: Product[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Product;
      products.push({
        ...data,
        id: data.id || docSnap.id,
        images: data.images || [],
        sizes: data.sizes || [],
        colors: data.colors || [],
        reviews: data.reviews || [],
      });
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
  if (!productId || productId === "undefined") {
    console.warn(
      "deleteProductFromFirestore: productId is empty or 'undefined'. Skipping Firestore delete call.",
    );
    return;
  }
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
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return [];
    }

    const isAdmin = isAnAdminEmail(currentUser.email);
    let q;
    if (isAdmin) {
      q = collection(db, "orders");
    } else {
      const userEmail = currentUser.email?.toLowerCase().trim() ?? "";
      q = query(collection(db, "orders"), where("customer.email", "==", userEmail));
    }

    const querySnapshot = await getDocs(q);
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
  clicks?: number;
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

export async function recordAdClickInFirestore(adId: string): Promise<void> {
  try {
    const docRef = doc(db, "ads", adId);
    await updateDoc(docRef, {
      clicks: increment(1),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `ads/${adId}/click`);
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

    // Sign up with real Firebase Auth first
    const userCredential = await fbCreateUserWithEmailAndPassword(fbAuth, emailKey, password);
    const user = userCredential.user;

    const docRef = doc(db, "users", emailKey);
    const isAdminEmail = isAnAdminEmail(emailKey);
    const role = isAdminEmail ? "admin" : "user";
    const newUser = {
      uid: user.uid,
      email: emailKey,
      fullName: fullName || "",
      password, // retain for backup/record if required
      role,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    try {
      await setDoc(docRef, newUser);
    } catch (docErr) {
      console.warn("Could not write user profile doc on signup:", docErr);
    }
    auth.setCurrentUser({ uid: user.uid, email: emailKey, displayName: fullName, role });
    return newUser;
  } catch (error: any) {
    console.error("Custom sign up error:", error);
    const code = (error?.code || "").toLowerCase();
    const message = (error?.message || "").toLowerCase();
    if (code.includes("email-already-in-use") || message.includes("email-already-in-use")) {
      throw new Error("An account with this email already exists.");
    }
    if (code.includes("weak-password") || message.includes("weak-password")) {
      throw new Error("Password must be at least 6 characters.");
    }
    throw error;
  }
}

export async function customSignIn(email: string, password: string) {
  try {
    const emailKey = email.toLowerCase().trim();
    if (!emailKey) throw new Error("Email is required.");

    // Sign in with real Firebase Auth first
    let userCredential;
    const isAdminEmail = isAnAdminEmail(emailKey);

    try {
      userCredential = await fbSignInWithEmailAndPassword(fbAuth, emailKey, password);
    } catch (error: any) {
      if (isAdminEmail) {
        console.log(`Fallback activated for: ${emailKey}`);
        try {
          // If the admin user has not been created in Firebase Auth, auto-register them
          userCredential = await fbCreateUserWithEmailAndPassword(fbAuth, emailKey, password);
          console.log(`Auto-registered admin ${emailKey} successfully in Firebase Auth.`);
        } catch (signupError: any) {
          const isAlreadyInUse =
            signupError?.code === "auth/email-already-in-use" ||
            signupError?.message?.includes("email-already-in-use");
          if (isAlreadyInUse) {
            // The email already exists in Firebase Auth, but fbSignInWithEmailAndPassword failed.
            // This means they provided the wrong password!
            throw new Error("Incorrect email or password. Please try again.");
          } else {
            throw signupError;
          }
        }
      } else {
        throw error;
      }
    }

    const user = userCredential?.user;
    const docRef = doc(db, "users", emailKey);
    let userData: any = null;

    try {
      const docSnap = await getDoc(docRef);
      userData = docSnap.exists() ? docSnap.data() : null;
    } catch (docErr) {
      console.warn("Firestore user profile fetch warning:", docErr);
    }

    const role = isAdminEmail ? "admin" : userData?.role || "user";

    try {
      if (!userData) {
        userData = {
          uid: user?.uid || "u_" + emailKey.replace(/[^a-zA-Z0-9]/g, "_"),
          email: emailKey,
          fullName: user?.displayName || emailKey.split("@")[0],
          password,
          role,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
        await setDoc(docRef, userData);
      } else {
        await setDoc(
          docRef,
          {
            lastLoginAt: new Date().toISOString(),
            password,
            role,
          },
          { merge: true },
        );
      }
    } catch (saveErr) {
      console.warn("Firestore user profile save warning:", saveErr);
    }

    const verifiedUser = {
      uid: user?.uid || userData?.uid || "u_" + emailKey.replace(/[^a-zA-Z0-9]/g, "_"),
      email: emailKey,
      displayName: userData?.fullName || user?.displayName || emailKey.split("@")[0],
      role,
    };

    auth.setCurrentUser(verifiedUser);
    return verifiedUser;
  } catch (error: any) {
    console.error("Custom sign in error:", error);
    const code = (error?.code || "").toLowerCase();
    const message = (error?.message || "").toLowerCase();
    if (code.includes("weak-password") || message.includes("weak-password")) {
      throw new Error("Password should be at least 6 characters.");
    }
    if (
      code.includes("invalid") ||
      code.includes("wrong-password") ||
      code.includes("user-not-found") ||
      message.includes("invalid-credential") ||
      message.includes("wrong-password") ||
      message.includes("user-not-found") ||
      message.includes("invalid-login")
    ) {
      throw new Error("Incorrect email or password. Please try again.");
    }
    throw error;
  }
}

export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const result = await fbSignInWithPopup(fbAuth, provider);
    const user = result.user;

    const emailKey = user.email?.toLowerCase().trim() || "";
    if (!emailKey) {
      throw new Error("Google account does not have a valid email.");
    }

    const docRef = doc(db, "users", emailKey);
    let displayName = user.displayName || "";
    const isAdmin = isAnAdminEmail(emailKey);
    let role = isAdmin ? "admin" : "user";

    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const existing = docSnap.data();
        role = existing.role || role;
        displayName = existing.fullName || displayName;

        await setDoc(
          docRef,
          {
            lastLoginAt: new Date().toISOString(),
            role,
          },
          { merge: true },
        );
      } else {
        await setDoc(docRef, {
          uid: user.uid,
          email: emailKey,
          fullName: displayName,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          role: role,
        });
      }
    } catch (gDocErr) {
      console.warn("Google sign in firestore user doc warning:", gDocErr);
    }

    const loggedInUser = {
      uid: user.uid,
      email: emailKey,
      displayName,
      role,
    };

    auth.setCurrentUser(loggedInUser);
    return loggedInUser;
  } catch (error: any) {
    console.error("Google sign in error:", error);
    throw error;
  }
}

export async function sendPasswordReset(email: string, continueUrl?: string): Promise<void> {
  const emailKey = email.toLowerCase().trim();
  if (!emailKey) throw new Error("Email is required.");

  if (continueUrl) {
    await fbSendPasswordResetEmail(fbAuth, emailKey, {
      url: continueUrl,
      handleCodeInApp: true,
    });
  } else {
    await fbSendPasswordResetEmail(fbAuth, emailKey);
  }
}

export async function confirmResetPassword(oobCode: string, newPassword: string): Promise<string> {
  if (!oobCode) throw new Error("Reset code is missing or expired.");
  if (!newPassword || newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  // Verify reset code to retrieve user's email
  const email = await fbVerifyPasswordResetCode(fbAuth, oobCode);

  // Reset the password in Firebase Auth
  await fbConfirmPasswordReset(fbAuth, oobCode, newPassword);

  if (email) {
    const emailKey = email.toLowerCase().trim();
    // Update the password in Firestore for backup/sync records
    const docRef = doc(db, "users", emailKey);
    await setDoc(docRef, { password: newPassword }, { merge: true });
  }

  return email;
}

export async function changeCurrentUserPassword(password: string): Promise<void> {
  const user = fbAuth.currentUser;
  if (!user) throw new Error("No authenticated user session found.");
  await updatePassword(user, password);

  if (user.email) {
    const emailKey = user.email.toLowerCase().trim();
    await setDoc(doc(db, "users", emailKey), { password }, { merge: true });
  }
}

export async function customSignOut() {
  await auth.signOut();
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
    if (typeof window !== "undefined") {
      if (localStorage.getItem("jaf_firebase_seeded") === "true") {
        return;
      }
    }
    const currentUser = auth.currentUser;
    const isAdmin = isAnAdminEmail(currentUser?.email);
    if (!isAdmin) {
      return;
    }

    // Check if seeding was already performed for this Firestore database
    const seedingSnap = await getDoc(doc(db, "settings", "seeding_completed"));
    if (seedingSnap.exists() && seedingSnap.data()?.completed === true) {
      if (typeof window !== "undefined") {
        localStorage.setItem("jaf_firebase_seeded", "true");
      }
      return;
    }

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
    if (!adminSnap.exists() || adminSnap.data()?.email !== "davemon080@gmail.com") {
      console.log("Seeding admin credentials to Firestore...");
      await setDoc(doc(db, "admin", "credentials"), {
        email: "davemon080@gmail.com",
        password: "eroll@12",
      });
    }

    // Seed davemon080@gmail.com as admin
    const davemonAdminRef = doc(db, "users", "davemon080@gmail.com");
    await setDoc(
      davemonAdminRef,
      {
        uid: "u_davemon080",
        email: "davemon080@gmail.com",
        fullName: "JAF Lead Admin",
        password: "eroll@12",
        role: "admin",
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      },
      { merge: true },
    );

    // Seed daveimagodei@gmail.com as admin
    const daveimagodeiAdminRef = doc(db, "users", "daveimagodei@gmail.com");
    await setDoc(
      daveimagodeiAdminRef,
      {
        uid: "u_daveimagodei",
        email: "daveimagodei@gmail.com",
        fullName: "Dave Admin",
        password: "Eroll@12",
        role: "admin",
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      },
      { merge: true },
    );

    // Keep adminjaf@gmail.com as backup admin
    const adminUserRef = doc(db, "users", "adminjaf@gmail.com");
    await setDoc(
      adminUserRef,
      {
        uid: "u_adminjaf",
        email: "adminjaf@gmail.com",
        fullName: "JAF Admin",
        password: "eroll@12",
        role: "admin",
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      },
      { merge: true },
    );

    // Clean up any non-admin user accounts from the database
    console.log("Purging all non-admin accounts from database to maintain clean user setup...");
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      for (const userDoc of usersSnap.docs) {
        const email = (userDoc.data().email || userDoc.id || "").toLowerCase().trim();
        if (email && !isAnAdminEmail(email)) {
          console.log(`De-seeding / deleting unrequested account profile: ${email}`);
          await deleteDoc(doc(db, "users", userDoc.id));
        }
      }
    } catch (cleanError) {
      console.warn("Could not clean unneeded users:", cleanError);
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
    await setDoc(doc(db, "settings", "seeding_completed"), {
      completed: true,
      timestamp: new Date().toISOString(),
    });
    if (typeof window !== "undefined") {
      localStorage.setItem("jaf_firebase_seeded", "true");
    }
    migrateAllProductsToStorage().catch((err) => console.error("Background migration error:", err));
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

    // Keep Firebase Auth credentials in sync with Firestore if we're currently logged in as admin
    const currUser = fbAuth.currentUser;
    if (currUser) {
      if (email.trim().toLowerCase() !== currUser.email?.toLowerCase()) {
        try {
          await updateEmail(currUser, email.trim());
          console.log("Successfully synchronized admin email in Firebase Auth.");
        } catch (emailErr) {
          console.error("Failed to sync email in Firebase Auth:", emailErr);
        }
      }
      try {
        await updatePassword(currUser, password);
        console.log("Successfully synchronized admin password in Firebase Auth.");
      } catch (passErr) {
        console.error("Failed to sync password in Firebase Auth:", passErr);
      }
    }
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
        const data = docSnap.data() as Product;
        products.push({
          ...data,
          id: data.id || docSnap.id,
          images: data.images || [],
          sizes: data.sizes || [],
          colors: data.colors || [],
          reviews: data.reviews || [],
        });
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
  const currentUser = auth.currentUser;

  if (!currentUser) {
    callback([]);
    return () => {};
  }

  const isAdmin = isAnAdminEmail(currentUser.email);
  let q;
  if (isAdmin) {
    q = collection(db, path);
  } else {
    const userEmail = currentUser.email?.toLowerCase().trim() ?? "";
    q = query(collection(db, path), where("customer.email", "==", userEmail));
  }

  return onSnapshot(
    q,
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

/**
 * Helper to upload a base64 string or a File/Blob to Firebase Storage
 */
export async function uploadImageToStorage(
  fileOrBase64: File | Blob | string,
  fileName: string,
): Promise<string> {
  let blob: Blob;
  if (typeof fileOrBase64 === "string") {
    if (fileOrBase64.startsWith("data:")) {
      const arr = fileOrBase64.split(",");
      const mime = arr[0].match(/:(.*?);/)![1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      blob = new Blob([u8arr], { type: mime });
    } else {
      return fileOrBase64;
    }
  } else {
    blob = fileOrBase64;
  }

  const storageRef = ref(storage, `products/${fileName}`);
  const snapshot = await uploadBytes(storageRef, blob);
  return await getDownloadURL(snapshot.ref);
}

export interface MigrationResult {
  totalAnalyzed: number;
  migratedCount: number;
  failedCount: number;
  unauthorizedErrorDetected: boolean;
  errors: string[];
}

/**
 * Migration routine to find any base64 images or external images and upload them to Cloud Storage
 */
export async function migrateAllProductsToStorage(): Promise<MigrationResult> {
  const result: MigrationResult = {
    totalAnalyzed: 0,
    migratedCount: 0,
    failedCount: 0,
    unauthorizedErrorDetected: false,
    errors: [],
  };

  try {
    const productsSnapshot = await getDocs(collection(db, "products"));
    result.totalAnalyzed = productsSnapshot.size;
    console.log(`[Storage Migration] Found ${productsSnapshot.size} products to analyze.`);

    for (const docSnap of productsSnapshot.docs) {
      const product = docSnap.data() as Product;
      let needsUpdate = false;
      const updatedImages = [...(product.images || [])];

      for (let i = 0; i < updatedImages.length; i++) {
        const img = updatedImages[i];
        if (!img) continue;

        if (img.startsWith("data:")) {
          // Base64 Data URL
          try {
            const ext = img.match(/data:image\/(.*?);/)?.[1] || "jpg";
            const fileName = `${product.id}_image_${i}_${Date.now()}.${ext}`;
            console.log(`[Storage Migration] Migrating Base64 image ${i + 1} for ${product.name}`);
            const storageUrl = await uploadImageToStorage(img, fileName);
            updatedImages[i] = storageUrl;
            needsUpdate = true;
          } catch (err: any) {
            console.error(
              `[Storage Migration] Failed to migrate base64 image ${i} for ${product.id}:`,
              err,
            );
            result.failedCount++;
            const errMsg = err?.message || String(err);
            result.errors.push(`Failed to migrate image for ${product.name}: ${errMsg}`);
            if (
              err?.code === "storage/unauthorized" ||
              errMsg.toLowerCase().includes("unauthorized") ||
              errMsg.toLowerCase().includes("permission") ||
              errMsg.toLowerCase().includes("permission-denied")
            ) {
              result.unauthorizedErrorDetected = true;
            }
          }
        } else if (
          (img.startsWith("http://") || img.startsWith("https://")) &&
          !img.includes("firebasestorage.googleapis.com")
        ) {
          // External URL (seeding or transferring to bucket)
          try {
            console.log(`[Storage Migration] Migrating remote image ${img} for ${product.name}`);
            const response = await fetch(img, { mode: "cors" });
            if (response.ok) {
              const blob = await response.blob();
              const ext = blob.type.split("/")[1] || "jpg";
              const fileName = `${product.id}_image_${i}_${Date.now()}.${ext}`;
              const storageUrl = await uploadImageToStorage(blob, fileName);
              updatedImages[i] = storageUrl;
              needsUpdate = true;
            } else {
              console.warn(
                `[Storage Migration] Remote image fetch failed for ${img}: status ${response.status}`,
              );
              result.failedCount++;
              result.errors.push(
                `Failed to fetch remote image for ${product.name}: status ${response.status}`,
              );
            }
          } catch (err: any) {
            console.warn(
              `[Storage Migration] Remote image fetch failed (CORS/Network) for ${img}. Skipping but keeping original URL.`,
              err,
            );
            result.failedCount++;
            const errMsg = err?.message || String(err);
            result.errors.push(`Failed to fetch remote image for ${product.name}: ${errMsg}`);
            if (
              err?.code === "storage/unauthorized" ||
              errMsg.toLowerCase().includes("unauthorized") ||
              errMsg.toLowerCase().includes("permission") ||
              errMsg.toLowerCase().includes("permission-denied")
            ) {
              result.unauthorizedErrorDetected = true;
            }
          }
        }
      }

      if (needsUpdate) {
        await updateDoc(doc(db, "products", product.id), {
          images: updatedImages,
        });
        result.migratedCount++;
        console.log(
          `[Storage Migration] Updated Firestore product ${product.name} with storage images.`,
        );
      }
    }
    console.log(`[Storage Migration] Completed. Migrated ${result.migratedCount} products.`);
    return result;
  } catch (err: any) {
    console.error("[Storage Migration] Failed to complete product migration:", err);
    const errMsg = err?.message || String(err);
    if (
      err?.code === "storage/unauthorized" ||
      errMsg.toLowerCase().includes("unauthorized") ||
      errMsg.toLowerCase().includes("permission") ||
      errMsg.toLowerCase().includes("permission-denied")
    ) {
      result.unauthorizedErrorDetected = true;
    }
    result.errors.push(`Overall migration failure: ${errMsg}`);
    return result;
  }
}

export interface StorageFile {
  name: string;
  fullPath: string;
  url: string;
  size: number;
  contentType: string;
  timeCreated: string;
  md5Hash?: string;
}

/**
 * List files in a specified folder inside Firebase Storage
 */
export async function listStorageFiles(folder: string = "products"): Promise<StorageFile[]> {
  try {
    const folderRef = ref(storage, folder);
    const listResult = await listAll(folderRef);
    const files: StorageFile[] = [];

    for (const itemRef of listResult.items) {
      try {
        const [url, metadata] = await Promise.all([getDownloadURL(itemRef), getMetadata(itemRef)]);
        files.push({
          name: itemRef.name,
          fullPath: itemRef.fullPath,
          url,
          size: metadata.size,
          contentType: metadata.contentType || "application/octet-stream",
          timeCreated: metadata.timeCreated,
          md5Hash: metadata.md5Hash,
        });
      } catch (err) {
        console.error(`Failed to get details for ${itemRef.fullPath}:`, err);
        files.push({
          name: itemRef.name,
          fullPath: itemRef.fullPath,
          url: "",
          size: 0,
          contentType: "unknown",
          timeCreated: "",
        });
      }
    }

    // Sort by timeCreated descending if available
    files.sort((a, b) => {
      if (!a.timeCreated) return 1;
      if (!b.timeCreated) return -1;
      return new Date(b.timeCreated).getTime() - new Date(a.timeCreated).getTime();
    });

    return files;
  } catch (error) {
    console.error("Failed to list storage files:", error);
    throw error;
  }
}

export { firebaseConfig };

/**
 * Delete a file in Firebase Storage by its full path
 */
export async function deleteStorageFile(fullPath: string): Promise<void> {
  try {
    // Decode URI component (in case path has encoded characters like %20) and clean spaces
    let cleanPath = decodeURIComponent(fullPath).trim();
    if (cleanPath.startsWith("/")) {
      cleanPath = cleanPath.slice(1);
    }
    const fileRef = ref(storage, cleanPath);
    await deleteObject(fileRef);
  } catch (error) {
    console.error(`deleteStorageFile failed for path [${fullPath}]:`, error);
    throw error;
  }
}
