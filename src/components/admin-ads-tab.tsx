import { useState } from "react";
import { useAds, type Ad, useCatalog } from "@/lib/store";
import { formatNaira } from "@/lib/format";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Eye,
  Megaphone,
  Clock,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

// Color options with tailwind styling classes
const COLOR_PRESETS = [
  {
    name: "Gold Accent",
    bg: "bg-gold text-ink border-gold",
    badge: "bg-ink text-gold",
    text: "text-ink",
  },
  {
    name: "Sleek Dark",
    bg: "bg-ink text-canvas border-canvas/20",
    badge: "bg-canvas text-ink",
    text: "text-canvas",
  },
  {
    name: "Pure Light",
    bg: "bg-canvas text-ink border-ink/20",
    badge: "bg-ink text-canvas",
    text: "text-ink",
  },
  {
    name: "Street Neon",
    bg: "bg-lime-400 text-ink border-lime-400",
    badge: "bg-ink text-lime-400",
    text: "text-ink",
  },
  {
    name: "Cyberpunk Red",
    bg: "bg-rose-600 text-canvas border-rose-600",
    badge: "bg-canvas text-rose-600",
    text: "text-canvas",
  },
  {
    name: "Tech Blue",
    bg: "bg-zinc-900 text-cyan-400 border-cyan-400/40",
    badge: "bg-cyan-400 text-ink",
    text: "text-cyan-400",
  },
];

const PRESET_IMAGES = [
  { name: "Default Banner Placeholder", url: "https://iili.io/CxhVz4j.jpg" },
  { name: "Situationship Tee", url: "https://iili.io/CzvuCUF.jpg" },
  { name: "Tee Drop 2", url: "https://iili.io/CzvuxRa.jpg" },
];

const DURATION_PRESETS = [
  { label: "24 Hours (1 Day)", value: 1 },
  { label: "3 Days", value: 3 },
  { label: "7 Days (1 Week)", value: 7 },
  { label: "14 Days (2 Weeks)", value: 14 },
  { label: "30 Days (1 Month)", value: 30 },
  { label: "Unlimited / Run Forever", value: 9999 },
];

const AD_FORMAT_DESCRIPTIONS = {
  banner:
    "A slender premium announcement bar at the very top of the storefront (above the navigation). Great for site-wide discount launches, event notices, operations updates.",
  popup:
    "An interactive, distraction-free modal dialog shown near the bottom-right or centered on load. Highly effective for newsletter captures, limited vouchers, and quick promotions.",
  card: "Inlined natively inside product list grids (e.g. Shop, Related products) resembling sponsored Google elements. Fits elegantly in horizontal or vertical grids.",
};

export function AdsTab() {
  const { ads, upsert, remove } = useAds();
  const products = useCatalog((s) => s.products);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [format, setFormat] = useState<"banner" | "popup" | "card">("banner");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("/shop");
  const [badge, setBadge] = useState("SPONSOR");
  const [active, setActive] = useState(true);
  const [durationDays, setDurationDays] = useState(7);
  const [colorPresetIndex, setColorPresetIndex] = useState(0);

  const handleApplyProduct = (prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;
    setTitle(prod.name);
    setSubtitle(`Promo Code Required. Standard Pricing: ${formatNaira(prod.price)}`);
    setImageUrl(prod.images?.[0] || "");
    setLinkUrl(`/products/${prod.slug}`);
    toast.success(`Prefilled specifications from "${prod.name}"`);
  };

  // Filter/Sort State
  const [filterFormat, setFilterFormat] = useState<"all" | "banner" | "popup" | "card">("all");

  const resetForm = () => {
    setTitle("");
    setSubtitle("");
    setFormat("banner");
    setImageUrl("");
    setLinkUrl("/shop");
    setBadge("SPONSOR");
    setActive(true);
    setDurationDays(7);
    setColorPresetIndex(0);
    setEditingId(null);
    setSelectedProduct("");
  };

  const calculateExpiryDate = (days: number) => {
    if (days === 9999) {
      return new Date("2100-12-31T23:59:59.999Z").toISOString();
    }
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return futureDate.toISOString();
  };

  const getDaysRemainingString = (expiryIso: string) => {
    const totalMs = new Date(expiryIso).getTime() - Date.now();
    if (totalMs <= 0) return "Expired";

    const dObj = new Date(expiryIso);
    if (dObj.getFullYear() > 2090) return "Unlimited Run";

    const totalDays = Math.ceil(totalMs / (1000 * 60 * 60 * 24));
    if (totalDays === 1) return "Ends in 24 hours";
    return `Ends in ${totalDays} days`;
  };

  const handleCreateOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please provide a headline title for the ad.");
      return;
    }

    const selectedPreset = COLOR_PRESETS[colorPresetIndex];
    const existingAd = editingId ? ads.find((a) => a.id === editingId) : null;

    const adData: Ad = {
      id: editingId || `ad_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      format,
      imageUrl: imageUrl.trim() || undefined,
      linkUrl: linkUrl.trim() || undefined,
      badge: badge.trim() || undefined,
      active,
      expiryDate: calculateExpiryDate(durationDays),
      createdAt: existingAd ? existingAd.createdAt : new Date().toISOString(),
      bgColor: selectedPreset.bg,
      textColor: selectedPreset.text,
      clicks: existingAd ? existingAd.clicks || 0 : 0,
    };

    upsert(adData);
    toast.success(editingId ? "Ad successfully updated!" : "New custom ad has been pushed!");
    resetForm();
  };

  const handleEdit = (ad: Ad) => {
    setEditingId(ad.id);
    setTitle(ad.title);
    setSubtitle(ad.subtitle || "");
    setFormat(ad.format);
    setImageUrl(ad.imageUrl || "");
    setLinkUrl(ad.linkUrl || "");
    setBadge(ad.badge || "");
    setActive(ad.active);

    // Try finding duration or just default to 7
    const totalMs = new Date(ad.expiryDate).getTime() - Date.now();
    const days = totalMs > 0 ? Math.ceil(totalMs / (1000 * 3600 * 24)) : 7;
    setDurationDays(days > 1000 ? 9999 : days);

    // Try tracking color preset index
    const matchedIdx = COLOR_PRESETS.findIndex((p) => p.bg === ad.bgColor);
    setColorPresetIndex(matchedIdx >= 0 ? matchedIdx : 0);
  };

  const toggleActiveStatus = (ad: Ad) => {
    const updated = { ...ad, active: !ad.active };
    upsert(updated);
    toast.success(`Ad is now ${updated.active ? "Enabled" : "Disabled"}`);
  };

  const currentSelectedPreset = COLOR_PRESETS[colorPresetIndex];

  // Filter ads
  const filteredAds = ads.filter((ad) => {
    if (filterFormat !== "all" && ad.format !== filterFormat) return false;
    return true;
  });

  return (
    <div className="space-y-10">
      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-[#B39359] font-semibold flex items-center gap-1">
              <Megaphone className="size-3" /> JAF AdSense Engine
            </span>
            <h1 className="font-display text-4xl font-semibold tracking-tighter uppercase">
              Ad Manager
            </h1>
          </div>
          {editingId && (
            <button
              onClick={resetForm}
              className="border border-[#B39359] text-[#B39359] px-4 py-2 text-xs uppercase tracking-wider font-semibold hover:bg-gold hover:text-ink transition-colors"
            >
              Cancel Edit / Create New
            </button>
          )}
        </div>
        <p className="text-sm text-ink-soft max-w-xl mt-2 font-light">
          Configure banners, native card ads, and interactive modal dialog popups dynamically
          injected into the streetwear storefront using JAF AdSense algorithm.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8">
        {/* Left Side: Create/Edit Form */}
        <div className="bg-canvas border border-ink/10 p-6 md:p-8 space-y-6">
          <h2 className="text-lg uppercase font-semibold tracking-wide border-b border-ink/10 pb-3 flex items-center gap-2">
            <Plus className="size-4" />
            {editingId ? "Update Existing campaign" : "Configure New Ad Unit"}
          </h2>

          <form onSubmit={handleCreateOrUpdate} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Product Autofill Selector */}
              {!editingId && (
                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-gold mb-1.5">
                    ⚡ Auto-Fill From Existing Product
                  </label>
                  <select
                    value={selectedProduct}
                    onChange={(e) => {
                      setSelectedProduct(e.target.value);
                      if (e.target.value) {
                        handleApplyProduct(e.target.value);
                      }
                    }}
                    className="w-full bg-transparent border border-gold/40 text-gold px-3 py-2.5 text-sm outline-none focus:border-gold font-sans"
                  >
                    <option key="default" value="" className="bg-canvas text-ink">
                      -- Select a Product to Autofill --
                    </option>
                    {products.map((p, idx) => (
                      <option
                        key={p.id || `prod-${idx}`}
                        value={p.id || ""}
                        className="bg-canvas text-ink"
                      >
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Ad Title */}
              <div className="sm:col-span-2 shadow-sm">
                <label className="block text-[10px] uppercase font-semibold tracking-widest text-ink-soft mb-1.5">
                  Ad Headline Banner Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. ABUJA SEPTEMBER POP-UP"
                  className="w-full bg-transparent border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink placeholder:text-ink-soft/40"
                />
              </div>

              {/* Ad Subtitle / Body text */}
              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase font-semibold tracking-widest text-ink-soft mb-1.5">
                  Subtitle description or secondary promo message
                </label>
                <textarea
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. Heavyweight streetwear premium drop at Wuse Zone II. Over 200 items in stock."
                  rows={2}
                  className="w-full bg-transparent border border-ink/20 px-3 py-2 text-sm outline-none focus:border-ink placeholder:text-ink-soft/40 resize-none"
                />
              </div>

              {/* Format Select */}
              <div>
                <label className="block text-[10px] uppercase font-semibold tracking-widest text-ink-soft mb-1.5">
                  Ad Layout Format
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as "banner" | "popup" | "card")}
                  className="w-full bg-transparent border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
                >
                  <option key="banner" value="banner">
                    Wide Header Banner Strip
                  </option>
                  <option key="popup" value="popup">
                    Interactive Modal Popup
                  </option>
                  <option key="card" value="card">
                    Native Grid Product Card
                  </option>
                </select>
              </div>

              {/* Badge label / Tag text */}
              <div>
                <label className="block text-[10px] uppercase font-semibold tracking-widest text-ink-soft mb-1.5">
                  Badge indicator Tag
                </label>
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="e.g. SPONSOR, SPECIAL, EVENT"
                  className="w-full bg-transparent border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink placeholder:text-ink-soft/40"
                />
              </div>

              {/* Image selection and path */}
              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase font-semibold tracking-widest text-ink-soft mb-1.5">
                  Visual Banner Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... or paste image URL"
                  className="w-full bg-transparent border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink placeholder:text-ink-soft/40 mb-2"
                />
                <div className="flex flex-wrap gap-2">
                  <span className="text-[9px] uppercase tracking-wider text-ink-soft self-center">
                    Preset assets:
                  </span>
                  {PRESET_IMAGES.map((img) => (
                    <button
                      key={img.url}
                      type="button"
                      onClick={() => setImageUrl(img.url)}
                      className="text-[9px] bg-ink/5 hover:bg-ink/10 border border-ink/10 px-2 py-0.5"
                    >
                      {img.name}
                    </button>
                  ))}
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="text-[9px] bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-200 px-2 py-0.5 ml-auto"
                    >
                      Clear Image
                    </button>
                  )}
                </div>
              </div>

              {/* Destination url */}
              <div>
                <label className="block text-[10px] uppercase font-semibold tracking-widest text-ink-soft mb-1.5">
                  Click Goal target Destination Anchor URL
                </label>
                <select
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full bg-transparent border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
                >
                  <option key="shop" value="/shop">
                    Shop Catalogue (/shop)
                  </option>
                  <option key="tees" value="/shop?category=tees">
                    Tees category filter
                  </option>
                  <option key="hoodies" value="/shop?category=hoodies">
                    Hoodies category filter
                  </option>
                  <option key="wishlist" value="/wishlist">
                    Wishlist page (/wishlist)
                  </option>
                  <option key="admin" value="/admin">
                    Admin internal console
                  </option>
                </select>
              </div>

              {/* Active / Running duration */}
              <div>
                <label className="block text-[10px] uppercase font-semibold tracking-widest text-ink-soft mb-1.5">
                  Campaign Running Time
                </label>
                <select
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="w-full bg-transparent border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
                >
                  {DURATION_PRESETS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Color Presets */}
              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase font-semibold tracking-widest text-ink-soft mb-2.5">
                  Aesthetic Color theme styling preset
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {COLOR_PRESETS.map((p, idx) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setColorPresetIndex(idx)}
                      className={`p-2 border text-left flex flex-col justify-between h-14 transition-all relative ${
                        colorPresetIndex === idx
                          ? "ring-2 ring-gold border-gold scale-[1.01]"
                          : "border-ink/10 opacity-70"
                      }`}
                    >
                      <span className="text-[9px] uppercase font-semibold tracking-wider block leading-tight">
                        {p.name}
                      </span>
                      <div className="flex gap-1.5 mt-auto">
                        <div className={`size-3.5 border border-ink/10 ${p.bg.split(" ")[0]}`} />
                        <div className={`size-3.5 border border-ink/10 ${p.badge.split(" ")[0]}`} />
                        <div className={`size-3.5 border border-ink/10 ${p.text.split(" ")[0]}`} />
                      </div>
                      {colorPresetIndex === idx && (
                        <div className="absolute top-1 right-1 bg-gold text-ink text-[6px] px-1 font-bold">
                          ON
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="sm:col-span-2 flex items-center justify-between border-t border-ink/10 pt-4">
                <div>
                  <label className="text-[10px] uppercase font-semibold tracking-widest text-ink-soft block leading-none mb-1">
                    Campaign Live Status
                  </label>
                  <span className="text-xs text-ink-soft/60">
                    Toggle to dynamically show/hide immediately in product feed.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActive(!active)}
                  className="flex items-center gap-1 focus:outline-none"
                >
                  {active ? (
                    <ToggleRight className="size-9 text-gold cursor-pointer" />
                  ) : (
                    <ToggleLeft className="size-9 text-ink-soft/40 cursor-pointer" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-ink hover:bg-gold hover:text-ink text-canvas py-3 text-xs uppercase tracking-widest font-semibold transition-all"
            >
              {editingId ? "Save updated ad campaign" : "Push Ad campaign alive"}
            </button>
          </form>
        </div>

        {/* Right Side: Interactive Google Ads Live Preview Panel */}
        <div className="space-y-6">
          <div className="border border-ink/10 bg-ink-soft/5 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-ink/10 pb-2">
              <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 text-[#B39359]">
                <Sparkles className="size-3.5" /> Ad Unit Real-time Sandboxed Sandbox
              </span>
              <span className="text-[9px] uppercase bg-ink/10 px-2 py-0.5 text-ink tracking-widest font-mono">
                {format.toUpperCase()}
              </span>
            </div>

            <p className="text-xs text-ink-soft leading-snug">{AD_FORMAT_DESCRIPTIONS[format]}</p>

            {/* LIVE RENDER AREA */}
            <div className="border border-dashed border-ink/20 p-4 bg-canvas/30 rounded flex flex-col items-center justify-center min-h-[220px]">
              {format === "banner" && (
                <div
                  className={`w-full max-w-md p-3 text-center border capitalize font-normal relative select-none ${currentSelectedPreset.bg}`}
                >
                  <div className="absolute top-1 left-2 text-[7px] bg-ink/20 text-canvas px-1 font-semibold select-none leading-none rounded-none py-0.5 uppercase tracking-widest">
                    {badge || "SPONSOR"}
                  </div>
                  <h4 className="text-xs uppercase font-bold tracking-widest mt-1">
                    {title || "CRIMSON DOUBLE DECKER DROP"}
                  </h4>
                  {subtitle && (
                    <p className="text-[10px] opacity-90 mt-0.5 line-clamp-1">{subtitle}</p>
                  )}
                  <p className="text-[8px] opacity-60 underline tracking-wider uppercase mt-1">
                    Click Anchor: {linkUrl}
                  </p>
                </div>
              )}

              {format === "popup" && (
                <div
                  className={`w-full max-w-sm p-5 border text-left shadow-xl relative flex flex-col justify-between ${currentSelectedPreset.bg}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span
                      className={`text-[7px] uppercase font-bold tracking-widest px-1.5 py-0.5 select-none leading-none ${currentSelectedPreset.badge}`}
                    >
                      {badge || "SPONSORS ALERT"}
                    </span>
                    <button
                      type="button"
                      className="text-xs opacity-50 hover:opacity-100 leading-none"
                    >
                      &times;
                    </button>
                  </div>

                  {imageUrl && (
                    <div className="aspect-[4/1.2] w-full mb-3 overflow-hidden bg-black/10">
                      <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <h4 className="text-sm uppercase font-bold tracking-tighter leading-snug">
                    {title || "EXCLUSIVE ABUJA STREET DISCOUNTS"}
                  </h4>
                  {subtitle && (
                    <p className="text-[11px] opacity-95 leading-normal mt-1 block">{subtitle}</p>
                  )}

                  <button
                    type="button"
                    className="mt-4 text-[9px] py-2 bg-ink text-canvas uppercase tracking-widest font-semibold hover:bg-gold hover:text-ink w-full transition-colors flex items-center justify-center gap-1"
                  >
                    Learn More <ChevronRight className="size-3" />
                  </button>
                </div>
              )}

              {format === "card" && (
                <div className="w-[180px] bg-canvas text-ink border border-ink/10 group select-none">
                  {/* Top image or colored bar */}
                  <div
                    className={`aspect-[4/3] w-full bg-black/5 relative flex items-center justify-center ${imageUrl ? "" : currentSelectedPreset.bg}`}
                  >
                    {imageUrl ? (
                      <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <Megaphone className="size-8 opacity-20" />
                    )}
                    <span className="absolute top-2 left-2 text-[7px] font-semibold tracking-widest bg-ink text-canvas px-1 py-0.5">
                      {badge || "SPONSOR"}
                    </span>
                  </div>

                  <div className="p-3 text-left space-y-1">
                    <h5 className="font-display font-semibold uppercase text-xs tracking-tight line-clamp-1 leading-snug">
                      {title || "THE CARGO SET"}
                    </h5>
                    <p className="text-[9px] text-ink-soft uppercase tracking-wider line-clamp-1">
                      {subtitle || "Premium JAF lifestyle design"}
                    </p>
                    <p className="text-[10px] font-mono tracking-widest uppercase text-gold">
                      sponsored
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Ad Algorithm Rules Card */}
          <div className="bg-[#B39359]/5 border border-[#B39359]/20 p-5 space-y-3">
            <h4 className="text-xs font-semibold uppercase text-[#B39359] flex items-center gap-1">
              <AlertTriangle className="size-3.5" /> Ad Delivery Policy Control
            </h4>
            <ul className="text-xs text-ink-soft font-light space-y-1.5 list-disc pl-4 leading-normal">
              <li>Wide top-banners only show if the user is browsing the home screen.</li>
              <li>
                Sponsored cards are injected dynamically every 4 products in the collection grid.
              </li>
              <li>
                Only 1 modal popup triggers per customer session after a 3s decay to preserve
                boutique integrity.
              </li>
              <li>
                Ads are queried/filtered in real-time, matching only{" "}
                <span className="font-semibold text-ink">Active</span> statuses before expiration
                date.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Campaigns Listing Section */}
      <div className="border border-ink/10 bg-canvas mt-8">
        <div className="p-4 border-b border-ink/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
            <Layers className="size-4" /> Running Campaign Roster ({filteredAds.length})
          </h2>

          <div className="flex gap-2">
            {(["all", "banner", "popup", "card"] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setFilterFormat(fmt)}
                className={`text-[9px] uppercase tracking-wider px-2.5 py-1 border transition-colors ${
                  filterFormat === fmt
                    ? "bg-ink text-canvas border-ink"
                    : "border-ink/10 hover:bg-ink/5"
                }`}
              >
                {fmt === "all" ? "All Formats" : fmt}
              </button>
            ))}
          </div>
        </div>

        {filteredAds.length === 0 ? (
          <div className="p-12 text-center text-sm text-ink-soft/60">
            No active or custom matching ads found. Use the unit customizer above to deploy your
            first ad campaigns.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[600px]">
              <thead className="bg-ink/5 uppercase tracking-wider text-[9px] border-b border-ink/10">
                <tr>
                  <th className="p-4">Unit Name / Badge</th>
                  <th className="p-4">Format Style</th>
                  <th className="p-4 text-center">Clicks</th>
                  <th className="p-4">Target Goal</th>
                  <th className="p-4">Time remaining</th>
                  <th className="p-4">Aesthetic style</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10 font-normal">
                {filteredAds.map((ad) => {
                  const daysString = getDaysRemainingString(ad.expiryDate);
                  const isExpired = daysString === "Expired";

                  return (
                    <tr key={ad.id} className="hover:bg-ink/5 transition-colors">
                      <td className="p-4 font-semibold uppercase">
                        <div>
                          <span>{ad.title}</span>
                          {ad.badge && (
                            <span className="text-[7px] uppercase ml-2 bg-ink-soft text-canvas px-1.5 py-0.5 tracking-wider">
                              {ad.badge}
                            </span>
                          )}
                        </div>
                        {ad.subtitle && (
                          <div className="text-[9px] text-ink-soft/60 normal-case font-light mt-0.5 select-none line-clamp-1 max-w-[220px]">
                            {ad.subtitle}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="capitalize font-mono text-[10px] bg-ink/5 px-2 py-0.5">
                          {ad.format}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-mono text-xs font-bold text-gold border border-gold/20 bg-gold/5 px-2.5 py-1">
                          {ad.clicks || 0}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-ink-soft/80 flex items-center gap-1 lowercase">
                          <ExternalLink className="size-3 text-[#B39359]" /> {ad.linkUrl}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 tracking-wider ${isExpired ? "text-red-500 font-semibold" : "text-ink-soft"}`}
                        >
                          <Clock className="size-3" /> {daysString}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`size-3 inline-block rounded-full border border-ink/10 ${ad.bgColor?.split(" ")[0]}`}
                          />
                          <span className="text-[9px] uppercase tracking-wider font-mono opacity-80">
                            theme
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => toggleActiveStatus(ad)}
                          className={`text-[9px] uppercase tracking-widest font-semibold px-2.5 py-1 ${
                            ad.active && !isExpired
                              ? "bg-green-500/10 text-green-700 hover:bg-green-500/20"
                              : "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                          }`}
                        >
                          {isExpired ? "EXPIRED" : ad.active ? "ACTIVE" : "HIDDEN"}
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => handleEdit(ad)}
                            className="bg-ink/5 hover:bg-gold hover:text-ink text-ink border border-ink/10 text-[10px] uppercase font-semibold px-2 py-1 tracking-wider"
                          >
                            Tweak
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  "Permanently strip this ad unit? This will clean it from server snapshots.",
                                )
                              ) {
                                remove(ad.id);
                                toast.success("Ad unit removed.");
                              }
                            }}
                            className="text-red-500 hover:text-white hover:bg-red-500 border border-red-500/20 p-1"
                            title="Strip Campaign Unit"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
