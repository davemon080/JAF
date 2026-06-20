import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { useCatalog } from "@/lib/store";
import { ProductCard } from "@/components/product-card";
import { CATEGORY_LABELS, type Category } from "@/data/products";
import { Search } from "lucide-react";

const shopSearchSchema = z.object({
  category: z.enum(["tees", "hoodies", "caps", "sets"]).optional(),
  q: z.string().optional(),
  size: z.string().optional(),
  sort: z.enum(["new", "price-asc", "price-desc"]).optional(),
});

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop — JAF" },
      {
        name: "description",
        content:
          "Browse the full JAF drop: heavyweight tees, hoodies and caps. Filter by category, size and price.",
      },
      { property: "og:title", content: "Shop — JAF" },
      { property: "og:description", content: "Browse the full JAF drop. Tees, hoodies, caps." },
      { property: "og:url", content: "https://justafriend.com.ng/shop" },
    ],
    links: [{ rel: "canonical", href: "https://justafriend.com.ng/shop" }],
  }),
  validateSearch: shopSearchSchema,
  component: ShopPage,
});

const ALL_SIZES = ["S", "M", "L", "XL", "XXL", "One Size"];

function ShopPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const products = useCatalog((s) => s.products);
  const [q, setQ] = useState(search.q ?? "");

  const filtered = useMemo(() => {
    let list = products;
    if (search.category) list = list.filter((p) => p.category === search.category);
    if (search.size) list = list.filter((p) => p.sizes.includes(search.size!));
    if (search.q) {
      const t = search.q.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(t) || p.subtitle.toLowerCase().includes(t),
      );
    }
    if (search.sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    else if (search.sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [products, search]);

  type ShopSearch = z.infer<typeof shopSearchSchema>;
  const setSearch = (patch: Partial<ShopSearch>) =>
    navigate({ search: (prev: ShopSearch) => ({ ...prev, ...patch }) });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-16">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <p className="text-[10px] font-medium tracking-[0.25em] uppercase text-ink-soft mb-3">
            All / {search.category ? CATEGORY_LABELS[search.category as Category] : "EVERYTHING"}
          </p>
          <h1 className="font-display font-semibold tracking-tighter text-5xl md:text-7xl">
            THE ARCHIVE.
          </h1>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch({ q: q || undefined });
          }}
          className="flex items-center gap-2 border-b border-ink py-2 md:w-80"
        >
          <Search className="size-4" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search the drop"
            className="bg-transparent outline-none text-sm flex-1 placeholder:text-ink-soft/60"
          />
        </form>
      </header>

      <div className="grid lg:grid-cols-[200px_1fr] gap-10">
        <aside className="space-y-8 text-sm">
          <div>
            <p className="text-[10px] font-medium tracking-widest uppercase text-ink-soft mb-3">
              Category
            </p>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => setSearch({ category: undefined })}
                  className={`text-left ${!search.category ? "font-semibold" : "text-ink-soft"}`}
                >
                  All
                </button>
              </li>
              {(["tees", "hoodies", "caps"] as Category[]).map((c) => (
                <li key={c}>
                  <button
                    onClick={() => setSearch({ category: c })}
                    className={`text-left uppercase tracking-wider ${search.category === c ? "font-semibold" : "text-ink-soft"}`}
                  >
                    {CATEGORY_LABELS[c]}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-widest uppercase text-ink-soft mb-3">
              Size
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSearch({ size: undefined })}
                className={`text-[10px] px-2 py-1 border ${!search.size ? "bg-ink text-canvas border-ink" : "border-ink/20"}`}
              >
                ALL
              </button>
              {ALL_SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSearch({ size: s })}
                  className={`text-[10px] px-2 py-1 border ${search.size === s ? "bg-ink text-canvas border-ink" : "border-ink/20"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-widest uppercase text-ink-soft mb-3">
              Sort
            </p>
            <select
              value={search.sort ?? "new"}
              onChange={(e) => setSearch({ sort: e.target.value as never })}
              className="text-sm bg-transparent border border-ink/20 px-2 py-1.5 w-full"
            >
              <option value="new">Newest</option>
              <option value="price-asc">Price: low → high</option>
              <option value="price-desc">Price: high → low</option>
            </select>
          </div>
          <Link
            to="/wishlist"
            className="text-xs tracking-widest uppercase underline underline-offset-4"
          >
            View wishlist
          </Link>
        </aside>

        <div>
          {filtered.length === 0 ? (
            <div className="border border-dashed border-ink/20 py-24 text-center text-sm text-ink-soft">
              Nothing matches. Adjust the filters.
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
