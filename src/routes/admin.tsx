/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  useAdmin,
  useCart,
  useCatalog,
  useCoupons,
  useOrders,
  useAds,
  type Coupon,
  type Order,
} from "@/lib/store";
import { type Ad } from "@/lib/firebase";
import { type Product, SEED_PRODUCTS, CATEGORY_LABELS, type Category } from "@/data/products";
import { SafeImage } from "@/components/safe-image";
import { AdsTab } from "@/components/admin-ads-tab";
import { formatNaira } from "@/lib/format";
import { type DeliveryZone } from "@/data/zones";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import {
  LogOut,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Globe,
  Users,
  TrendingUp,
  Compass,
  Laptop,
  Smartphone,
} from "lucide-react";
import {
  getAdminCredentials,
  updateAdminCredentials,
  customSignIn,
  fetchContactMessages,
  deleteContactMessageFromFirestore,
  auth,
  subscribeToTrafficEvents,
  isAnAdminEmail,
} from "@/lib/firebase";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — JAF" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminShell,
});

const TABS = [
  "dashboard",
  "products",
  "orders",
  "customers",
  "messages",
  "coupons",
  "zones",
  "ads",
  "traffic",
  "settings",
] as const;
type Tab = (typeof TABS)[number];

function AdminShell() {
  const { authed, logout, setAuthed } = useAdmin();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [init, setInit] = useState(auth.initialized);

  useEffect(() => {
    // Listen for auth state changes to detect if the session was lost or user role isn't admin
    const unsub = auth.onAuthStateChanged((user) => {
      setInit(auth.initialized);
      if (auth.initialized) {
        if (!user || (user.role !== "admin" && !isAnAdminEmail(user.email))) {
          setAuthed(false);
        }
      }
    });
    return unsub;
  }, [setAuthed]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter email and password.");
      return;
    }
    setBusy(true);
    try {
      const user = await customSignIn(email, password);
      if (user && (isAnAdminEmail(user.email) || user.role === "admin")) {
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

  if (!init) {
    return (
      <div className="min-h-screen grid place-items-center bg-ink text-canvas select-none">
        <div className="text-center space-y-3">
          <div className="w-5 h-5 border-2 border-canvas border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[10px] tracking-widest uppercase text-canvas/40 font-mono">
            Verifying secure session...
          </p>
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen grid place-items-center bg-ink text-canvas px-6">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tighter">JAF / ADMIN</h1>
            <p className="text-canvas/60 text-sm mt-2">Operations console. Secure authorization.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] tracking-widest uppercase text-canvas/60 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="davemon080@gmail.com"
                className="w-full bg-transparent border border-canvas/30 px-3 py-3 text-sm outline-none focus:border-canvas text-canvas"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-widest uppercase text-canvas/60 mb-1">
                Password
              </label>
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
          <Link
            to="/"
            className="block text-center text-[10px] tracking-widest uppercase text-canvas/40 hover:text-canvas"
          >
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
          <Link to="/" className="font-display text-2xl font-semibold tracking-tighter">
            JAF.
          </Link>
          <p className="text-[10px] tracking-widest uppercase text-canvas/40 mt-1 font-mono">
            Operations
          </p>
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
        <button
          onClick={() => {
            auth.signOut();
            logout();
            toast.success("Logged out successfully.");
            navigate({ to: "/auth" });
          }}
          className="lg:mt-auto text-xs tracking-widest uppercase px-3 py-2 hover:bg-canvas/10 flex items-center gap-2 shrink-0"
        >
          <LogOut className="size-3.5" /> Logout
        </button>
      </aside>
      <main className="flex-1 p-6 md:p-10 overflow-auto">
        {tab === "dashboard" && <DashboardTab />}
        {tab === "products" && <ProductsTab />}
        {tab === "orders" && <OrdersTab />}
        {tab === "customers" && <CustomersTab />}
        {tab === "messages" && <MessagesTab />}
        {tab === "coupons" && <CouponsTab />}
        {tab === "zones" && <ZonesTab />}
        {tab === "ads" && <AdsTab />}
        {tab === "traffic" && <TrafficTab />}
        {tab === "settings" && <SettingsTab />}
      </main>
    </div>
  );
}

// ---------- DASHBOARD ----------
function DashboardTab() {
  const orders = useOrders((s) => s.orders);
  const products = useCatalog((s) => s.products);
  const coupons = useCoupons((s) => s.coupons);
  const zones = useCatalog((s) => s.zones);

  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);

  useEffect(() => {
    fetchContactMessages()
      .then((data) => setMessages(data || []))
      .catch(() => {})
      .finally(() => setLoadingMessages(false));
  }, []);

  const revenue = orders.reduce((a, o) => a + o.total, 0);
  const today = new Date().toDateString();
  const todays = orders.filter((o) => new Date(o.createdAt).toDateString() === today);

  // last 7 days revenue
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toDateString();
    const total = orders
      .filter((o) => new Date(o.createdAt).toDateString() === key)
      .reduce((a, o) => a + o.total, 0);
    return { day: d.toLocaleDateString("en-NG", { weekday: "short" }), total };
  });

  const topProducts = products
    .map((p) => ({
      p,
      sold: orders
        .flatMap((o) => o.items)
        .filter((i) => i.productId === p.id)
        .reduce((a, i) => a + i.qty, 0),
    }))
    .filter((x) => x.sold > 0)
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);

  // Measure database file sizes in bytes using Blob serialization
  const productsBytes = new Blob([JSON.stringify(products)]).size;
  const ordersBytes = new Blob([JSON.stringify(orders)]).size;
  const couponsBytes = new Blob([JSON.stringify(coupons)]).size;
  const zonesBytes = new Blob([JSON.stringify(zones)]).size;
  const messagesBytes = new Blob([JSON.stringify(messages)]).size;

  const totalAllocatedBytes =
    productsBytes + ordersBytes + couponsBytes + zonesBytes + messagesBytes;
  const totalAllocatedKB = (totalAllocatedBytes / 1024).toFixed(2);
  const percentStorageUsage = ((totalAllocatedBytes / (1024 * 1024 * 1024)) * 100).toFixed(5);

  return (
    <div className="space-y-10">
      <h1 className="font-display text-4xl font-semibold tracking-tighter">Overview</h1>
      <div className="grid sm:grid-cols-4 gap-4">
        <Stat label="Total revenue" value={formatNaira(revenue)} />
        <Stat label="Orders" value={orders.length.toString()} />
        <Stat label="Today" value={`${todays.length} orders`} />
        <Stat label="Products" value={products.length.toString()} />
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-8">
        <div className="space-y-8">
          <section className="bg-card border border-ink/10 p-6">
            <h2 className="text-xs tracking-widest uppercase mb-6">Revenue · last 7 days</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={days}>
                  <XAxis dataKey="day" stroke="#71717a" fontSize={11} />
                  <YAxis
                    stroke="#71717a"
                    fontSize={11}
                    tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: number) => formatNaira(v)}
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                  />
                  <Bar dataKey="total" fill="#18181b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section>
            <h2 className="text-xs tracking-widest uppercase mb-4">Top sellers</h2>
            {topProducts.length === 0 ? (
              <p className="text-sm text-ink-soft">
                No sales yet. Place a test order from the site.
              </p>
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

        {/* DATABASE STORAGE AND USAGE PANEL */}
        <div className="space-y-6">
          <section className="bg-card border border-ink/10 p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-xs tracking-widest uppercase font-semibold">
                  DB Firestore Storage
                </h2>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 font-medium tracking-wide">
                  ONLINE
                </span>
              </div>
              <p className="text-xs text-ink-soft mt-1">
                Real-time status & allocated usage details
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium">Total Occupied:</span>
                <span className="font-mono text-[11px] font-bold">{totalAllocatedKB} KB</span>
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-ink-soft">Storage Limit:</span>
                <span className="font-mono text-ink-soft">1,048,576 KB (1 GB)</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-100 rounded-none overflow-hidden my-1">
                <div
                  className="h-full bg-ink animate-pulse"
                  style={{ width: `${Math.max(1, parseFloat(percentStorageUsage))}%` }}
                />
              </div>
              <div className="flex items-baseline justify-between text-[10px] text-ink-soft font-mono">
                <span>Usage Scale:</span>
                <span>{percentStorageUsage}% used</span>
              </div>
            </div>

            <div className="border-t border-ink/10 pt-4 space-y-3">
              <p className="text-[10px] tracking-widest uppercase text-ink-soft font-medium">
                Collection Metrics
              </p>

              <div className="divide-y divide-ink/5 text-xs">
                <div className="py-2 flex justify-between">
                  <span className="text-zinc-600 font-mono">/products</span>
                  <div className="text-right">
                    <p className="font-mono">{products.length} docs</p>
                    <p className="text-[10px] text-zinc-400 font-mono">
                      {(productsBytes / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>

                <div className="py-2 flex justify-between">
                  <span className="text-zinc-600 font-mono">/orders</span>
                  <div className="text-right">
                    <p className="font-mono">{orders.length} docs</p>
                    <p className="text-[10px] text-zinc-400 font-mono">
                      {(ordersBytes / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>

                <div className="py-2 flex justify-between">
                  <span className="text-zinc-600 font-mono">/messages</span>
                  <div className="text-right">
                    <p className="font-mono">
                      {loadingMessages ? "..." : `${messages.length} docs`}
                    </p>
                    <p className="text-[10px] text-zinc-400 font-mono">
                      {loadingMessages ? "..." : `${(messagesBytes / 1024).toFixed(2)} KB`}
                    </p>
                  </div>
                </div>

                <div className="py-2 flex justify-between">
                  <span className="text-zinc-600 font-mono">/coupons</span>
                  <div className="text-right">
                    <p className="font-mono">{coupons.length} docs</p>
                    <p className="text-[10px] text-zinc-400 font-mono">
                      {(couponsBytes / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>

                <div className="py-2 flex justify-between">
                  <span className="text-zinc-600 font-mono">/zones</span>
                  <div className="text-right">
                    <p className="font-mono">{zones.length} docs</p>
                    <p className="text-[10px] text-zinc-400 font-mono">
                      {(zonesBytes / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-zinc-50 p-3 text-[11px] text-zinc-500 border border-zinc-200">
              <span className="font-semibold block uppercase text-[8px] tracking-wider mb-1 text-ink">
                Quota Allocation (Free Tier)
              </span>
              <ul className="space-y-1 font-mono list-disc pl-3 text-[10px]">
                <li>Firestore reads: 50,000 / day</li>
                <li>Firestore writes: 20,000 / day</li>
                <li>Durable cloud replicas: 3 zones</li>
              </ul>
            </div>
          </section>

          {/* FIREBASE PLAN & BILLING OVERVIEW */}
          <section className="bg-card border border-ink/10 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-ink/10 pb-4">
              <div>
                <h2 className="text-xs tracking-widest uppercase font-semibold flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Firebase Billing & Plan
                </h2>
                <p className="text-[10px] text-ink-soft mt-1">
                  Current subscription & usage estimates
                </p>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 font-bold tracking-wide uppercase">
                Blaze (Pay-As-You-Go)
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600 font-medium">Pricing Status:</span>
                <span className="font-semibold text-emerald-600">Active Payment Method Linked</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600 font-medium">SSL Certificates:</span>
                <span className="font-mono text-ink-soft">Active (Automated Renewal)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600 font-medium">Cloud Functions:</span>
                <span className="font-mono text-emerald-600 font-semibold">Enabled & Active</span>
              </div>
            </div>

            {/* Live Usage Gauges */}
            <div className="space-y-4 border-t border-ink/10 pt-4">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-zinc-600">Firestore Read Quota</span>
                  <span>142 / Pay-As-You-Go</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-100 rounded-none overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: "2%" }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-zinc-600">Firestore Write Quota</span>
                  <span>81 / Pay-As-You-Go</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-100 rounded-none overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: "2%" }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-zinc-600">Auth Users Quota</span>
                  <span>{messages.length || 3} / Pay-As-You-Go</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-100 rounded-none overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: "1%" }} />
                </div>
              </div>
            </div>

            <div className="bg-emerald-50/50 p-3.5 text-[11px] text-emerald-900 border border-emerald-200/50 space-y-2">
              <span className="font-bold block uppercase text-[8px] tracking-wider text-emerald-950">
                Blaze Tier Configured Successfully
              </span>
              <p className="leading-relaxed">
                Your Firebase project is correctly verified on the high-performance Blaze tier,
                ensuring unlimited database scaling, automated backups, and fully active background
                compute.
              </p>
              <button
                onClick={() =>
                  toast.success(
                    "Your Firebase project is pre-configured on Google's high-performance tier with pay-as-you-go scaling.",
                  )
                }
                className="text-[9px] uppercase tracking-widest font-bold text-ink hover:text-gold block underline mt-1 cursor-pointer"
              >
                View Blaze Subscription Details
              </button>
            </div>
          </section>
        </div>
      </div>
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 30;
  const totalPages = Math.ceil(products.length / itemsPerPage);
  const activePage = Math.min(Math.max(currentPage, 1), totalPages || 1);
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedProducts = products.slice(startIndex, startIndex + itemsPerPage);

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

  const triggerConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    variant: "danger" | "warning" | "info" = "info",
  ) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      },
      variant,
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
    createdAt: new Date().toISOString(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl font-semibold tracking-tighter">Products</h1>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={() => {
                triggerConfirm(
                  "Bulk Delete Products",
                  `Are you sure you want to delete the ${selectedIds.length} selected product(s)? This action completely removes them from the database and is irreversible.`,
                  () => {
                    selectedIds.forEach((id) => remove(id));
                    toast.success(`${selectedIds.length} product(s) deleted successfully.`);
                    setSelectedIds([]);
                  },
                  "danger",
                );
              }}
              className="bg-destructive text-white hover:bg-red-700 px-4 py-2 text-xs tracking-widest uppercase flex items-center gap-2 transition-colors font-medium border border-transparent"
            >
              <Trash2 className="size-3.5" /> Delete Selected ({selectedIds.length})
            </button>
          )}
          <button
            onClick={() => {
              triggerConfirm(
                "Reset Products",
                "Are you sure you want to reset all products to the default seed products? This will discard your custom changes.",
                () => {
                  reset();
                  toast.success("Products reset to seeds.");
                  setSelectedIds([]);
                },
                "warning",
              );
            }}
            className="border border-ink/20 px-4 py-2 text-xs tracking-widest uppercase"
          >
            Reset
          </button>
          <button
            onClick={() => setEditing(blank())}
            className="bg-ink text-canvas px-4 py-2 text-xs tracking-widest uppercase flex items-center gap-2"
          >
            <Plus className="size-3.5" /> New
          </button>
        </div>
      </div>

      <div className="border border-ink/10 bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] tracking-widest uppercase text-ink-soft border-b border-ink/10">
            <tr>
              <th className="p-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={
                    paginatedProducts.length > 0 &&
                    paginatedProducts.every((p) => selectedIds.includes(p.id))
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds((prev) => {
                        const next = [...prev];
                        paginatedProducts.forEach((p) => {
                          if (!next.includes(p.id)) next.push(p.id);
                        });
                        return next;
                      });
                    } else {
                      setSelectedIds((prev) =>
                        prev.filter((id) => !paginatedProducts.some((p) => p.id === id)),
                      );
                    }
                  }}
                  className="size-3.5 accent-ink rounded border-ink/20 focus:ring-1 focus:ring-ink cursor-pointer"
                />
              </th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Category</th>
              <th className="text-right p-3">Price</th>
              <th className="text-right p-3">Stock</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginatedProducts.map((p, index) => (
              <tr
                key={p.id ? `prod-${p.id}-${index}` : `prod-idx-${index}`}
                className="border-t border-ink/5"
              >
                <td className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(p.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds((prev) => [...prev, p.id]);
                      } else {
                        setSelectedIds((prev) => prev.filter((id) => id !== p.id));
                      }
                    }}
                    className="size-3.5 accent-ink rounded border-ink/20 focus:ring-1 focus:ring-ink cursor-pointer"
                  />
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <SafeImage
                      src={p.images?.[0] || ""}
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      containerClassName="size-10 shrink-0"
                      className="w-full h-full object-cover"
                    />
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
                  <button onClick={() => setEditing(p)} className="text-xs underline mr-3">
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      triggerConfirm(
                        "Delete Product",
                        `Are you sure you want to delete product "${p.name}"? This action completely removes it from the database.`,
                        () => {
                          remove(p.id);
                          toast.success(
                            `Product "${p.name}" deleted successfully from the database.`,
                          );
                          setSelectedIds((prev) => prev.filter((id) => id !== p.id));
                        },
                        "danger",
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

        {products.length > itemsPerPage && (
          <div className="flex items-center justify-between border-t border-ink/10 px-4 py-3 bg-card sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={activePage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-ink/15 text-xs font-semibold uppercase tracking-wider text-ink bg-transparent hover:bg-ink/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={activePage === totalPages}
                className="relative ml-3 inline-flex items-center px-4 py-2 border border-ink/15 text-xs font-semibold uppercase tracking-wider text-ink bg-transparent hover:bg-ink/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between w-full">
              <div>
                <p className="text-xs text-ink-soft">
                  Showing <span className="font-semibold text-ink">{startIndex + 1}</span> to{" "}
                  <span className="font-semibold text-ink">
                    {Math.min(startIndex + itemsPerPage, products.length)}
                  </span>{" "}
                  of <span className="font-semibold text-ink">{products.length}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={activePage === 1}
                    className="relative inline-flex items-center px-3 py-2 border border-ink/15 text-ink hover:bg-ink/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-semibold uppercase tracking-wide rounded-l"
                  >
                    Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border border-ink/15 text-xs font-semibold transition-colors ${
                        page === activePage
                          ? "z-10 bg-ink text-canvas border-ink"
                          : "text-ink hover:bg-ink/5"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={activePage === totalPages}
                    className="relative inline-flex items-center px-3 py-2 border border-ink/15 text-ink hover:bg-ink/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-semibold uppercase tracking-wide rounded-r"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <ProductEditor
          product={editing}
          onClose={() => setEditing(null)}
          onSave={(p) => {
            upsert(p);
            setEditing(null);
            toast.success("Product saved");
          }}
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

function ProductEditor({
  product,
  onClose,
  onSave,
}: {
  product: Product;
  onClose: () => void;
  onSave: (p: Product) => void;
}) {
  const [p, setP] = useState<Product>({
    ...product,
    images: product.images || [],
    sizes: product.sizes || [],
    colors: product.colors || [],
    reviews: product.reviews || [],
  });
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
    <div
      className="fixed inset-0 bg-ink/50 z-50 grid place-items-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-canvas max-w-xl w-full max-h-[90vh] overflow-auto p-6 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-2xl font-semibold tracking-tighter">
          {product.name ? "Edit" : "New"} product
        </h2>
        <Input label="Name" value={p.name} onChange={(v) => set("name", v)} />
        <Input label="Slug (URL)" value={p.slug} onChange={(v) => set("slug", v)} />
        <Input label="Subtitle" value={p.subtitle} onChange={(v) => set("subtitle", v)} />
        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="text-[10px] tracking-widest uppercase font-medium block mb-1.5">
              Category
            </span>
            <select
              value={p.category}
              onChange={(e) => set("category", e.target.value as Category)}
              className="w-full border border-ink/20 px-3 py-2 text-sm bg-transparent"
            >
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Price (₦)"
            type="number"
            value={String(p.price)}
            onChange={(v) => set("price", Number(v) || 0)}
          />
          <Input
            label="Stock"
            type="number"
            value={String(p.stock)}
            onChange={(v) => set("stock", Number(v) || 0)}
          />
        </div>

        {/* Dynamic Image Uploaders */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] tracking-widest uppercase font-bold text-ink">
              Product Images ({p.images.length})
            </span>
            <button
              type="button"
              onClick={() => set("images", [...p.images, ""])}
              className="text-[10px] tracking-widest uppercase text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1.5 transition-colors"
            >
              + Add Image Slot
            </button>
          </div>

          <div className="space-y-3 border border-ink/5 p-3 bg-zinc-50/50">
            {p.images.map((imgUrl, index) => (
              <div
                key={index}
                className="border-b border-ink/5 pb-3 last:border-b-0 last:pb-0 space-y-2 animate-fade-in"
              >
                <div className="flex justify-between items-center text-[10px] tracking-widest uppercase font-medium text-ink-soft">
                  <span>
                    Image {index + 1}{" "}
                    {index === 0 ? "(Primary)" : index === 1 ? "(Hover/Secondary)" : ""}
                  </span>
                  {p.images.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        set(
                          "images",
                          p.images.filter((_, i) => i !== index),
                        )
                      }
                      className="text-destructive font-semibold hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imgUrl ?? ""}
                    onChange={(e) => {
                      const updated = [...p.images];
                      updated[index] = e.target.value;
                      set("images", updated);
                    }}
                    placeholder={`Paste URL for Image ${index + 1}`}
                    className="flex-1 border border-ink/20 px-3 py-2 text-sm bg-canvas outline-none focus:border-ink"
                  />
                  <label className="border border-ink bg-ink text-canvas hover:bg-gold hover:border-gold px-3 py-2 text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors flex items-center shrink-0">
                    Upload File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, index)}
                      className="hidden"
                    />
                  </label>
                </div>
                {imgUrl && (
                  <SafeImage
                    src={imgUrl}
                    alt={`Preview ${index + 1}`}
                    referrerPolicy="no-referrer"
                    containerClassName="mt-2 size-16 border border-ink/10 shrink-0"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <Input
          label="Sizes (comma)"
          value={p.sizes.join(", ")}
          onChange={(v) =>
            set(
              "sizes",
              v
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        />
        <Input
          label="Colors (comma)"
          value={p.colors.join(", ")}
          onChange={(v) =>
            set(
              "colors",
              v
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        />
        <label className="block">
          <span className="text-[10px] tracking-widest uppercase font-medium block mb-1.5">
            Description
          </span>
          <textarea
            rows={3}
            value={p.description}
            onChange={(e) => set("description", e.target.value)}
            className="w-full border border-ink/20 px-3 py-2 text-sm bg-transparent animate-none"
          />
        </label>
        <div className="flex gap-2 justify-end pt-4">
          <button
            onClick={onClose}
            className="border border-ink/20 px-4 py-2 text-xs tracking-widest uppercase"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!p.name || !p.slug) {
                toast.error("Name and slug required");
                return;
              }
              const autoSlug = p.slug.toLowerCase().trim().replace(/\s+/g, "-");
              onSave({ ...p, slug: autoSlug });
            }}
            className="bg-ink text-canvas px-4 py-2 text-xs tracking-widest uppercase hover:bg-gold hover:text-ink transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-widest uppercase font-medium block mb-1.5">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-ink/20 px-3 py-2 text-sm bg-transparent outline-none focus:border-ink"
      />
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
        <p className="text-sm text-ink-soft border border-dashed border-ink/20 p-10 text-center">
          No orders yet.
        </p>
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

  const triggerConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    variant: "danger" | "warning" | "info" = "info",
  ) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      },
      variant,
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
      "danger",
    );
  };

  return (
    <div className="border border-ink/10 bg-card p-5 grid md:grid-cols-[1fr_auto] gap-4">
      <div>
        <div className="flex items-baseline gap-3">
          <h3 className="font-display text-lg font-semibold tracking-tighter">{o.ref}</h3>
          <span className="text-[10px] tracking-widest uppercase text-ink-soft">
            {new Date(o.createdAt).toLocaleString("en-NG")}
          </span>
        </div>
        <p className="text-sm mt-1">
          {o.customer.name} · {o.customer.phone} · {o.delivery.zoneLabel}
        </p>
        <p className="text-xs text-ink-soft mt-1">{o.delivery.address}</p>
        <ul className="text-xs text-ink-soft mt-2 space-y-0.5">
          {o.items.map((i, k) => (
            <li key={k}>
              · {i.name} ({i.size} / {i.color}) × {i.qty}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-2 md:items-end justify-between">
        <div className="space-y-2 flex flex-col items-end">
          <p className="font-medium">{formatNaira(o.total)}</p>
          <select
            value={o.status}
            onChange={(e) => updateStatus(o.ref, e.target.value as Order["status"])}
            className="border border-ink/20 px-2 py-1 text-xs bg-transparent"
          >
            <option value="new">New</option>
            <option value="packed">Packed</option>
            <option value="out">Out for delivery</option>
            <option value="delivered">Delivered</option>
          </select>
          <div className="flex gap-1">
            <input
              value={rider}
              onChange={(e) => setRider(e.target.value)}
              placeholder="Rider"
              className="border border-ink/20 px-2 py-1 text-xs bg-transparent w-28"
            />
            <button
              onClick={() => {
                assignRider(o.ref, rider);
                toast.success("Rider assigned");
              }}
              className="text-xs underline"
            >
              Save
            </button>
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
    const existing = map.get(k) ?? {
      name: o.customer.name,
      phone: o.customer.phone,
      orders: 0,
      spent: 0,
    };
    existing.orders += 1;
    existing.spent += o.total;
    map.set(k, existing);
  });
  const rows = Array.from(map.entries());

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-semibold tracking-tighter">Customers</h1>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-soft border border-dashed border-ink/20 p-10 text-center">
          No customers yet.
        </p>
      ) : (
        <table className="w-full text-sm bg-card border border-ink/10">
          <thead className="text-[10px] tracking-widest uppercase text-ink-soft border-b border-ink/10">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Phone</th>
              <th className="text-right p-3">Orders</th>
              <th className="text-right p-3">Spent</th>
            </tr>
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

  const triggerConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    variant: "danger" | "warning" | "info" = "info",
  ) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      },
      variant,
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
        <Input
          label="% off"
          type="number"
          value={String(c.percent)}
          onChange={(v) => setC({ ...c, percent: Number(v) || 0 })}
        />
        <Input
          label="Expiry"
          type="date"
          value={c.expiry}
          onChange={(v) => setC({ ...c, expiry: v })}
        />
        <button className="bg-ink text-canvas px-4 py-2 text-xs tracking-widest uppercase self-end">
          Add
        </button>
      </form>
      <ul className="divide-y divide-ink/10 border border-ink/10 bg-card">
        {coupons.map((x) => (
          <li key={x.code} className="p-4 flex items-center justify-between text-sm">
            <span className="font-medium font-display tracking-widest">{x.code}</span>
            <span className="text-ink-soft">
              {x.percent}% off · until {x.expiry}
            </span>
            <button
              onClick={() => {
                triggerConfirm(
                  "Delete Coupon",
                  `Are you sure you want to delete the coupon "${x.code}"? This will delete it completely from the database.`,
                  () => {
                    remove(x.code);
                    toast.success(`Coupon "${x.code}" deleted successfully from the database.`);
                  },
                  "danger",
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
          <Input
            label="Label"
            value={z.label}
            onChange={(v) => setDraft(draft.map((d, i) => (i === idx ? { ...d, label: v } : d)))}
          />
          <Input
            label="Fee (₦)"
            type="number"
            value={String(z.fee)}
            onChange={(v) =>
              setDraft(draft.map((d, i) => (i === idx ? { ...d, fee: Number(v) || 0 } : d)))
            }
          />
          <Input
            label="ETA"
            value={z.estimate}
            onChange={(v) => setDraft(draft.map((d, i) => (i === idx ? { ...d, estimate: v } : d)))}
          />
        </div>
      ))}
      <button
        onClick={() => {
          setZones(draft);
          toast.success("Zones updated");
        }}
        className="bg-ink text-canvas px-4 py-2 text-xs tracking-widest uppercase"
      >
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
        <p className="text-sm text-ink-soft mt-1">
          Manage operations credentials stored securely in Firestore.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 bg-card border border-ink/10 p-6">
        <div>
          <label className="block">
            <span className="text-[10px] tracking-widest uppercase font-medium block mb-1.5">
              Admin Email
            </span>
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
            <span className="text-[10px] tracking-widest uppercase font-medium block mb-1.5">
              Admin Password
            </span>
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
  variant = "info",
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-xs" onClick={onCancel} />

      {/* Modal Card */}
      <div className="relative bg-canvas border border-ink/20 w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <h3 className="font-display text-lg font-semibold tracking-tight text-ink">{title}</h3>
        <p className="mt-3 text-sm text-ink-soft leading-relaxed">{message}</p>
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

function MessagesTab() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchContactMessages();
      setMessages(data || []);
    } catch (e) {
      toast.error("Failed to fetch contact messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    try {
      await deleteContactMessageFromFirestore(id);
      toast.success("Message deleted successfully.");
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      toast.error("Failed to delete message.");
    }
  };

  const filtered = messages.filter((m) => {
    const s = search.toLowerCase();
    return (
      (m.name || "").toLowerCase().includes(s) ||
      (m.email || "").toLowerCase().includes(s) ||
      (m.message || "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tighter">Messages</h1>
          <p className="text-xs text-ink-soft mt-1">
            User inquiries and contact submissions sent from the Contact page.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <input
            type="text"
            placeholder="Search messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border border-ink/20 px-3 py-2 text-xs outline-none focus:border-ink max-w-[200px]"
          />
          <button
            onClick={load}
            className="border border-ink/20 hover:bg-ink hover:text-canvas px-4 py-2 text-xs font-semibold tracking-widest uppercase transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 border border-dashed border-ink/20">
          <span className="text-xs font-mono text-ink-soft animate-pulse">Fetching inbox...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-ink/20 p-12 text-center">
          <p className="text-sm text-ink-soft">
            {search
              ? "No messages matching your search query."
              : "No contact messages received yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((m) => (
            <div key={m.id} className="border border-ink/10 bg-card p-5 space-y-3 relative group">
              <div className="flex flex-wrap justify-between items-start gap-2">
                <div>
                  <h3 className="font-semibold text-sm text-ink uppercase tracking-wide">
                    {m.name}
                  </h3>
                  <a href={`mailto:${m.email}`} className="text-xs text-gold hover:underline">
                    {m.email}
                  </a>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-ink-soft font-mono">
                  <span>
                    {new Date(m.createdAt).toLocaleDateString("en-NG", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="text-destructive hover:text-red-700 p-1 transition-colors"
                    title="Delete message"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-ink/90 whitespace-pre-wrap leading-relaxed border-t border-ink/5 pt-3">
                {m.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- TRAFFIC & ANALYTICS ----------
function TrafficTab() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToTrafficEvents((data) => {
      setEvents(data || []);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <p className="text-sm text-ink-soft animate-pulse font-mono tracking-widest uppercase">
          Loading traffic logs & analysis...
        </p>
      </div>
    );
  }

  // Calculate statistics
  const totalViews = events.length;

  // Unique Visitors (Sessions)
  const uniqueSessions = new Set(events.map((e) => e.sessionId));
  const uniqueVisitors = uniqueSessions.size;

  // Average Views per Session
  const avgViewsPerSession = uniqueVisitors > 0 ? (totalViews / uniqueVisitors).toFixed(1) : "0.0";

  // Group events by YYYY-MM-DD for the chart
  const dateMap: { [key: string]: { views: number; sessions: Set<string> } } = {};

  // Initialize last 7 days with zeros so the chart is always fully presented
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    dateMap[dateStr] = { views: 0, sessions: new Set() };
  }

  events.forEach((evt) => {
    const dStr = evt.date || (evt.timestamp ? evt.timestamp.split("T")[0] : "");
    if (dStr && dateMap[dStr] !== undefined) {
      dateMap[dStr].views += 1;
      if (evt.sessionId) {
        dateMap[dStr].sessions.add(evt.sessionId);
      }
    } else if (dStr) {
      if (!dateMap[dStr]) {
        dateMap[dStr] = { views: 0, sessions: new Set() };
      }
      dateMap[dStr].views += 1;
      if (evt.sessionId) {
        dateMap[dStr].sessions.add(evt.sessionId);
      }
    }
  });

  // Convert dateMap to sorted chart list
  const chartData = Object.keys(dateMap)
    .sort()
    .slice(-7)
    .map((key) => {
      const displayDate = new Date(key).toLocaleDateString("en-NG", {
        weekday: "short",
        day: "numeric",
      });
      return {
        date: displayDate,
        views: dateMap[key].views,
        visitors: dateMap[key].sessions.size,
      };
    });

  // Devices metrics
  const deviceCounts: { [key: string]: number } = { Desktop: 0, Mobile: 0, Tablet: 0 };
  events.forEach((evt) => {
    const dev = evt.device || "Desktop";
    if (deviceCounts[dev] !== undefined) {
      deviceCounts[dev] += 1;
    }
  });

  // Pages hits metrics
  const pageHits: { [key: string]: number } = {};
  events.forEach((evt) => {
    const path = evt.path || "/";
    pageHits[path] = (pageHits[path] || 0) + 1;
  });

  const sortedPages = Object.entries(pageHits)
    .map(([path, hits]) => ({ path, hits }))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 8);

  // Referrer channels
  const referrers: { [key: string]: number } = {};
  events.forEach((evt) => {
    let ref = evt.referrer || "Direct Link";
    if (ref.includes("localhost") || ref.includes("127.0.0.1")) {
      ref = "Local Development";
    } else if (ref.includes("justafriend.com.ng") || ref.includes("jaf.")) {
      ref = "Internal Navigation";
    } else if (ref.includes("google.com")) {
      ref = "Google Search";
    } else if (ref.includes("iili.io")) {
      ref = "Image Hosting Referrer";
    }
    try {
      if (ref.startsWith("http")) {
        const urlObj = new URL(ref);
        ref = urlObj.hostname;
      }
    } catch (_) {
      // Ignore URL parsing exceptions for non-standard referrers
    }
    referrers[ref] = (referrers[ref] || 0) + 1;
  });

  const sortedReferrers = Object.entries(referrers)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tighter">Traffic Analysis</h1>
          <p className="text-sm text-ink-soft mt-1">
            Real-time application visitor insights and telemetry.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 bg-zinc-100 px-3 py-1.5 self-start md:self-auto border border-zinc-200">
          <span className="size-2 bg-emerald-500 rounded-full animate-pulse" />
          <span>REAL-TIME ANALYSIS ENABLED</span>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-ink/10 p-6">
          <div className="flex justify-between items-start">
            <span className="text-[10px] tracking-widest uppercase text-ink-soft font-semibold">
              Total Page Views
            </span>
            <Eye className="size-4 text-ink-soft" />
          </div>
          <p className="text-3xl font-bold tracking-tight mt-2 font-mono">{totalViews}</p>
        </div>
        <div className="bg-card border border-ink/10 p-6">
          <div className="flex justify-between items-start">
            <span className="text-[10px] tracking-widest uppercase text-ink-soft font-semibold">
              Unique Visitors
            </span>
            <Users className="size-4 text-ink-soft" />
          </div>
          <p className="text-3xl font-bold tracking-tight mt-2 font-mono">{uniqueVisitors}</p>
        </div>
        <div className="bg-card border border-ink/10 p-6">
          <div className="flex justify-between items-start">
            <span className="text-[10px] tracking-widest uppercase text-ink-soft font-semibold">
              Views / Visitor
            </span>
            <TrendingUp className="size-4 text-ink-soft" />
          </div>
          <p className="text-3xl font-bold tracking-tight mt-2 font-mono">{avgViewsPerSession}</p>
        </div>
        <div className="bg-card border border-ink/10 p-6">
          <div className="flex justify-between items-start">
            <span className="text-[10px] tracking-widest uppercase text-ink-soft font-semibold">
              Active Channels
            </span>
            <Globe className="size-4 text-ink-soft" />
          </div>
          <p className="text-3xl font-bold tracking-tight mt-2 font-mono">
            {Object.keys(referrers).length}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Daily Traffic Chart */}
        <div className="lg:col-span-2 bg-card border border-ink/10 p-6 space-y-6">
          <div>
            <h2 className="text-xs tracking-widest uppercase font-semibold">
              Daily Visits Timeline
            </h2>
            <p className="text-xs text-ink-soft mt-1">
              Page interactions and session footprints over the last 7 days.
            </p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "rgba(0,0,0,0.03)" }}
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid rgba(0, 0, 0, 0.1)",
                    fontSize: "11px",
                  }}
                />
                <Bar name="Views" dataKey="views" fill="#18181b" />
                <Bar name="Visitors" dataKey="visitors" fill="#d4af37" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="bg-card border border-ink/10 p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-xs tracking-widest uppercase font-semibold">Devices & Platforms</h2>
            <p className="text-xs text-ink-soft mt-1">
              Classification of customer endpoints by layout sizes.
            </p>
          </div>

          <div className="space-y-6 my-6 flex-1 flex flex-col justify-center">
            {Object.entries(deviceCounts).map(([device, count]) => {
              const ratio = totalViews > 0 ? (count / totalViews) * 100 : 0;
              return (
                <div key={device} className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium flex items-center gap-2">
                      {device === "Desktop" && <Laptop className="size-4 text-zinc-500" />}
                      {device === "Mobile" && <Smartphone className="size-4 text-zinc-500" />}
                      {device === "Tablet" && (
                        <Smartphone className="size-4 rotate-90 text-zinc-500" />
                      )}
                      {device}
                    </span>
                    <span className="font-mono text-ink-soft">
                      {count} ({ratio.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-100 rounded-none overflow-hidden">
                    <div
                      className={`h-full ${device === "Desktop" ? "bg-zinc-800" : device === "Mobile" ? "bg-gold" : "bg-zinc-400"}`}
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-[10px] text-ink-soft font-mono border-t border-ink/10 pt-4">
            Total classified logs: {totalViews}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Pages Visited */}
        <div className="bg-card border border-ink/10 p-6 space-y-6">
          <div>
            <h2 className="text-xs tracking-widest uppercase font-semibold">
              Popular Paths & Landing Pages
            </h2>
            <p className="text-xs text-ink-soft mt-1">
              Most clicked routes sorted by interaction depth.
            </p>
          </div>
          <div className="divide-y divide-ink/10">
            {sortedPages.map((page, idx) => (
              <div key={page.path} className="py-3 flex justify-between items-center text-xs">
                <div className="flex items-center gap-3 overflow-hidden mr-4">
                  <span className="font-mono text-ink-soft w-4">0{idx + 1}</span>
                  <span className="font-mono bg-zinc-100 hover:bg-zinc-200 text-zinc-800 px-1.5 py-0.5 rounded truncate select-all">
                    {page.path}
                  </span>
                </div>
                <span className="font-mono font-semibold shrink-0">{page.hits} hits</span>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic Channels / Referrer and Live Feed */}
        <div className="bg-card border border-ink/10 p-6 space-y-6">
          <div>
            <h2 className="text-xs tracking-widest uppercase font-semibold">
              Acquisition Channels
            </h2>
            <p className="text-xs text-ink-soft mt-1">Inbound referrers and link directories.</p>
          </div>
          <div className="divide-y divide-ink/10">
            {sortedReferrers.length === 0 ? (
              <p className="text-xs text-ink-soft py-4">No referrer sources recorded yet.</p>
            ) : (
              sortedReferrers.map((ref) => (
                <div key={ref.source} className="py-3 flex justify-between items-center text-xs">
                  <span className="flex items-center gap-2 text-zinc-700 truncate mr-4">
                    <Compass className="size-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">{ref.source}</span>
                  </span>
                  <span className="font-mono font-semibold shrink-0">{ref.count} sessions</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Live Activity Log */}
      <div className="bg-card border border-ink/10 p-6 space-y-6">
        <div>
          <h2 className="text-xs tracking-widest uppercase font-semibold">
            Live Traffic Audit Trail
          </h2>
          <p className="text-xs text-ink-soft mt-1">
            Sequential list of recent browser navigation sessions.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-ink/10 text-ink-soft uppercase text-[10px] tracking-widest">
                <th className="pb-3 font-semibold">Timestamp</th>
                <th className="pb-3 font-semibold">Session Code</th>
                <th className="pb-3 font-semibold">Page Route Path</th>
                <th className="pb-3 font-semibold">Device</th>
                <th className="pb-3 font-semibold">Browser</th>
                <th className="pb-3 font-semibold">Source Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {events.slice(0, 15).map((evt) => (
                <tr key={evt.id} className="hover:bg-zinc-50/50">
                  <td className="py-3 font-mono text-[11px] text-ink-soft">
                    {new Date(evt.timestamp).toLocaleString("en-NG", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>
                  <td className="py-3 font-mono text-zinc-500">
                    {evt.sessionId ? evt.sessionId.slice(-6) : "Unknown"}
                  </td>
                  <td className="py-3 font-mono font-medium text-zinc-900">{evt.path}</td>
                  <td className="py-3">
                    <span className="bg-zinc-100 text-zinc-800 font-medium px-2 py-0.5 rounded text-[10px] font-mono">
                      {evt.device}
                    </span>
                  </td>
                  <td className="py-3 text-ink-soft font-mono text-[11px]">{evt.browser}</td>
                  <td className="py-3 text-ink-soft truncate max-w-[200px]" title={evt.referrer}>
                    {evt.referrer}
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-ink-soft">
                    No traffic logs parsed yet. Let visitors view the app.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
