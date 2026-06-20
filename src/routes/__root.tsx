import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Toaster } from "@/components/ui/sonner";
import { useCatalog, useCoupons, useOrders } from "@/lib/store";
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
  const setBranding = useCatalog((s) => s.setBranding);
  const setCouponsRaw = useCoupons((s) => s.setCouponsRaw);
  const setOrdersRaw = useOrders((s) => s.setOrdersRaw);

  useEffect(() => {
    let unsubProducts: (() => void) | undefined;
    let unsubZones: (() => void) | undefined;
    let unsubCoupons: (() => void) | undefined;
    let unsubOrders: (() => void) | undefined;
    let unsubBranding: (() => void) | undefined;

    async function initFirebase() {
      try {
        // 1. Seed database with defaults if it is completely empty
        await seedFirebaseIfEmpty();

        // 2. Set up real-time listener subscriptions
        unsubProducts = subscribeToProducts((products) => {
          if (products && products.length > 0) {
            setProductsRaw(products);
          }
        });

        unsubZones = subscribeToZones((zones) => {
          if (zones && zones.length > 0) {
            setZonesRaw(zones);
          }
        });

        unsubCoupons = subscribeToCoupons((coupons) => {
          if (coupons && coupons.length > 0) {
            setCouponsRaw(coupons);
          }
        });

        unsubOrders = subscribeToOrders((orders) => {
          if (orders) {
            setOrdersRaw(orders);
          }
        });

        unsubBranding = subscribeToBranding((branding) => {
          if (branding) {
            setBranding(branding);
          }
        });
      } catch (err) {
        console.error("Firebase load/sync error:", err);
      }
    }

    initFirebase();

    return () => {
      if (unsubProducts) unsubProducts();
      if (unsubZones) unsubZones();
      if (unsubCoupons) unsubCoupons();
      if (unsubOrders) unsubOrders();
      if (unsubBranding) unsubBranding();
    };
  }, [setProductsRaw, setZonesRaw, setBranding, setCouponsRaw, setOrdersRaw]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-canvas text-ink">
        {!isAdmin && <SiteHeader />}
        <main className="flex-1">
          <Outlet />
        </main>
        {!hideChrome && <SiteFooter />}
      </div>
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
