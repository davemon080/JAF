import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useOrders } from "@/lib/store";
import { formatNaira } from "@/lib/format";

const STATUS_STEPS = ["new", "packed", "out", "delivered"] as const;
const STATUS_LABELS: Record<(typeof STATUS_STEPS)[number], string> = {
  new: "Order received",
  packed: "Packed",
  out: "Out for delivery",
  delivered: "Delivered",
};

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track Order — JAF" },
      { name: "description", content: "Track your JAF order by reference number." },
      { property: "og:url", content: "/track" },
    ],
    links: [{ rel: "canonical", href: "/track" }],
  }),
  validateSearch: z.object({ ref: z.string().optional() }),
  component: TrackPage,
});

function TrackPage() {
  const initial = Route.useSearch().ref ?? "";
  const [ref, setRef] = useState(initial);
  const [query, setQuery] = useState(initial);
  const order = useOrders((s) => s.orders.find((o) => o.ref.toLowerCase() === query.toLowerCase()));

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-display text-5xl md:text-7xl font-semibold tracking-tighter mb-2">
        TRACK.
      </h1>
      <p className="text-ink-soft mb-8">Enter your order reference (e.g. JAF-XXXXX).</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(ref.trim());
        }}
        className="flex gap-2 mb-10"
      >
        <input
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder="JAF-XXXXX"
          className="flex-1 bg-transparent border border-ink/20 px-3 py-3 text-sm outline-none focus:border-ink"
        />
        <button className="bg-ink text-canvas px-5 py-3 text-xs font-medium tracking-widest uppercase">
          Track
        </button>
      </form>

      {query && !order && (
        <p className="text-sm text-ink-soft border border-dashed border-ink/20 py-12 text-center">
          No order found for "{query}".
        </p>
      )}

      {order && (
        <div className="space-y-8">
          <div>
            <p className="text-[10px] tracking-widest uppercase text-ink-soft">Reference</p>
            <p className="font-display text-2xl tracking-widest">{order.ref}</p>
          </div>
          <ol className="relative border-l border-ink/15 pl-6 space-y-6">
            {STATUS_STEPS.map((s) => {
              const reached = STATUS_STEPS.indexOf(order.status) >= STATUS_STEPS.indexOf(s);
              return (
                <li key={s} className="relative">
                  <span
                    className={`absolute -left-[31px] top-0.5 size-3 rounded-full ${reached ? "bg-ink" : "bg-ink/20"}`}
                  />
                  <p className={`text-sm font-medium ${reached ? "" : "text-ink-soft"}`}>
                    {STATUS_LABELS[s]}
                  </p>
                </li>
              );
            })}
          </ol>
          <div className="border-t border-ink/10 pt-6 text-sm space-y-1">
            <p>
              <span className="text-ink-soft">Delivery:</span> {order.delivery.zoneLabel} ·{" "}
              {formatNaira(order.delivery.fee)}
            </p>
            <p>
              <span className="text-ink-soft">Items:</span> {order.items.length}
            </p>
            <p>
              <span className="text-ink-soft">Total:</span> {formatNaira(order.total)}
            </p>
            {order.rider && (
              <p>
                <span className="text-ink-soft">Rider:</span> {order.rider}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
