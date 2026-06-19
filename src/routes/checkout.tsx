import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { z } from "zod";
import { useCart, useCatalog, useCoupons, useOrders, type Order } from "@/lib/store";
import { formatNaira } from "@/lib/format";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — JAF" },
      { name: "description", content: "Complete your JAF order. Paystack-ready, delivery to Lafia & Abuja." },
      { property: "og:url", content: "/checkout" },
    ],
    links: [{ rel: "canonical", href: "/checkout" }],
  }),
  component: CheckoutPage,
});

const contactSchema = z.object({
  name: z.string().trim().min(2, "Name required").max(80),
  email: z.string().trim().email("Valid email required").max(120),
  phone: z.string().trim().min(7, "Phone required").max(20),
});

const deliverySchema = z.object({
  zoneId: z.enum(["lafia", "abuja"]),
  address: z.string().trim().min(8, "Address required").max(200),
  notes: z.string().trim().max(200).optional(),
});

const STEPS = ["Contact", "Delivery", "Review"] as const;

function CheckoutPage() {
  const navigate = useNavigate();
  const { lines, clear } = useCart();
  const products = useCatalog((s) => s.products);
  const zones = useCatalog((s) => s.zones);
  const coupons = useCoupons((s) => s.coupons);
  const addOrder = useOrders((s) => s.add);

  const [step, setStep] = useState(0);
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        setContact((prev) => ({
          ...prev,
          name: prev.name || u.displayName || "",
          email: prev.email || u.email || "",
        }));
      }
    });
    return () => unsubscribe();
  }, []);
  const [delivery, setDelivery] = useState({ zoneId: "abuja" as "abuja" | "lafia", address: "", notes: "" });
  const [coupon, setCoupon] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const items = useMemo(
    () =>
      lines
        .map((l) => {
          const p = products.find((x) => x.id === l.productId);
          return p ? { ...l, product: p } : null;
        })
        .filter(<T,>(x: T | null): x is T => x !== null),
    [lines, products],
  );

  const subtotal = items.reduce((a, i) => a + i.product.price * i.qty, 0);
  const zone = zones.find((z) => z.id === delivery.zoneId) ?? zones[0];
  const fee = zone?.fee ?? 0;
  const couponObj = coupons.find((c) => c.code.toLowerCase() === coupon.trim().toLowerCase());
  const discount = couponObj ? Math.round((subtotal * couponObj.percent) / 100) : 0;
  const total = Math.max(0, subtotal - discount) + fee;

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h1 className="font-display text-4xl font-semibold tracking-tighter mb-4">CART EMPTY.</h1>
        <p className="text-ink-soft mb-6">Add something before checking out.</p>
        <Link to="/shop" className="bg-ink text-canvas text-xs font-medium tracking-widest uppercase px-5 py-3">
          Shop now
        </Link>
      </div>
    );
  }

  const next = () => {
    setErrors({});
    if (step === 0) {
      const r = contactSchema.safeParse(contact);
      if (!r.success) {
        setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path[0] as string, i.message])));
        return;
      }
    }
    if (step === 1) {
      const r = deliverySchema.safeParse(delivery);
      if (!r.success) {
        setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path[0] as string, i.message])));
        return;
      }
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const placeOrder = () => {
    const ref = "JAF-" + Math.random().toString(36).slice(2, 7).toUpperCase();
    const order: Order = {
      ref,
      createdAt: new Date().toISOString(),
      customer: contact,
      delivery: {
        zoneId: zone.id,
        zoneLabel: zone.label,
        fee,
        address: delivery.address,
        notes: delivery.notes,
      },
      items: items.map((i) => ({
        productId: i.product.id,
        name: i.product.name,
        price: i.product.price,
        size: i.size,
        color: i.color,
        qty: i.qty,
      })),
      subtotal,
      discount,
      total,
      status: "new",
      couponCode: couponObj?.code,
    };
    addOrder(order);
    clear();
    toast.success(`Order placed — ${ref}`);
    navigate({ to: "/checkout/success", search: { ref } });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-12">
      <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-tighter mb-2">CHECKOUT.</h1>
      <ol className="flex gap-2 text-[10px] tracking-widest uppercase text-ink-soft mb-10">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span className={`size-5 grid place-items-center border ${i <= step ? "bg-ink text-canvas border-ink" : "border-ink/20"}`}>
              {i + 1}
            </span>
            <span className={i === step ? "text-ink font-medium" : ""}>{s}</span>
            {i < STEPS.length - 1 && <span className="opacity-30">·</span>}
          </li>
        ))}
      </ol>

      <div className="grid lg:grid-cols-[1fr_340px] gap-12">
        <div>
          {step === 0 && (
            <div className="space-y-4 max-w-md">
              <Field label="Full name" error={errors.name}>
                <input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className="input" />
              </Field>
              <Field label="Email" error={errors.email}>
                <input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className="input" />
              </Field>
              <Field label="Phone (WhatsApp)" error={errors.phone}>
                <input type="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className="input" placeholder="+234..." />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5 max-w-md">
              <div>
                <p className="text-[10px] tracking-widest uppercase font-medium mb-2">Delivery zone</p>
                <div className="grid grid-cols-2 gap-2">
                  {zones.map((z) => (
                    <button
                      key={z.id}
                      onClick={() => setDelivery({ ...delivery, zoneId: z.id as "abuja" | "lafia" })}
                      className={`text-left p-4 border ${delivery.zoneId === z.id ? "border-ink bg-ink/5" : "border-ink/20"}`}
                    >
                      <p className="font-medium uppercase text-sm">{z.label}</p>
                      <p className="text-[10px] text-ink-soft mt-1">{z.estimate}</p>
                      <p className="text-xs mt-2">{formatNaira(z.fee)}</p>
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Address" error={errors.address}>
                <textarea rows={3} value={delivery.address} onChange={(e) => setDelivery({ ...delivery, address: e.target.value })} className="input" />
              </Field>
              <Field label="Delivery notes (optional)">
                <input value={delivery.notes} onChange={(e) => setDelivery({ ...delivery, notes: e.target.value })} className="input" />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 max-w-xl">
              <section>
                <h3 className="text-[10px] tracking-widest uppercase font-medium mb-2">Contact</h3>
                <p className="text-sm">{contact.name} · {contact.email} · {contact.phone}</p>
              </section>
              <section>
                <h3 className="text-[10px] tracking-widest uppercase font-medium mb-2">Delivery</h3>
                <p className="text-sm">{zone.label} · {formatNaira(fee)}</p>
                <p className="text-sm text-ink-soft mt-1">{delivery.address}</p>
                {delivery.notes && <p className="text-xs text-ink-soft mt-1">Note: {delivery.notes}</p>}
              </section>
              <section>
                <h3 className="text-[10px] tracking-widest uppercase font-medium mb-2">Coupon</h3>
                <div className="flex gap-2">
                  <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Code" className="input flex-1" />
                  {coupon && (
                    <span className={`text-[10px] uppercase self-center ${couponObj ? "text-emerald-600" : "text-destructive"}`}>
                      {couponObj ? `−${couponObj.percent}%` : "Invalid"}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-ink-soft mt-1">Try FIRSTJAF for 10% off your first order.</p>
              </section>
              <section>
                <h3 className="text-[10px] tracking-widest uppercase font-medium mb-3">Payment</h3>
                <button disabled className="w-full bg-ink-soft/20 text-ink-soft text-xs font-medium tracking-widest uppercase py-3 cursor-not-allowed">
                  Pay with Paystack — coming soon
                </button>
                <p className="text-[10px] text-ink-soft mt-2">Place order and we'll confirm payment on WhatsApp.</p>
              </section>
            </div>
          )}

          <div className="flex gap-2 mt-10">
            {step > 0 && (
              <button onClick={() => setStep((s) => s - 1)} className="border border-ink px-5 py-3 text-xs font-medium tracking-widest uppercase">
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={next} className="bg-ink text-canvas px-6 py-3 text-xs font-medium tracking-widest uppercase">
                Continue
              </button>
            ) : (
              <button onClick={placeOrder} className="bg-ink text-canvas px-6 py-3 text-xs font-medium tracking-widest uppercase">
                Place order
              </button>
            )}
          </div>
        </div>

        <aside className="bg-ink text-canvas p-6 space-y-4 lg:sticky lg:top-20 lg:self-start text-sm">
          <h2 className="text-xs tracking-widest uppercase border-b border-canvas/15 pb-3">{items.length} item{items.length === 1 ? "" : "s"}</h2>
          <ul className="space-y-3 text-xs">
            {items.map((i, idx) => (
              <li key={idx} className="flex justify-between gap-3">
                <span className="text-canvas/80">{i.product.name} · {i.size} × {i.qty}</span>
                <span>{formatNaira(i.product.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-canvas/15 pt-3 space-y-1">
            <Row label="Subtotal" value={formatNaira(subtotal)} />
            {discount > 0 && <Row label={`Discount (${couponObj?.code})`} value={`−${formatNaira(discount)}`} />}
            <Row label="Delivery" value={step >= 1 ? formatNaira(fee) : "—"} />
          </div>
          <div className="border-t border-canvas/15 pt-3 flex justify-between font-medium text-base">
            <span>Total</span>
            <span>{formatNaira(total)}</span>
          </div>
        </aside>
      </div>

      <style>{`
        .input { width: 100%; background: transparent; border: 1px solid rgba(24,24,27,0.2); padding: 0.6rem 0.8rem; font-size: 0.875rem; outline: none; }
        .input:focus { border-color: var(--color-ink); }
      `}</style>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-widest uppercase font-medium block mb-1.5">{label}</span>
      {children}
      {error && <span className="text-[10px] text-destructive mt-1 block">{error}</span>}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-canvas/60">{label}</span>
      <span>{value}</span>
    </div>
  );
}
