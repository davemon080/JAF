import { createFileRoute, Link } from "@tanstack/react-router";
import { useCart, useCatalog } from "@/lib/store";
import { formatNaira } from "@/lib/format";
import { Minus, Plus, X } from "lucide-react";
import { SafeImage } from "@/components/safe-image";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Cart — JAF" },
      { name: "description", content: "Review your JAF bag and proceed to checkout." },
      { property: "og:title", content: "Cart — JAF" },
      { property: "og:url", content: "https://justafriend.com.ng/cart" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://justafriend.com.ng/cart" }],
  }),
  component: CartPage,
});

function CartPage() {
  const { lines, remove, setQty } = useCart();
  const products = useCatalog((s) => s.products);

  const items = lines
    .map((l, idx) => {
      const p = products.find((x) => x.id === l.productId);
      return p ? { ...l, product: p, idx } : null;
    })
    .filter(<T,>(x: T | null): x is T => x !== null);

  const subtotal = items.reduce((a, i) => a + i.product.price * i.qty, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-12">
      <h1 className="font-display text-5xl md:text-7xl font-semibold tracking-tighter mb-10">
        CART.
      </h1>

      {items.length === 0 ? (
        <div className="border border-dashed border-ink/20 py-24 text-center">
          <p className="text-ink-soft mb-6">Your cart is empty.</p>
          <Link
            to="/shop"
            className="bg-ink text-canvas text-xs font-medium tracking-widest uppercase px-5 py-3"
          >
            Enter the shop
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_320px] gap-12">
          <ul className="space-y-6">
            {items.map((item) => (
              <li key={item.idx} className="flex gap-4 border-b border-ink/10 pb-6">
                <Link
                  to="/product/$slug"
                  params={{ slug: item.product.slug }}
                  className="w-24 sm:w-32 aspect-[4/5] bg-zinc-100 shrink-0"
                >
                  <SafeImage
                    src={item.product.images[0]}
                    alt={item.product.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </Link>
                <div className="flex-1 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <Link
                      to="/product/$slug"
                      params={{ slug: item.product.slug }}
                      className="text-sm font-semibold tracking-widest uppercase"
                    >
                      {item.product.name}
                    </Link>
                    <p className="text-[10px] tracking-widest uppercase text-ink-soft mt-1">
                      {item.color} · {item.size}
                    </p>
                    <div className="inline-flex items-center border border-ink/20 mt-3">
                      <button
                        onClick={() => setQty(item.idx, item.qty - 1)}
                        className="size-8 grid place-items-center"
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="w-8 text-center text-xs">{item.qty}</span>
                      <button
                        onClick={() => setQty(item.idx, item.qty + 1)}
                        className="size-8 grid place-items-center"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <p className="text-sm font-medium">
                      {formatNaira(item.product.price * item.qty)}
                    </p>
                    <button
                      onClick={() => remove(item.idx)}
                      aria-label="Remove"
                      className="text-ink-soft hover:text-ink"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="lg:sticky lg:top-20 lg:self-start bg-ink text-canvas p-6 space-y-5">
            <h2 className="text-xs tracking-widest uppercase border-b border-canvas/15 pb-3">
              Summary
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-canvas/60">Subtotal</span>
                <span>{formatNaira(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-canvas/60">Delivery</span>
                <span>at checkout</span>
              </div>
            </div>
            <div className="border-t border-canvas/15 pt-4 flex justify-between text-base font-medium">
              <span>Total</span>
              <span>{formatNaira(subtotal)}</span>
            </div>
            <Link
              to="/checkout"
              className="block text-center bg-canvas text-ink text-xs font-medium tracking-widest uppercase py-3 hover:bg-canvas/90"
            >
              Checkout
            </Link>
            <Link
              to="/shop"
              className="block text-center text-[10px] tracking-widest uppercase text-canvas/60 hover:text-canvas"
            >
              Keep shopping
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
