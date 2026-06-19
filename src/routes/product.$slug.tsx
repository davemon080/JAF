import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useCart, useCatalog, useWishlist } from "@/lib/store";
import { formatNaira } from "@/lib/format";
import { Heart, Minus, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { ProductCard } from "@/components/product-card";

export const Route = createFileRoute("/product/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ").toUpperCase()} — JAF` },
      { name: "description", content: `Shop the ${params.slug.replace(/-/g, " ")} from JAF. Heavyweight construction, shipping across Abuja & Lafia.` },
      { property: "og:title", content: `${params.slug.replace(/-/g, " ").toUpperCase()} — JAF` },
      { property: "og:url", content: `/product/${params.slug}` },
    ],
    links: [{ rel: "canonical", href: `/product/${params.slug}` }],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const products = useCatalog((s) => s.products);
  const product = products.find((p) => p.slug === slug);
  if (!product) throw notFound();

  const add = useCart((s) => s.add);
  const toggleWish = useWishlist((s) => s.toggle);
  const wished = useWishlist((s) => s.ids.includes(product.id));

  const [size, setSize] = useState(product.sizes[0]);
  const [color, setColor] = useState(product.colors[0]);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);

  const inStock = product.stock > 0;
  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 3);
  const avgRating =
    product.reviews.length > 0
      ? product.reviews.reduce((a, r) => a + r.rating, 0) / product.reviews.length
      : 0;

  const handleAdd = () => {
    if (!inStock) return;
    add({ productId: product.id, size, color, qty });
    toast.success(`Added to cart — ${product.name}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-10">
      <nav className="text-[10px] tracking-widest uppercase text-ink-soft mb-8 flex gap-2">
        <Link to="/">HOME</Link><span>/</span>
        <Link to="/shop">SHOP</Link><span>/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
        {/* GALLERY */}
        <div>
          <div className="aspect-[4/5] bg-zinc-100 overflow-hidden mb-3">
            <img
              src={product.images[activeImg]}
              alt={product.name}
              width={1024}
              height={1280}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {product.images.map((src, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={`aspect-square overflow-hidden border ${i === activeImg ? "border-ink" : "border-transparent"}`}
              >
                <img src={src} alt="" loading="lazy" width={256} height={256} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* INFO */}
        <div className="lg:sticky lg:top-20 lg:self-start space-y-6">
          <div>
            <p className="text-[10px] tracking-widest uppercase text-ink-soft mb-2">{product.subtitle}</p>
            <h1 className="font-display text-3xl md:text-5xl font-semibold tracking-tighter">{product.name}</h1>
            <div className="flex items-center gap-4 mt-3">
              <p className="text-xl font-medium">{formatNaira(product.price)}</p>
              {product.reviews.length > 0 && (
                <span className="text-xs text-ink-soft flex items-center gap-1">
                  <Star className="size-3 fill-current" />
                  {avgRating.toFixed(1)} ({product.reviews.length})
                </span>
              )}
            </div>
          </div>

          <p className="text-sm leading-relaxed text-ink-soft">{product.description}</p>

          <div className="space-y-4">
            <div>
              <p className="text-[10px] tracking-widest uppercase font-medium mb-2">Color — {color}</p>
              <div className="flex gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`text-[10px] px-3 py-2 border tracking-widest uppercase ${color === c ? "bg-ink text-canvas border-ink" : "border-ink/20"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] tracking-widest uppercase font-medium mb-2">Size</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`min-w-12 text-xs px-3 py-2 border tracking-widest ${size === s ? "bg-ink text-canvas border-ink" : "border-ink/20"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] tracking-widest uppercase font-medium mb-2">Quantity</p>
              <div className="inline-flex items-center border border-ink/20">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="size-10 grid place-items-center">
                  <Minus className="size-3.5" />
                </button>
                <span className="w-10 text-center text-sm">{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} className="size-10 grid place-items-center">
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!inStock}
              className="flex-1 bg-ink text-canvas text-xs font-medium tracking-widest uppercase py-4 hover:bg-ink-soft disabled:bg-ink-soft disabled:cursor-not-allowed transition-colors"
            >
              {inStock ? "Add to cart" : "Sold out"}
            </button>
            <button
              onClick={() => toggleWish(product.id)}
              aria-label="Toggle wishlist"
              className="size-[52px] grid place-items-center border border-ink hover:bg-ink hover:text-canvas transition-colors"
            >
              <Heart className={`size-4 ${wished ? "fill-current" : ""}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-ink/10 pt-6 text-xs text-ink-soft">
            <div>
              <p className="text-[10px] tracking-widest uppercase text-ink mb-1">Delivery</p>
              <p>Lafia / Abuja: 1–3 business days.</p>
            </div>
            <div>
              <p className="text-[10px] tracking-widest uppercase text-ink mb-1">Stock</p>
              <p>{inStock ? `${product.stock} available` : "Restock TBA"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* REVIEWS */}
      <section className="mt-24">
        <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tighter mb-8">
          REVIEWS ({product.reviews.length})
        </h2>
        {product.reviews.length === 0 ? (
          <p className="text-sm text-ink-soft">No reviews yet. Be the first to drop one.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {product.reviews.map((r, i) => (
              <article key={i} className="border-t border-ink/10 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">{r.name}</p>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className={`size-3 ${j < r.rating ? "fill-ink text-ink" : "text-ink/20"}`} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-ink-soft leading-relaxed">{r.body}</p>
                <p className="text-[10px] tracking-widest uppercase text-ink-soft/60 mt-2">{r.date}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* RELATED */}
      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tighter mb-8">
            ALSO IN THE ARCHIVE
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
