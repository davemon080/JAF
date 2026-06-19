import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAdmin, useCart, useCatalog, useCoupons, useOrders, type Coupon, type Order } from "@/lib/store";
import { type Product, SEED_PRODUCTS, CATEGORY_LABELS, type Category } from "@/data/products";
import { formatNaira } from "@/lib/format";
import { type DeliveryZone } from "@/data/zones";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { LogOut, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { getAdminCredentials, updateAdminCredentials, customSignIn } from "@/lib/firebase";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — JAF" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminShell,
});

const TABS = ["dashboard", "products", "orders", "customers", "coupons", "zones", "settings"] as const;
type Tab = (typeof TABS)[number];

function AdminShell() {
  const { authed, logout, setAuthed } = useAdmin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("dashboard");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter email and password.");
      return;
    }
    setBusy(true);
    try {
      const creds = await getAdminCredentials();
      if (
        creds &&
        creds.email.toLowerCase().trim() === email.toLowerCase().trim() &&
        creds.password === password
      ) {
        setAuthed(true);
        toast.success("Welcome back, Admin.");
        return;
      }

      const user = await customSignIn(email, password);
      if (user && (user.email.toLowerCase().trim() === "adminjaf@gmail.com" || user.role === "admin")) {
        setAuthed(true);
        toast.success("Welcome back, Admin.");
      } else {
        toast.error("Access denied. Admin role required.");
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid email or password.");
    } finally {
      setBusy(false);
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen grid place-items-center bg-ink text-canvas px-6">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm space-y-6"
        >
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tighter">JAF / ADMIN</h1>
            <p className="text-canvas/60 text-sm mt-2">Operations console. Secure authorization.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] tracking-widest uppercase text-canvas/60 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="adminjaf@gmail.com"
                className="w-full bg-transparent border border-canvas/30 px-3 py-3 text-sm outline-none focus:border-canvas text-canvas"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-widest uppercase text-canvas/60 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent border border-canvas/30 pl-3 pr-10 py-3 text-sm outline-none focus:border-canvas text-canvas"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-canvas/60 hover:text-canvas transition-colors"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-canvas text-ink py-3 text-xs font-semibold tracking-widest uppercase hover:bg-gold hover:text-ink transition-colors disabled:opacity-50"
          >
            {busy ? "Authorizing..." : "Enter"}
          </button>
          <Link to="/" className="block text-center text-[10px] tracking-widest uppercase text-canvas/40 hover:text-canvas">
            ← Back to site
          </Link>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-canvas">
      <aside className="lg:w-56 bg-ink text-canvas p-6 flex lg:flex-col gap-4 lg:gap-2 overflow-x-auto">
        <div className="lg:mb-6 shrink-0">
          <Link to="/" className="font-display text-2xl font-semibold tracking-tighter">JAF.</Link>
          <p className="text-[10px] tracking-widest uppercase text-canvas/40 mt-1 font-mono">Operations</p>
        </div>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-left text-xs tracking-widest uppercase px-3 py-2 shrink-0 ${tab === t ? "bg-canvas text-ink" : "hover:bg-canvas/10"}`}
          >
            {t}
          </button>
        ))}
        <button onClick={logout} className="lg:mt-auto text-xs tracking-widest uppercase px-3 py-2 hover:bg-canvas/10 flex items-center gap-2 shrink-0">
          <LogOut className="size-3.5" /> Logout
        </button>
      </aside>
      <main className="flex-1 p-6 md:p-10 overflow-auto">
        {tab === "dashboard" && <DashboardTab />}
        {tab === "products" && <ProductsTab />}
        {tab === "orders" && <OrdersTab />}
        {tab === "customers" && <CustomersTab />}
        {tab === "coupons" && <CouponsTab />}
        {tab === "zones" && <ZonesTab />}
        {tab === "settings" && <SettingsTab />}
      </main>
    </div>
  );
}

// ---------- DASHBOARD ----------
function DashboardTab() {
  const orders = useOrders((s) => s.orders);
  const products = useCatalog((s) => s.products);

  const revenue = orders.reduce((a, o) => a + o.total, 0);
  const today = new Date().toDateString();
  const todays = orders.filter((o) => new Date(o.createdAt).toDateString() === today);

  // last 7 days revenue
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toDateString();
    const total = orders.filter((o) => new Date(o.createdAt).toDateString() === key).reduce((a, o) => a + o.total, 0);
    return { day: d.toLocaleDateString("en-NG", { weekday: "short" }), total };
  });

  const topProducts = products
    .map((p) => ({
      p,
      sold: orders.flatMap((o) => o.items).filter((i) => i.productId === p.id).reduce((a, i) => a + i.qty, 0),
    }))
    .filter((x) => x.sold > 0)
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);

  return (
    <div className="space-y-10">
      <h1 className="font-display text-4xl font-semibold tracking-tighter">Overview</h1>
      <div className="grid sm:grid-cols-4 gap-4">
        <Stat label="Total revenue" value={formatNaira(revenue)} />
        <Stat label="Orders" value={orders.length.toString()} />
        <Stat label="Today" value={`${todays.length} orders`} />
        <Stat label="Products" value={products.length.toString()} />
      </div>

      <section className="bg-card border border-ink/10 p-6">
        <h2 className="text-xs tracking-widest uppercase mb-6">Revenue · last 7 days</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={days}>
              <XAxis dataKey="day" stroke="#71717a" fontSize={11} />
              <YAxis stroke="#71717a" fontSize={11} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatNaira(v)} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
              <Bar dataKey="total" fill="#18181b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h2 className="text-xs tracking-widest uppercase mb-4">Top sellers</h2>
        {topProducts.length === 0 ? (
          <p className="text-sm text-ink-soft">No sales yet. Place a test order from the site.</p>
        ) : (
          <ul className="divide-y divide-ink/10 border border-ink/10 bg-card">
            {topProducts.map((x) => (
              <li key={x.p.id} className="p-4 flex items-center justify-between text-sm">
                <span className="font-medium">{x.p.name}</span>
                <span className="text-ink-soft">{x.sold} sold</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-ink/10 p-5">
      <p className="text-[10px] tracking-widest uppercase text-ink-soft">{label}</p>
      <p className="font-display text-2xl font-semibold tracking-tighter mt-2">{value}</p>
    </div>
  );
}

// ---------- PRODUCTS ----------
function ProductsTab() {
  const { products, upsert, remove, reset } = useCatalog();
  const [editing, setEditing] = useState<Product | null>(null);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: "danger" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, variant: "danger" | "warning" | "info" = "info") => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      },
      variant
    });
  };

  const blank = (): Product => ({
    id: "p" + Math.random().toString(36).slice(2, 7),
    slug: "",
    name: "",
    subtitle: "",
    category: "tees",
    price: 0,
    images: [SEED_PRODUCTS[0].images[0]],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Jet Black"],
    stock: 10,
    description: "",
    reviews: [],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl font-semibold tracking-tighter">Products</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              triggerConfirm(
                "Reset Products",
                "Are you sure you want to reset all products to the default seed products? This will discard your custom changes.",
                () => {
                  reset();
                  toast.success("Products reset to seeds.");
                },
                "warning"
              );
            }}
            className="border border-ink/20 px-4 py-2 text-xs tracking-widest uppercase"
          >
            Reset
          </button>
          <button onClick={() => setEditing(blank())} className="bg-ink text-canvas px-4 py-2 text-xs tracking-widest uppercase flex items-center gap-2">
            <Plus className="size-3.5" /> New
          </button>
        </div>
      </div>

      <div className="border border-ink/10 bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] tracking-widest uppercase text-ink-soft border-b border-ink/10">
            <tr><th className="text-left p-3">Name</th><th className="text-left p-3">Category</th><th className="text-right p-3">Price</th><th className="text-right p-3">Stock</th><th></th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-ink/5">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <img src={p.images[0]} alt="" referrerPolicy="no-referrer" className="size-10 object-cover" />
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-[10px] text-ink-soft">{p.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-xs uppercase">{p.category}</td>
                <td className="p-3 text-right">{formatNaira(p.price)}</td>
                <td className="p-3 text-right">{p.stock}</td>
                <td className="p-3 text-right">
                  <button onClick={() => setEditing(p)} className="text-xs underline mr-3">Edit</button>
                  <button
                    onClick={() => {
                      triggerConfirm(
                        "Delete Product",
                        `Are you sure you want to delete product "${p.name}"? This action completely removes it from the database.`,
                        () => {
                          remove(p.id);
                          toast.success(`Product "${p.name}" deleted successfully from the database.`);
                        },
                        "danger"
                      );
                    }}
                    className="text-xs text-destructive"
                    title="Delete Product"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <ProductEditor
          product={editing}
          onClose={() => setEditing(null)}
          onSave={(p) => { upsert(p); setEditing(null); toast.success("Product saved"); }}
        />
      )}

      <ConfirmationModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
        variant={confirmState.variant}
      />
    </div>
  );
}

function ProductEditor({ product, onClose, onSave }: { product: Product; onClose: () => void; onSave: (p: Product) => void }) {
  const [p, setP] = useState(product);
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP({ ...p, [k]: v });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file is too large (max 10MB).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Target max dimension 800px for superb quality with light payload
        const maxDim = 800;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.75);
          const updatedImages = [...p.images];
          updatedImages[index] = compressedDataUrl;
          set("images", updatedImages);
          toast.success(`Image ${index + 1} uploaded & compressed successfully!`);
        } else {
          if (typeof reader.result === "string") {
            const updatedImages = [...p.images];
            updatedImages[index] = reader.result;
            set("images", updatedImages);
            toast.success(`Image ${index + 1} uploaded successfully!`);
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-ink/50 z-50 grid place-items-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-canvas max-w-xl w-full max-h-[90vh] overflow-auto p-6 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-2xl font-semibold tracking-tighter">{product.name ? "Edit" : "New"} product</h2>
        <Input label="Name" value={p.name} onChange={(v) => set("name", v)} />
        <Input label="Slug (URL)" value={p.slug} onChange={(v) => set("slug", v)} />
        <Input label="Subtitle" value={p.subtitle} onChange={(v) => set("subtitle", v)} />
        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="text-[10px] tracking-widest uppercase font-medium block mb-1.5">Category</span>
            <select value={p.category} onChange={(e) => set("category", e.target.value as Category)} className="w-full border border-ink/20 px-3 py-2 text-sm bg-transparent">
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </label>
          <Input label="Price (₦)" type="number" value={String(p.price)} onChange={(v) => set("price", Number(v) || 0)} />
          <Input label="Stock" type="number" value={String(p.stock)} onChange={(v) => set("stock", Number(v) || 0)} />
        </div>

        {/* Dynamic Image Uploaders */}
        <div className="space-y-3">
          <div>
            <span className="text-[10px] tracking-widest uppercase font-medium block mb-1">Image 1 (Primary)</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={p.images[0] ?? ""}
                onChange={(e) => set("images", [e.target.value, ...p.images.slice(1)])}
                placeholder="Paste image URL here"
                className="flex-1 border border-ink/20 px-3 py-2 text-sm bg-transparent outline-none focus:border-ink"
              />
              <label className="border border-ink bg-ink text-canvas hover:bg-gold hover:border-gold px-3 py-2 text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors flex items-center shrink-0">
                Upload File
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 0)}
                  className="hidden"
                />
              </label>
            </div>
            {p.images[0] && (
              <img src={p.images[0]} alt="Primary Preview" referrerPolicy="no-referrer" className="mt-2 size-16 object-cover border border-ink/10" />
            )}
          </div>

          <div>
            <span className="text-[10px] tracking-widest uppercase font-medium block mb-1">Image 2 (Secondary, Hover)</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={p.images[1] ?? ""}
                onChange={(e) => set("images", [p.images[0] ?? "", e.target.value])}
                placeholder="Paste secondary image URL"
                className="flex-1 border border-ink/20 px-3 py-2 text-sm bg-transparent outline-none focus:border-ink"
              />
              <label className="border border-ink bg-ink text-canvas hover:bg-gold hover:border-gold px-3 py-2 text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors flex items-center shrink-0">
                Upload File
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 1)}
                  className="hidden"
                />
              </label>
            </div>
            {p.images[1] && (
              <img src={p.images[1]} alt="Secondary Preview" referrerPolicy="no-referrer" className="mt-2 size-16 object-cover border border-ink/10" />
            )}
          </div>
        </div>

        <Input label="Sizes (comma)" value={p.sizes.join(", ")} onChange={(v) => set("sizes", v.split(",").map((s) => s.trim()).filter(Boolean))} />
        <Input label="Colors (comma)" value={p.colors.join(", ")} onChange={(v) => set("colors", v.split(",").map((s) => s.trim()).filter(Boolean))} />
        <label className="block">
          <span className="text-[10px] tracking-widest uppercase font-medium block mb-1.5">Description</span>
          <textarea rows={3} value={p.description} onChange={(e) => set("description", e.target.value)} className="w-full border border-ink/20 px-3 py-2 text-sm bg-transparent animate-none" />
        </label>
        <div className="flex gap-2 justify-end pt-4">
          <button onClick={onClose} className="border border-ink/20 px-4 py-2 text-xs tracking-widest uppercase">Cancel</button>
          <button
            onClick={() => {
              if (!p.name || !p.slug) { toast.error("Name and slug required"); return; }
              const autoSlug = p.slug.toLowerCase().trim().replace(/\s+/g, "-");
              onSave({ ...p, slug: autoSlug });
            }}
            className="bg-ink text-canvas px-4 py-2 text-xs tracking-widest uppercase hover:bg-gold hover:text-ink transition-colors"
          >Save</button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-widest uppercase font-medium block mb-1.5">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-ink/20 px-3 py-2 text-sm bg-transparent outline-none focus:border-ink" />
    </label>
  );
}

// ---------- ORDERS ----------
function OrdersTab() {
  const { orders, updateStatus, assignRider, remove } = useOrders();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-semibold tracking-tighter">Orders</h1>
      {orders.length === 0 ? (
        <p className="text-sm text-ink-soft border border-dashed border-ink/20 p-10 text-center">No orders yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <OrderRow
              key={o.ref}
              o={o}
              updateStatus={updateStatus}
              assignRider={assignRider}
              remove={remove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderRow({
  o,
  updateStatus,
  assignRider,
  remove,
}: {
  o: Order;
  updateStatus: (r: string, s: Order["status"]) => void;
  assignRider: (r: string, x: string) => void;
  remove: (r: string) => void;
}) {
  const [rider, setRider] = useState(o.rider ?? "");

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: "danger" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, variant: "danger" | "warning" | "info" = "info") => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      },
      variant
    });
  };

  const handleDelete = () => {
    triggerConfirm(
      "Delete Order",
      `Are you sure you want to delete order ${o.ref}? This action is irreversible.`,
      () => {
        remove(o.ref);
        toast.success("Order deleted successfully.");
      },
      "danger"
    );
  };

  return (
    <div className="border border-ink/10 bg-card p-5 grid md:grid-cols-[1fr_auto] gap-4">
      <div>
        <div className="flex items-baseline gap-3">
          <h3 className="font-display text-lg font-semibold tracking-tighter">{o.ref}</h3>
          <span className="text-[10px] tracking-widest uppercase text-ink-soft">{new Date(o.createdAt).toLocaleString("en-NG")}</span>
        </div>
        <p className="text-sm mt-1">{o.customer.name} · {o.customer.phone} · {o.delivery.zoneLabel}</p>
        <p className="text-xs text-ink-soft mt-1">{o.delivery.address}</p>
        <ul className="text-xs text-ink-soft mt-2 space-y-0.5">
          {o.items.map((i, k) => <li key={k}>· {i.name} ({i.size} / {i.color}) × {i.qty}</li>)}
        </ul>
      </div>
      <div className="flex flex-col gap-2 md:items-end justify-between">
        <div className="space-y-2 flex flex-col items-end">
          <p className="font-medium">{formatNaira(o.total)}</p>
          <select value={o.status} onChange={(e) => updateStatus(o.ref, e.target.value as Order["status"])} className="border border-ink/20 px-2 py-1 text-xs bg-transparent">
            <option value="new">New</option>
            <option value="packed">Packed</option>
            <option value="out">Out for delivery</option>
            <option value="delivered">Delivered</option>
          </select>
          <div className="flex gap-1">
            <input value={rider} onChange={(e) => setRider(e.target.value)} placeholder="Rider" className="border border-ink/20 px-2 py-1 text-xs bg-transparent w-28" />
            <button onClick={() => { assignRider(o.ref, rider); toast.success("Rider assigned"); }} className="text-xs underline">Save</button>
          </div>
        </div>
        
        <button
          onClick={handleDelete}
          className="border border-red-500 text-red-600 hover:bg-red-50 hover:text-red-750 px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase transition-colors flex items-center gap-1 mt-2"
        >
          <Trash2 className="size-3.5" />
          Delete Order
        </button>
      </div>

      <ConfirmationModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
        variant={confirmState.variant}
      />
    </div>
  );
}

// ---------- CUSTOMERS ----------
function CustomersTab() {
  const orders = useOrders((s) => s.orders);
  const map = new Map<string, { name: string; phone: string; orders: number; spent: number }>();
  orders.forEach((o) => {
    const k = o.customer.email;
    const existing = map.get(k) ?? { name: o.customer.name, phone: o.customer.phone, orders: 0, spent: 0 };
    existing.orders += 1;
    existing.spent += o.total;
    map.set(k, existing);
  });
  const rows = Array.from(map.entries());

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-semibold tracking-tighter">Customers</h1>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-soft border border-dashed border-ink/20 p-10 text-center">No customers yet.</p>
      ) : (
        <table className="w-full text-sm bg-card border border-ink/10">
          <thead className="text-[10px] tracking-widest uppercase text-ink-soft border-b border-ink/10">
            <tr><th className="text-left p-3">Name</th><th className="text-left p-3">Email</th><th className="text-left p-3">Phone</th><th className="text-right p-3">Orders</th><th className="text-right p-3">Spent</th></tr>
          </thead>
          <tbody>
            {rows.map(([email, c]) => (
              <tr key={email} className="border-t border-ink/5">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 text-ink-soft">{email}</td>
                <td className="p-3 text-ink-soft">{c.phone}</td>
                <td className="p-3 text-right">{c.orders}</td>
                <td className="p-3 text-right">{formatNaira(c.spent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------- COUPONS ----------
function CouponsTab() {
  const { coupons, add, remove } = useCoupons();
  const [c, setC] = useState<Coupon>({ code: "", percent: 10, expiry: "2026-12-31" });

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: "danger" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, variant: "danger" | "warning" | "info" = "info") => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      },
      variant
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-semibold tracking-tighter">Coupons</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!c.code) return;
          add({ ...c, code: c.code.toUpperCase() });
          setC({ code: "", percent: 10, expiry: "2026-12-31" });
          toast.success("Coupon added");
        }}
        className="grid sm:grid-cols-4 gap-3 bg-card border border-ink/10 p-4"
      >
        <Input label="Code" value={c.code} onChange={(v) => setC({ ...c, code: v })} />
        <Input label="% off" type="number" value={String(c.percent)} onChange={(v) => setC({ ...c, percent: Number(v) || 0 })} />
        <Input label="Expiry" type="date" value={c.expiry} onChange={(v) => setC({ ...c, expiry: v })} />
        <button className="bg-ink text-canvas px-4 py-2 text-xs tracking-widest uppercase self-end">Add</button>
      </form>
      <ul className="divide-y divide-ink/10 border border-ink/10 bg-card">
        {coupons.map((x) => (
          <li key={x.code} className="p-4 flex items-center justify-between text-sm">
            <span className="font-medium font-display tracking-widest">{x.code}</span>
            <span className="text-ink-soft">{x.percent}% off · until {x.expiry}</span>
            <button
              onClick={() => {
                triggerConfirm(
                  "Delete Coupon",
                  `Are you sure you want to delete the coupon "${x.code}"? This will delete it completely from the database.`,
                  () => {
                    remove(x.code);
                    toast.success(`Coupon "${x.code}" deleted successfully from the database.`);
                  },
                  "danger"
                );
              }}
              className="text-destructive"
              title="Delete Coupon"
            >
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>

      <ConfirmationModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
        variant={confirmState.variant}
      />
    </div>
  );
}

// ---------- ZONES ----------
function ZonesTab() {
  const { zones, setZones } = useCatalog();
  const [draft, setDraft] = useState<DeliveryZone[]>(zones);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="font-display text-4xl font-semibold tracking-tighter">Delivery zones</h1>
      <p className="text-sm text-ink-soft">Set the fee and ETA shown at checkout.</p>
      {draft.map((z, idx) => (
        <div key={z.id} className="grid sm:grid-cols-3 gap-3 bg-card border border-ink/10 p-4">
          <Input label="Label" value={z.label} onChange={(v) => setDraft(draft.map((d, i) => i === idx ? { ...d, label: v } : d))} />
          <Input label="Fee (₦)" type="number" value={String(z.fee)} onChange={(v) => setDraft(draft.map((d, i) => i === idx ? { ...d, fee: Number(v) || 0 } : d))} />
          <Input label="ETA" value={z.estimate} onChange={(v) => setDraft(draft.map((d, i) => i === idx ? { ...d, estimate: v } : d))} />
        </div>
      ))}
      <button onClick={() => { setZones(draft); toast.success("Zones updated"); }} className="bg-ink text-canvas px-4 py-2 text-xs tracking-widest uppercase">
        Save
      </button>
    </div>
  );
}

// ---------- SETTINGS (Admin Password / Email Change) ----------
function SettingsTab() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAdminCredentials().then((creds) => {
      if (creds) {
        setEmail(creds.email);
        setPassword(creds.password);
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Email and password cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await updateAdminCredentials(email, password);
      toast.success("Admin credentials updated successfully in Firestore!");
    } catch (err) {
      toast.error("Failed to update admin credentials.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-ink-soft animate-pulse py-10">
        Syncing operations console preferences...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="font-display text-4xl font-semibold tracking-tighter">Console Settings</h1>
        <p className="text-sm text-ink-soft mt-1">Manage operations credentials stored securely in Firestore.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 bg-card border border-ink/10 p-6">
        <div>
          <label className="block">
            <span className="text-[10px] tracking-widest uppercase font-medium block mb-1.5">Admin Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-ink/20 px-3 py-2 text-sm bg-transparent outline-none focus:border-ink"
              required
            />
          </label>
        </div>

        <div>
          <label className="block">
            <span className="text-[10px] tracking-widest uppercase font-medium block mb-1.5">Admin Password</span>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-ink/20 px-3 py-2 text-sm bg-transparent outline-none focus:border-ink font-mono"
              required
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-ink text-canvas hover:bg-gold hover:text-ink px-5 py-3 text-xs font-semibold tracking-widest uppercase transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Credentials"}
        </button>
      </form>
    </div>
  );
}

// ensure tree-shake keeps imports referenced
void useCart;

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "warning" | "info";
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  variant = "info"
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-xs" onClick={onCancel} />
      
      {/* Modal Card */}
      <div className="relative bg-canvas border border-ink/20 w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
          {title}
        </h3>
        <p className="mt-3 text-sm text-ink-soft leading-relaxed">
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="border border-ink/20 px-4 py-2 text-xs tracking-widest uppercase hover:bg-ink/5 transition-colors text-ink font-medium"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-xs tracking-widest uppercase font-medium transition-colors ${
              variant === "danger"
                ? "bg-destructive text-white hover:bg-destructive-90"
                : variant === "warning"
                ? "bg-gold text-ink hover:bg-gold-90"
                : "bg-ink text-canvas hover:bg-ink-90"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

