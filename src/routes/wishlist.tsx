import { createFileRoute, Link } from "@tanstack/react-router";
import { useCatalog, useWishlist } from "@/lib/store";
import { ProductCard } from "@/components/product-card";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "Wishlist — JAF" },
      { name: "description", content: "Your saved JAF pieces." },
      { property: "og:url", content: "/wishlist" },
    ],
    links: [{ rel: "canonical", href: "/wishlist" }],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const ids = useWishlist((s) => s.ids);
  const products = useCatalog((s) => s.products);
  const items = products.filter((p) => ids.includes(p.id));

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
      <h1 className="font-display text-5xl md:text-7xl font-semibold tracking-tighter mb-10">
        WISHLIST.
      </h1>
      {items.length === 0 ? (
        <div className="border border-dashed border-ink/20 py-24 text-center">
          <p className="text-ink-soft mb-6">Nothing saved yet.</p>
          <Link
            to="/shop"
            className="bg-ink text-canvas text-xs font-medium tracking-widest uppercase px-5 py-3"
          >
            Browse the drop
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
