import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Toaster } from "@/components/ui/sonner";
import { AdTopBanner, AdPopup } from "@/components/dynamic-ads";
import { useCatalog, useCoupons, useOrders, useAds } from "@/lib/store";
import {
  seedFirebaseIfEmpty,
  fetchProductsFromFirestore,
  fetchZonesFromFirestore,
  fetchCouponsFromFirestore,
  fetchOrdersFromFirestore,
  fetchBrandingFromFirestore,
  subscribeToProducts,
  subscribeToZones,
  subscribeToCoupons,
  subscribeToOrders,
  subscribeToBranding,
  subscribeToAds,
  logTrafficEvent,
  auth,
  type CustomUser,
} from "@/lib/firebase";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-display font-semibold tracking-tighter">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-ink-soft">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center bg-ink px-5 py-3 text-xs font-medium tracking-widest uppercase text-canvas hover:bg-ink-soft"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">This page didn't load</h1>
        <p className="mt-2 text-sm text-ink-soft">Try refreshing or head back home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center bg-ink px-5 py-3 text-xs font-medium tracking-widest uppercase text-canvas hover:bg-ink-soft"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center border border-ink px-5 py-3 text-xs font-medium tracking-widest uppercase hover:bg-ink hover:text-canvas"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { title: "JAF — Just A Friend" },
      {
        name: "description",
        content:
          "Rock JAF. Know your status. Streetwear for the situationship era — shipping across Abuja & Lafia.",
      },
      { name: "author", content: "JAF" },
      { property: "og:site_name", content: "JAF" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "JAF — Just A Friend" },
      {
        property: "og:description",
        content:
          "Rock JAF. Know your status. Streetwear for the situationship era — shipping across Abuja & Lafia.",
      },
      { property: "og:image", content: "https://iili.io/CxhVz4j.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "1200" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "JAF — Just A Friend" },
      {
        name: "twitter:description",
        content:
          "Rock JAF. Know your status. Streetwear for the situationship era — shipping across Abuja & Lafia.",
      },
      { name: "twitter:image", content: "https://iili.io/CxhVz4j.jpg" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname.startsWith("/admin");
  const isAuth = pathname.startsWith("/auth");
  const hideChrome = isAdmin || isAuth;

  const setProductsRaw = useCatalog((s) => s.setProductsRaw);
  const setZonesRaw = useCatalog((s) => s.setZonesRaw);
  const setBrandingRaw = useCatalog((s) => s.setBrandingRaw);
  const setCouponsRaw = useCoupons((s) => s.setCouponsRaw);
  const setOrdersRaw = useOrders((s) => s.setOrdersRaw);
  const setAdsRaw = useAds((s) => s.setAdsRaw);

  const [user, setUser] = useState<CustomUser | null>(null);
  const [initialized, setInitialized] = useState(auth.initialized);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setInitialized(auth.initialized);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    logTrafficEvent(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!initialized) {
      return;
    }
    let active = true;
    let unsubProducts: (() => void) | undefined;
    let unsubZones: (() => void) | undefined;
    let unsubCoupons: (() => void) | undefined;
    let unsubOrders: (() => void) | undefined;
    let unsubBranding: (() => void) | undefined;
    let unsubAds: (() => void) | undefined;

    async function initFirebase() {
      try {
        // 1. Seed database with defaults if it is completely empty
        if (!active) return;
        await seedFirebaseIfEmpty();
        if (!active) return;

        // 2. Set up real-time listener subscriptions
        const up = subscribeToProducts((products) => {
          if (active && products && products.length > 0) {
            setProductsRaw(products);
          }
        });
        if (!active) {
          up();
        } else {
          unsubProducts = up;
        }

        const uz = subscribeToZones((zones) => {
          if (active && zones && zones.length > 0) {
            setZonesRaw(zones);
          }
        });
        if (!active) {
          uz();
        } else {
          unsubZones = uz;
        }

        const uc = subscribeToCoupons((coupons) => {
          if (active && coupons && coupons.length > 0) {
            setCouponsRaw(coupons);
          }
        });
        if (!active) {
          uc();
        } else {
          unsubCoupons = uc;
        }

        // Only subscribe to orders if there is an active session
        if (auth.currentUser) {
          const uo = subscribeToOrders((orders) => {
            if (active && orders) {
              setOrdersRaw(orders);
            }
          });
          if (!active) {
            uo();
          } else {
            unsubOrders = uo;
          }
        }

        const ub = subscribeToBranding((branding) => {
          if (active && branding) {
            setBrandingRaw(branding);
          }
        });
        if (!active) {
          ub();
        } else {
          unsubBranding = ub;
        }

        const ua = subscribeToAds((ads) => {
          if (active && ads) {
            setAdsRaw(ads);
          }
        });
        if (!active) {
          ua();
        } else {
          unsubAds = ua;
        }
      } catch (err) {
        console.error("Firebase load/sync error:", err);
      }
    }

    initFirebase();

    return () => {
      active = false;
      if (unsubProducts) unsubProducts();
      if (unsubZones) unsubZones();
      if (unsubCoupons) unsubCoupons();
      if (unsubOrders) unsubOrders();
      if (unsubBranding) unsubBranding();
      if (unsubAds) unsubAds();
    };
  }, [
    user,
    initialized,
    setProductsRaw,
    setZonesRaw,
    setBrandingRaw,
    setCouponsRaw,
    setOrdersRaw,
    setAdsRaw,
  ]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-canvas text-ink">
        {!isAdmin && <AdTopBanner />}
        {!isAdmin && <SiteHeader />}
        <main className="flex-1">
          <Outlet />
        </main>
        {!hideChrome && <SiteFooter />}
        {!isAdmin && <AdPopup />}
      </div>
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
