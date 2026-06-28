import { createFileRoute, Link } from "@tanstack/react-router";
import { useCatalog, useOrders, useAds } from "@/lib/store";
import { ProductCard } from "@/components/product-card";
import { AdCardInfeed, injectFeedAds, Ad } from "@/components/dynamic-ads";
import { ArrowRight } from "lucide-react";
import { getProductSmartTag, Product } from "@/data/products";
import { FeaturedSlider } from "@/components/featured-slider";

const catTees = "https://iili.io/CzvuCUF.jpg";
const catHoodies = "https://iili.io/CzvuxRa.jpg";
const catCaps = "https://iili.io/CzvaIbn.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JAF — Just A Friend. Rock JAF. Know your status." },
      {
        name: "description",
        content:
          "JAF streetwear: heavyweight tees, hoodies and caps for the situationship era. Same-week delivery to Abuja & Lafia.",
      },
      { property: "og:title", content: "JAF — Just A Friend" },
      {
        property: "og:description",
        content: "Rock JAF. Know your status. Streetwear shipping across Abuja & Lafia.",
      },
      { property: "og:url", content: "https://justafriend.com.ng/" },
    ],
    links: [{ rel: "canonical", href: "https://justafriend.com.ng/" }],
  }),
  component: HomePage,
});

function HomePage() {
  const products = useCatalog((s) => s.products);
  const orders = useOrders((s) => s.orders);
  const ads = useAds((s) => s.ads);

  const featured = products.filter((p) => getProductSmartTag(p, orders) !== "sold-out").slice(0, 4);

  const justIn = products
    .filter((p) => {
      const t = getProductSmartTag(p, orders);
      return t === "just-in" || t === "limited";
    })
    .slice(0, 4);

  const justInWithAds = injectFeedAds(justIn, ads, 2);

  return (
    <div>
      {/* HERO */}
      <section className="relative">
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-12 md:pb-20">
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 items-end">
            <div>
              <p className="text-[10px] font-medium tracking-[0.25em] uppercase text-ink-soft mb-6">
                Drop 002 / Live now
              </p>
              <h1 className="font-display font-semibold tracking-tighter leading-[0.85] text-balance text-6xl sm:text-7xl md:text-8xl lg:text-[10vw]">
                JUST A<br />
                FRIEND.
              </h1>
              <div className="mt-8 flex flex-col sm:flex-row sm:items-end justify-between gap-6 max-w-2xl">
                <p className="text-base md:text-lg text-pretty leading-relaxed max-w-[40ch] text-ink-soft">
                  Rock JAF. Know your status. An ironic collection for the situationship era,
                  engineered for the streets of Abuja and beyond.
                </p>
                <Link
                  to="/shop"
                  className="bg-ink text-canvas text-xs font-medium tracking-widest uppercase py-3 pr-4 pl-3 inline-flex items-center gap-2 hover:bg-ink-soft transition-colors self-start"
                >
                  <span className="size-4 grid place-items-center bg-canvas/15">+</span>
                  Enter the shop
                </Link>
              </div>
            </div>
            <div className="relative aspect-[3/4] lg:aspect-[3/5] overflow-hidden">
              <img
                src="https://iili.io/CzELsTl.jpg"
                alt="JAF model in heavyweight black hoodie"
                width={1080}
                height={1920}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover grayscale"
              />
              <div className="absolute bottom-4 right-4 bg-canvas px-3 py-2 text-[9px] font-medium tracking-widest uppercase">
                Status: pending
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED SLIDE */}
      <FeaturedSlider products={products} />

      {/* FEATURED DROP */}
      <section className="bg-ink text-canvas py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-baseline justify-between mb-12 border-b border-canvas/10 pb-4">
            <h2 className="text-xs md:text-sm font-medium tracking-[0.2em] uppercase">
              Current Drop / 002
            </h2>
            <span className="text-[10px] text-canvas/40">EST. 2024</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-canvas/10">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} dark />
            ))}
          </div>
          <div className="mt-10 flex justify-end">
            <Link
              to="/shop"
              className="text-xs tracking-widest uppercase font-medium inline-flex items-center gap-2 hover:gap-3 transition-all"
            >
              View the full drop <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* JUST IN — gold accent strip */}
      {justIn.length > 0 && (
        <section className="border-y border-ink/10 bg-canvas py-20">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="flex items-end justify-between mb-10 gap-6 flex-wrap">
              <div>
                <p className="inline-block bg-gold text-ink text-[10px] tracking-[0.25em] uppercase font-semibold px-2.5 py-1 mb-4">
                  Just in / Black + Gold
                </p>
                <h2 className="font-display font-semibold tracking-tighter text-4xl md:text-6xl">
                  NEW ARRIVALS.
                </h2>
                <p className="mt-3 text-sm text-ink-soft max-w-md">
                  Fresh trademark pieces — every cut, every cap, every hoodie carries the JAF mark.
                </p>
              </div>
              <Link
                to="/shop"
                className="text-xs tracking-widest uppercase font-medium inline-flex items-center gap-2 border-b border-ink pb-1 hover:text-gold hover:border-gold transition-colors"
              >
                Shop all new <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {justInWithAds.map((item, index) => {
                const isAd =
                  item &&
                  typeof item === "object" &&
                  "isAdCardUnit" in item &&
                  (item as Record<string, unknown>).isAdCardUnit;
                if (isAd) {
                  const adUnit = item as { adData?: { id?: string } };
                  const adId = adUnit.adData?.id || String(index);
                  return <AdCardInfeed key={`home-ad-${adId}-${index}`} ad={adUnit.adData as Ad} />;
                }
                const p = item as Product;
                const key = p.id ? `home-prod-${p.id}-${index}` : `home-prod-fallback-${index}`;
                return <ProductCard key={key} product={p} />;
              })}
            </div>
          </div>
        </section>
      )}
      <section className="py-24 md:py-32 px-6 flex items-center justify-center text-center">
        <div className="max-w-4xl">
          <p className="text-3xl md:text-5xl font-display font-semibold leading-tight tracking-tight text-balance italic">
            "THE FRIENDZONE IS A NATION. WE ARE THE CAPITAL."
          </p>
          <p className="mt-6 text-xs tracking-widest uppercase text-ink-soft">— JAF HQ</p>
        </div>
      </section>

      {/* CATEGORY TRIPTYCH */}
      <section className="px-4 md:px-6 pb-24">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { to: "tees" as const, label: "TEES", num: "01", img: catTees },
            { to: "hoodies" as const, label: "HOODIES", num: "02", img: catHoodies },
            { to: "caps" as const, label: "CAPS", num: "03", img: catCaps },
          ].map((c) => (
            <Link
              key={c.to}
              to="/shop"
              search={{ category: c.to }}
              className="relative aspect-[3/4] overflow-hidden group"
            >
              <img
                src={c.img}
                alt={c.label}
                loading="lazy"
                width={800}
                height={1000}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 text-canvas">
                <h4 className="text-2xl md:text-3xl font-display font-semibold tracking-tighter">
                  {c.label}
                </h4>
                <p className="text-xs uppercase tracking-widest opacity-80">Shop {c.num}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* DELIVERY STRIP */}
      <section className="border-t border-ink/10 py-12 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8 text-sm">
          <div>
            <p className="text-[10px] font-medium tracking-widest uppercase text-ink-soft mb-2">
              01 — Express
            </p>
            <p className="font-medium">Lafia & Abuja same-week delivery.</p>
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-widest uppercase text-ink-soft mb-2">
              02 — Pay your way
            </p>
            <p className="font-medium">Card, Bank Transfer, USSD via Paystack.</p>
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-widest uppercase text-ink-soft mb-2">
              03 — On WhatsApp
            </p>
            <p className="font-medium">Order updates straight to your chat.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
