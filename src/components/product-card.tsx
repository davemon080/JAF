import { Link } from "@tanstack/react-router";
import { type Product } from "@/data/products";
import { formatNaira } from "@/lib/format";

const TAG_LABEL: Record<NonNullable<Product["tag"]>, string> = {
  "new-drop": "NEW DROP",
  "just-in": "JUST IN",
  limited: "LIMITED",
  "best-seller": "BEST SELLER",
  "sold-out": "SOLD OUT",
};

export function ProductCard({ product, dark = false }: { product: Product; dark?: boolean }) {
  const surface = dark ? "bg-ink text-canvas" : "bg-canvas text-ink";
  const muted = dark ? "text-canvas/60" : "text-ink-soft";
  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className={`${surface} group cursor-pointer block`}
    >
      <div className="aspect-[4/5] relative overflow-hidden bg-zinc-200">
        <img
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
          width={1024}
          height={1280}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-opacity duration-500 group-hover:opacity-0"
        />
        {product.images[1] && (
          <img
            src={product.images[1]}
            alt=""
            loading="lazy"
            width={1024}
            height={1280}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        )}
        {product.tag && (
          <span
            className={`absolute top-3 left-3 text-[9px] font-medium tracking-widest uppercase px-2 py-1 ${
              product.tag === "sold-out"
                ? "bg-ink-soft text-canvas"
                : product.tag === "just-in" || product.tag === "limited"
                  ? "bg-gold text-ink"
                  : "bg-canvas text-ink"
            }`}
          >
            {TAG_LABEL[product.tag]}
          </span>
        )}
      </div>
      <div className="p-3 md:p-4 flex flex-col gap-1">
        <h3 className="text-xs font-semibold tracking-widest uppercase">{product.name}</h3>
        <div className="flex justify-between items-center">
          <p className={`text-[10px] ${muted} truncate pr-2`}>{product.subtitle}</p>
          <p className="text-xs font-medium shrink-0">{formatNaira(product.price)}</p>
        </div>
      </div>
    </Link>
  );
}
