import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useOrders } from "@/lib/store";
import { formatNaira } from "@/lib/format";

export const Route = createFileRoute("/checkout/success")({
  head: () => ({
    meta: [
      { title: "Order placed — JAF" },
      { name: "description", content: "Your JAF order is in. We'll follow up on WhatsApp." },
      { property: "og:url", content: "/checkout/success" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: z.object({ ref: z.string() }),
  component: SuccessPage,
});

function SuccessPage() {
  const { ref } = Route.useSearch();
  const order = useOrders((s) => s.orders.find((o) => o.ref === ref));

  const wa = order
    ? `https://wa.me/2348000000000?text=${encodeURIComponent(`Hi JAF, just placed order ${ref}. Name: ${order.customer.name}. Total ${formatNaira(order.total)}.`)}`
    : "https://wa.me/2348000000000";

  return (
    <div className="max-w-2xl mx-auto px-6 py-24 text-center">
      <p className="text-[10px] tracking-[0.3em] uppercase text-ink-soft mb-4">Status: confirmed</p>
      <h1 className="font-display text-5xl md:text-7xl font-semibold tracking-tighter mb-6">
        YOU'RE IN.
      </h1>
      <p className="text-ink-soft mb-2">Order reference</p>
      <p className="font-display text-3xl tracking-widest mb-8">{ref}</p>
      {order && (
        <div className="border border-ink/10 p-6 text-left mb-8 space-y-2 text-sm">
          <p><span className="text-ink-soft">Delivering to:</span> {order.delivery.zoneLabel}</p>
          <p><span className="text-ink-soft">Address:</span> {order.delivery.address}</p>
          <p><span className="text-ink-soft">Total:</span> {formatNaira(order.total)}</p>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a href={wa} target="_blank" rel="noopener noreferrer" className="bg-ink text-canvas px-6 py-3 text-xs font-medium tracking-widest uppercase">
          Confirm on WhatsApp
        </a>
        <Link to="/track" search={{ ref }} className="border border-ink px-6 py-3 text-xs font-medium tracking-widest uppercase">
          Track order
        </Link>
      </div>
      <Link to="/shop" className="block mt-8 text-[10px] tracking-widest uppercase text-ink-soft underline underline-offset-4">
        Keep shopping
      </Link>
    </div>
  );
}
