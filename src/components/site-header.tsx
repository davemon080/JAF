import { Link, useRouterState } from "@tanstack/react-router";
import { useCart, useWishlist } from "@/lib/store";
import { Heart, Menu, ShoppingBag, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { JafMark } from "@/components/jaf-logo";
import { auth } from "@/lib/firebase";

const NAV = [
  { to: "/shop", label: "SHOP" },
  { to: "/about", label: "ABOUT" },
  { to: "/track", label: "TRACK" },
  { to: "/contact", label: "CONTACT" },
] as const;

export function SiteHeader() {
  const cartCount = useCart((s) => s.lines.reduce((a, l) => a + l.qty, 0));
  const wishCount = useWishlist((s) => s.ids.length);
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setSignedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  return (
    <nav className="sticky top-0 z-50 w-full bg-canvas/85 backdrop-blur-md border-b border-ink/5">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <JafMark size={36} />
            <span className="hidden sm:inline font-display font-semibold tracking-tighter text-xl group-hover:text-gold transition-colors">
              JAF<span className="text-gold">.</span>
            </span>
          </Link>
          <div className="hidden md:flex gap-6">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`text-xs font-medium tracking-widest transition-colors hover:text-gold ${pathname.startsWith(n.to) ? "text-ink" : "text-ink-soft"}`}
              >
                {n.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden lg:block text-[10px] tracking-widest text-ink-soft font-medium uppercase">
            ABUJA / LAFIA SHIPPING
          </span>
          <div className="hidden lg:block h-4 w-px bg-ink/10" />
          <Link
            to={signedIn ? "/account" : "/auth"}
            aria-label="Account"
            className="text-sm font-medium hover:text-gold transition-colors"
            title={signedIn ? "Account" : "Sign in"}
          >
            <User className="size-4" />
          </Link>
          <Link
            to="/wishlist"
            aria-label="Wishlist"
            className="relative text-sm font-medium hover:text-gold transition-colors"
          >
            <Heart className="size-4" />
            {wishCount > 0 && (
              <span className="absolute -top-2 -right-2 text-[9px] bg-gold text-ink rounded-full size-4 grid place-items-center font-semibold">
                {wishCount}
              </span>
            )}
          </Link>
          <Link
            to="/cart"
            className="text-xs font-medium tracking-widest flex items-center gap-1.5 hover:text-gold transition-colors"
          >
            <ShoppingBag className="size-4" />
            <span className="hidden sm:inline">CART ({cartCount})</span>
            {cartCount > 0 && (
              <span className="sm:hidden bg-gold text-ink rounded-full size-4 grid place-items-center text-[9px] font-semibold">
                {cartCount}
              </span>
            )}
          </Link>
          <button className="md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-ink/5 bg-canvas">
          <div className="px-4 py-4 flex flex-col gap-3">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="text-sm font-medium tracking-widest"
              >
                {n.label}
              </Link>
            ))}
            <Link
              to="/faq"
              onClick={() => setOpen(false)}
              className="text-sm font-medium tracking-widest"
            >
              FAQ
            </Link>
            <Link
              to="/auth"
              onClick={() => setOpen(false)}
              className="text-sm font-medium tracking-widest text-gold"
            >
              {signedIn ? "ACCOUNT" : "SIGN IN"}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
