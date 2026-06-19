import logoAsset from "@/assets/jaf-logo.asset.json";
import { useCatalog } from "@/lib/store";

interface Props {
  size?: number;
  className?: string;
  variant?: "dark" | "light";
}

/**
 * The JAF trademark mark. Uses the uploaded logo asset.
 * `variant="light"` inverts the colors for use on light backgrounds (the mark
 * itself is white on black; we wrap it for adaptive surfaces).
 */
export function JafMark({ size = 28, className = "", variant = "dark" }: Props) {
  const { branding } = useCatalog();
  const bg = variant === "dark" ? "bg-ink" : "bg-canvas";
  const ring = variant === "dark" ? "ring-gold/50" : "ring-ink/10";
  const logoUrl = branding?.logoUrl || logoAsset.url;
  const isCircle = true;

  return (
    <span
      className={`inline-flex items-center justify-center ring-1 ${ring} ${bg} ${className} ${isCircle ? "rounded-full" : "rounded-none"}`}
      style={{ width: size, height: size }}
    >
      <img
        src={logoUrl}
        alt="JAF — Just A Friend"
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className={`object-cover w-full h-full ${isCircle ? "rounded-full" : "rounded-none"}`}
      />
    </span>
  );
}

export const JAF_LOGO_URL = logoAsset.url;
