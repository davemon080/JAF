import { Link } from "@tanstack/react-router";
import { type Product, getProductSmartTag } from "@/data/products";
import { formatNaira } from "@/lib/format";
import { SafeImage } from "@/components/safe-image";
import { useOrders } from "@/lib/store";

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
  const orders = useOrders((s) => s.orders);
  const tag = getProductSmartTag(product, orders);

  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className={`${surface} group cursor-pointer block`}
    >
      <div className="aspect-[4/5] relative overflow-hidden bg-zinc-200">
        <SafeImage
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
          width={1024}
          height={1280}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-opacity duration-500 group-hover:opacity-0"
        />
        {product.images[1] && (
          <SafeImage
            src={product.images[1]}
            alt={product.name + " alternate"}
            loading="lazy"
            width={1024}
            height={1280}
            referrerPolicy="no-referrer"
            containerClassName="absolute inset-0"
            className="w-full h-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        )}
        {tag && (
          <span
            className={`absolute top-3 left-3 text-[9px] font-medium tracking-widest uppercase px-2 py-1 ${
              tag === "sold-out"
                ? "bg-ink-soft text-canvas"
                : tag === "just-in" || tag === "limited"
                  ? "bg-gold text-ink"
                  : "bg-canvas text-ink"
            }`}
          >
            {TAG_LABEL[tag]}
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
