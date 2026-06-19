import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
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
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "JAF — Just A Friend" },
      { name: "description", content: "Rock JAF. Know your status. Streetwear for the situationship era — shipping across Abuja & Lafia." },
      { name: "author", content: "JAF" },
      { property: "og:site_name", content: "JAF" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600;700&family=Inter:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

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
    async function initFirebase() {
      try {
        // 1. Seed if empty
        await seedFirebaseIfEmpty();

        // 2. Fetch all collections
        const [products, zones, coupons, orders, branding] = await Promise.all([
          fetchProductsFromFirestore(),
          fetchZonesFromFirestore(),
          fetchCouponsFromFirestore(),
          fetchOrdersFromFirestore(),
          fetchBrandingFromFirestore(),
        ]);

        if (products && products.length > 0) {
          setProductsRaw(products);
        }
        if (zones && zones.length > 0) {
          setZonesRaw(zones);
        }
        if (coupons && coupons.length > 0) {
          setCouponsRaw(coupons);
        }
        if (orders) {
          setOrdersRaw(orders);
        }
        if (branding) {
          setBranding(branding);
        }
      } catch (err) {
        console.error("Firebase load/sync error:", err);
      }
    }

    initFirebase();
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
