import { Link } from "@tanstack/react-router";
import { JafMark } from "@/components/jaf-logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink/5 py-12 px-6 mt-24">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12">
        <div className="flex flex-col gap-6 max-w-sm">
          <div className="flex items-center gap-3">
            <JafMark size={44} />
            <h5 className="font-display font-semibold text-2xl tracking-tighter">
              JAF<span className="text-gold">.</span>
            </h5>
          </div>
          <p className="text-sm text-ink-soft leading-relaxed">
            Just A Friend. The uniform of the unrequited. Designed in Nigeria, built for the streets
            of Abuja & Lafia.
          </p>
          <div className="space-y-1 text-sm text-ink-soft">
            <p>LAFIA HQ: KM 5 JOS RD</p>
            <p>ABUJA HUB: WUSE II</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-12 gap-y-6">
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-medium tracking-widest uppercase text-ink-soft/60">
              Shop
            </p>
            <Link to="/shop" className="text-sm font-medium">
              ALL
            </Link>
            <Link to="/shop" search={{ category: "tees" }} className="text-sm font-medium">
              TEES
            </Link>
            <Link to="/shop" search={{ category: "hoodies" }} className="text-sm font-medium">
              HOODIES
            </Link>
            <Link to="/shop" search={{ category: "caps" }} className="text-sm font-medium">
              CAPS
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-medium tracking-widest uppercase text-ink-soft/60">
              Support
            </p>
            <Link to="/track" className="text-sm font-medium">
              TRACK ORDER
            </Link>
            <Link to="/contact" className="text-sm font-medium">
              CONTACT
            </Link>
            <Link to="/faq" className="text-sm font-medium">
              FAQ
            </Link>
            <Link to="/about" className="text-sm font-medium">
              ABOUT
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-medium tracking-widest uppercase text-ink-soft/60">
              Connect
            </p>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:text-gold transition-colors"
            >
              INSTAGRAM
            </a>
            <a
              href="https://www.tiktok.com/@jaf0012"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:text-gold transition-colors"
            >
              TIKTOK @JAF0012
            </a>
            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:text-gold transition-colors"
            >
              TWITTER/X
            </a>
            <a
              href="https://wa.me/2348000000000"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:text-gold transition-colors"
            >
              WHATSAPP
            </a>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-ink/5 flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
        <p className="text-[10px] font-medium tracking-widest uppercase text-ink-soft/60">
          © 2026 JUST A FRIEND CLOTHING
        </p>
        <p className="text-[10px] font-medium tracking-widest uppercase text-ink-soft/60">
          MADE IN NIGERIA · NO FEELINGS INVOLVED
        </p>
      </div>
    </footer>
  );
}
