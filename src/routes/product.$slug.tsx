import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useCart, useCatalog, useWishlist } from "@/lib/store";
import { formatNaira } from "@/lib/format";
import { Heart, Minus, Plus, Star, Copy, Check, Share2 } from "lucide-react";
import { toast } from "sonner";
import { ProductCard } from "@/components/product-card";
import { auth, fetchProductsFromFirestore } from "@/lib/firebase";
import { SafeImage } from "@/components/safe-image";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    try {
      const products = await fetchProductsFromFirestore();
      const product = products.find((p) => p.slug === params.slug);
      return { product };
    } catch {
      return { product: undefined };
    }
  },
  head: ({ loaderData, params }) => {
    const product = loaderData?.product;
    const title = product
      ? `${product.name} — JAF`
      : `${params.slug.replace(/-/g, " ").toUpperCase()} — JAF`;
    const desc = product
      ? `${product.subtitle || product.name}: ${product.description}`
      : `Shop the ${params.slug.replace(/-/g, " ")} from JAF. Heavyweight construction, shipping across Abuja & Lafia.`;
    const image = product && product.images && product.images[0] ? product.images[0] : "";

    const metaArray = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "product" },
      { property: "og:url", content: `https://justafriend.com.ng/product/${params.slug}` },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: desc },
    ];

    if (image) {
      metaArray.push({ property: "og:image", content: image });
      metaArray.push({ name: "twitter:image", content: image });
      metaArray.push({ name: "twitter:card", content: "summary_large_image" });
    }

    return {
      meta: metaArray,
      links: [{ rel: "canonical", href: `https://justafriend.com.ng/product/${params.slug}` }],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const products = useCatalog((s) => s.products);

  // Find product from store, fall back to preloaded data during initial sync to avoid premature 404
  const product = products.find((p) => p.slug === slug) || loaderData?.product;

  if (!product) throw notFound();

  const add = useCart((s) => s.add);
  const toggleWish = useWishlist((s) => s.toggle);
  const wished = useWishlist((s) => s.ids.includes(product.id));

  const [size, setSize] = useState(product.sizes[0]);
  const [color, setColor] = useState(product.colors[0]);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);

  const [copied, setCopied] = useState(false);
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/product/${product.slug}`
      : `https://justafriend.com.ng/product/${product.slug}`;

  const handleCopyLink = () => {
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setCopied(true);
        toast.success("Product link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        toast.error("Failed to copy link.");
      });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} on JAF: ${product.subtitle}`,
          url: shareUrl,
        });
        toast.success("Shared successfully!");
      } catch (err) {
        const errorName = err instanceof Error ? err.name : (err as { name?: string })?.name;
        if (errorName !== "AbortError") {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const [reviewForm, setReviewForm] = useState({
    name: auth.currentUser?.displayName || auth.currentUser?.email?.split("@")[0] || "",
    rating: 5,
    body: "",
  });
  const upsert = useCatalog((s) => s.upsert);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (u) {
        setReviewForm((prev) => ({
          ...prev,
          name: prev.name || u.displayName || u.email?.split("@")[0] || "",
        }));
      }
    });
    return unsub;
  }, []);

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.name.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    if (!reviewForm.body.trim()) {
      toast.error("Please write some feedback.");
      return;
    }
    const newRating = Number(reviewForm.rating);
    if (isNaN(newRating) || newRating < 1 || newRating > 5) {
      toast.error("Please supply a valid rating between 1 and 5.");
      return;
    }

    const newRev = {
      name: reviewForm.name.trim(),
      rating: newRating,
      body: reviewForm.body.trim(),
      date: new Date().toISOString().split("T")[0],
    };

    upsert({
      ...product,
      reviews: [newRev, ...(product.reviews || [])],
    });

    toast.success("Thank you! Your review has been submitted.");
    setReviewForm({
      name: auth.currentUser?.displayName || auth.currentUser?.email?.split("@")[0] || "",
      rating: 5,
      body: "",
    });
  };

  const inStock = product.stock > 0;
  const related = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 3);
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
        <Link to="/">HOME</Link>
        <span>/</span>
        <Link to="/shop">SHOP</Link>
        <span>/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
        {/* GALLERY */}
        <div>
          <div className="aspect-[4/5] bg-zinc-100 overflow-hidden mb-3">
            <SafeImage
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
                <SafeImage
                  src={src}
                  alt={`${product.name} thumbnail ${i + 1}`}
                  loading="lazy"
                  width={256}
                  height={256}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* INFO */}
        <div className="lg:sticky lg:top-20 lg:self-start space-y-6">
          <div>
            <p className="text-[10px] tracking-widest uppercase text-ink-soft mb-2">
              {product.subtitle}
            </p>
            <h1 className="font-display text-3xl md:text-5xl font-semibold tracking-tighter">
              {product.name}
            </h1>
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
              <p className="text-[10px] tracking-widest uppercase font-medium mb-2">
                Color — {color}
              </p>
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
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="size-10 grid place-items-center"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-10 text-center text-sm">{qty}</span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="size-10 grid place-items-center"
                >
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

          <div className="flex items-center gap-3 border-t border-ink/5 pt-4">
            <span className="text-[10px] tracking-widest uppercase text-ink-soft font-semibold">
              Share:
            </span>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-ink/10 text-[10px] uppercase font-semibold tracking-widest hover:bg-zinc-100 transition-colors"
              title="Copy link"
            >
              {copied ? (
                <Check className="size-3 text-emerald-600 animate-scale-in" />
              ) : (
                <Copy className="size-3" />
              )}
              {copied ? "COPIED" : "COPY LINK"}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-ink/10 text-[10px] uppercase font-semibold tracking-widest hover:bg-zinc-100 transition-colors"
              title="Share"
            >
              <Share2 className="size-3" />
              SHARE PIECE
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
      <section className="mt-24 border-t border-ink/10 pt-16 animate-fade-in">
        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-12">
          {/* REVIEWS LIST */}
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tighter mb-8">
              REVIEWS ({product.reviews.length})
            </h2>
            {product.reviews.length === 0 ? (
              <p className="text-sm text-ink-soft">No reviews yet. Be the first to drop one.</p>
            ) : (
              <div className="space-y-6">
                {product.reviews.map((r, i) => (
                  <article key={i} className="border-b border-ink/5 pb-6 last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">{r.name}</p>
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star
                            key={j}
                            className={`size-3 ${j < r.rating ? "fill-ink text-ink text-gold" : "text-ink/20"}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-ink-soft leading-relaxed">{r.body}</p>
                    <p className="text-[10px] tracking-widest uppercase text-ink-soft/60 mt-2">
                      {r.date}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* DROP A REVIEW FORM */}
          <div className="bg-card border border-ink/10 p-6 space-y-6 h-fit bg-zinc-50">
            <div>
              <h3 className="font-display text-xl font-semibold tracking-tight uppercase">
                Drop your review & rating
              </h3>
              <p className="text-xs text-ink-soft mt-1">
                Your feedback helps us perfect our street drops.
              </p>
            </div>
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] tracking-widest uppercase text-ink-soft mb-2">
                  Overall Rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      type="button"
                      key={val}
                      onClick={() => setReviewForm({ ...reviewForm, rating: val })}
                      className="p-1 hover:scale-110 transition-all focus:outline-none"
                    >
                      <Star
                        className={`size-6 ${val <= reviewForm.rating ? "fill-gold text-gold" : "text-ink/20"}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] tracking-widest uppercase text-ink-soft mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Ifeanyi O."
                  value={reviewForm.name}
                  onChange={(e) => setReviewForm({ ...reviewForm, name: e.target.value })}
                  className="w-full bg-transparent border border-ink/25 px-3 py-2 text-xs outline-none focus:border-ink placeholder-ink/30"
                />
              </div>

              <div>
                <label className="block text-[10px] tracking-widest uppercase text-ink-soft mb-2">
                  Your Commentary
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Tell others how this piece fits, the heavyweight feel, or style tips..."
                  value={reviewForm.body}
                  onChange={(e) => setReviewForm({ ...reviewForm, body: e.target.value })}
                  className="w-full bg-transparent border border-ink/25 px-3 py-2 text-xs outline-none focus:border-ink placeholder-ink/30"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-ink text-canvas text-[11px] font-semibold tracking-widest uppercase py-3 hover:bg-ink-soft transition-colors text-white"
              >
                SUBMIT REVIEW
              </button>
            </form>
          </div>
        </div>
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
