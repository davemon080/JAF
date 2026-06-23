import { useState, useEffect } from "react";
import { useAds, type Ad } from "@/lib/store";
import { Link } from "@tanstack/react-router";
import { Megaphone, X, ArrowRight, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { recordAdClickInFirestore } from "@/lib/firebase";

/**
 * Filter valid campaigns (Active, and Unexpired)
 */
function getActiveAds(ads: Ad[]): Ad[] {
  const now = Date.now();
  return (ads || []).filter((ad) => ad.active && new Date(ad.expiryDate).getTime() > now);
}

interface AdLinkProps {
  url?: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export function AdLink({ url, className, children, onClick }: AdLinkProps) {
  if (!url) {
    return (
      <div className={className} onClick={onClick}>
        {children}
      </div>
    );
  }

  const isExternal =
    /^(https?:)?\/\//i.test(url) || url.startsWith("mailto:") || url.startsWith("tel:");

  if (isExternal) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onClick}
      >
        {children}
      </a>
    );
  }

  return (
    <Link to={url as string} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

/**
 * 1. Wide Header Banner Announcement Strip
 */
export function AdTopBanner() {
  const ads = useAds((s) => s.ads);
  const activeBanners = getActiveAds(ads).filter((ad) => ad.format === "banner");

  const [dismissed, setDismissed] = useState(false);

  // If there are no active banners or dismissed, hide
  if (activeBanners.length === 0 || dismissed) return null;

  // Algorithm: Pick the newest active banner
  const latestBanner = activeBanners[0];

  return (
    <div
      id={`ad-banner-${latestBanner.id}`}
      className={`relative w-full py-2.5 px-12 text-center text-xs tracking-wider transition-all duration-300 select-none z-50 cursor-pointer hover:opacity-95 ${
        latestBanner.bgColor || "bg-gold text-ink"
      }`}
    >
      <AdLink
        url={latestBanner.linkUrl}
        onClick={() => {
          recordAdClickInFirestore(latestBanner.id);
        }}
        className="block max-w-7xl mx-auto flex items-center justify-center gap-3 flex-wrap text-current hover:no-underline"
      >
        {latestBanner.badge && (
          <span className="text-[8px] bg-ink text-canvas font-extrabold uppercase px-1.5 py-0.5 tracking-widest leading-none rounded-none">
            {latestBanner.badge}
          </span>
        )}
        <span className="font-medium uppercase">
          {latestBanner.title}
          {latestBanner.subtitle && (
            <span className="opacity-90 normal-case font-light ml-2">
              — {latestBanner.subtitle}
            </span>
          )}
        </span>

        {latestBanner.linkUrl && (
          <span className="inline-flex items-center gap-1 font-bold uppercase text-[9px] hover:underline">
            Details <ArrowRight className="size-3" />
          </span>
        )}
      </AdLink>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setDismissed(true);
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80 p-1 z-10"
        aria-label="Dismiss banner"
      >
        <X className="size-3.5 stroke-[2.5]" />
      </button>
    </div>
  );
}

/**
 * 2. Timed Dialog Popup Modal
 */
export function AdPopup() {
  const ads = useAds((s) => s.ads);
  const activePopups = getActiveAds(ads).filter((ad) => ad.format === "popup");

  const [visible, setVisible] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (activePopups.length === 0 || closed) return;

    // Check if shown in this session to avoid spamming the customer
    const sessionToken = sessionStorage.getItem("jaf_popup_ad_delivered");
    if (sessionToken) return;

    // Delay popups by 3 seconds for a clean introductory view decay
    const timer = setTimeout(() => {
      setVisible(true);
      sessionStorage.setItem("jaf_popup_ad_delivered", "true");
    }, 3000);

    return () => clearTimeout(timer);
  }, [activePopups.length, closed]);

  if (activePopups.length === 0 || !visible) return null;

  // Algorithm: Pick the newest active popup
  const currentPopup = activePopups[0];

  const handleClose = () => {
    setVisible(false);
    setClosed(true);
  };

  return (
    <AnimatePresence>
      <div className="fixed bottom-6 right-6 z-[9999] max-w-[340px] w-full px-4 sm:px-0">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className={`border shadow-2xl p-5 select-none relative group ${
            currentPopup.bgColor || "bg-ink text-canvas border-canvas/20"
          }`}
        >
          {/* Header row */}
          <div className="flex justify-between items-start gap-4 mb-3">
            <span className="text-[8px] font-mono tracking-[0.25em] uppercase border border-current px-1.5 py-0.5 leading-none">
              {currentPopup.badge || "PROMO ALERT"}
            </span>
            <button
              onClick={handleClose}
              className="text-xs opacity-50 hover:opacity-100 p-0.5 transition-opacity"
              aria-label="Close dialog"
            >
              <X className="size-4" />
            </button>
          </div>

          <AdLink
            url={currentPopup.linkUrl}
            onClick={() => {
              recordAdClickInFirestore(currentPopup.id);
              handleClose();
            }}
            className="block text-current hover:no-underline cursor-pointer"
          >
            {/* Optional banner image */}
            {currentPopup.imageUrl && (
              <div className="aspect-[16/7] w-full mb-3 overflow-hidden bg-black/10">
                <img
                  src={currentPopup.imageUrl}
                  alt={currentPopup.title}
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                />
              </div>
            )}

            {/* Ad copy text */}
            <div className="space-y-1">
              <h4 className="font-display font-semibold uppercase text-sm tracking-tight leading-snug group-hover:text-gold transition-colors">
                {currentPopup.title}
              </h4>
              {currentPopup.subtitle && (
                <p className="text-xs opacity-80 leading-normal font-light">
                  {currentPopup.subtitle}
                </p>
              )}
            </div>

            {/* Call to action button */}
            {currentPopup.linkUrl && (
              <span className="mt-4 w-full bg-canvas text-ink text-[10px] py-2.5 font-bold uppercase tracking-widest hover:bg-gold hover:text-ink transition-colors flex items-center justify-center gap-1.5">
                Check out <ArrowRight className="size-3.5" />
              </span>
            )}
          </AdLink>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/**
 * 3. In-Feed Product Grid Ad Card
 */
interface AdCardInfeedProps {
  ad: Ad;
}

export function AdCardInfeed({ ad }: AdCardInfeedProps) {
  return (
    <AdLink
      url={ad.linkUrl}
      onClick={() => {
        recordAdClickInFirestore(ad.id);
      }}
      className={`border flex flex-col justify-between h-[360px] relative transition-transform hover:scale-[1.005] duration-300 group overflow-hidden cursor-pointer text-current hover:no-underline ${
        ad.bgColor || "bg-ink text-canvas border-canvas/10"
      }`}
    >
      {/* Top Graphic Header */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/5 shrink-0">
        {ad.imageUrl ? (
          <img
            src={ad.imageUrl}
            alt={ad.title}
            className="w-full h-full object-cover opacity-90 grayscale group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-700 hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-black/20">
            <Megaphone className="size-10 opacity-20 text-[#B39359]" />
          </div>
        )}
        <span className="absolute top-3 left-3 text-[8px] font-semibold tracking-widest bg-ink text-canvas px-2.5 py-1 uppercase">
          {ad.badge || "SPONSORED"}
        </span>
      </div>

      {/* Details layout */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          <h4 className="font-display font-semibold uppercase text-sm sm:text-base tracking-tight line-clamp-1 group-hover:text-gold transition-colors">
            {ad.title}
          </h4>
          {ad.subtitle && (
            <p className="text-[11px] opacity-75 line-clamp-2 leading-relaxed font-light">
              {ad.subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-current/10">
          <span className="text-[9px] font-mono tracking-widest uppercase font-bold text-gold opacity-90 animate-pulse">
            sponsored card
          </span>
          {ad.linkUrl && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase underline underline-offset-4 group-hover:opacity-80">
              Explore <ExternalLink className="size-3" />
            </span>
          )}
        </div>
      </div>
    </AdLink>
  );
}

export interface InfeedUnit<T> {
  isAdCardUnit: boolean;
  adData: Ad;
  id: string;
  // Make it compatible with standard items by having optional properties
  name?: string;
  price?: number;
  slug?: string;
  category?: string;
  sizes?: string[];
  colors?: string[];
  inStock?: boolean;
  images?: string[];
  // Include type parameter compatibilities
  originalItem?: T;
}

/**
 * Smart Injection Algorithm for product listings.
 * Inserts dynamic card ads elegantly at balanced distances (e.g., every 3 items)
 */
export function injectFeedAds<T extends { id: string }>(
  items: T[],
  adsList: Ad[],
  spacing: number = 3,
): (T | InfeedUnit<T>)[] {
  const activeCards = getActiveAds(adsList).filter((ad) => ad.format === "card");
  if (activeCards.length === 0 || items.length === 0) return items;

  const result: (T | InfeedUnit<T>)[] = [];
  let adIndex = 0;

  items.forEach((item, index) => {
    result.push(item);

    // Inject an ad card every 'spacing' elements, if we still have cards
    if ((index + 1) % spacing === 0 && adIndex < activeCards.length) {
      const activeAd = activeCards[adIndex];
      result.push({
        isAdCardUnit: true,
        adData: activeAd,
        id: `ad_feed_${activeAd.id}_${index}`,
      });
      adIndex = (adIndex + 1) % activeCards.length; // Loop around if we run out of fresh cards to maintain seamless scrolling
    }
  });

  return result;
}
