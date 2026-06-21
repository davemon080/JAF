import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { type Product, getProductSmartTag } from "@/data/products";
import { useOrders } from "@/lib/store";
import { formatNaira } from "@/lib/format";
import { SafeImage } from "@/components/safe-image";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

interface FeaturedSliderProps {
  products: Product[];
}

const TAG_LABEL: Record<string, string> = {
  "new-drop": "NEW DROP",
  "just-in": "JUST IN",
  limited: "LIMITED",
  "best-seller": "BEST SELLER",
  "sold-out": "SOLD OUT",
};

export function FeaturedSlider({ products }: FeaturedSliderProps) {
  const orders = useOrders((s) => s.orders);

  // Filter top products for the slider (e.g., exclude sold out unless all are sold out, prioritize best sellers, new drops, limited, etc.)
  const sliderProducts = products
    .filter((p) => {
      const tag = getProductSmartTag(p, orders);
      return tag !== "sold-out" || products.length <= 4;
    })
    .slice(0, 5);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for previous, 1 for next
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered || sliderProducts.length <= 1) return;

    const interval = setInterval(() => {
      handleNext();
    }, 6000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, isHovered, sliderProducts.length]);

  if (sliderProducts.length === 0) return null;

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % sliderProducts.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + sliderProducts.length) % sliderProducts.length);
  };

  const handleDotClick = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  const currentProduct = sliderProducts[currentIndex];
  const tag = getProductSmartTag(currentProduct, orders);

  // Animation variants for sliding effect
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? "100%" : "-100%",
      opacity: 0,
    }),
  };

  return (
    <div
      id="featured-hero-slider"
      className="relative bg-ink text-canvas border-b border-canvas/10 overflow-hidden min-h-[500px] md:min-h-[600px] flex items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="max-w-7xl mx-auto w-full px-4 md:px-6 py-12 md:py-16 relative z-10">
        <div className="relative h-[480px] md:h-[420px] overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="absolute inset-0 grid md:grid-cols-2 gap-8 items-center"
            >
              {/* Product Info Column */}
              <div className="flex flex-col justify-center h-full order-2 md:order-1 text-left">
                <div className="flex items-center gap-3 mb-4">
                  {tag && (
                    <span
                      className={`text-[10px] font-semibold tracking-[0.25em] uppercase px-3 py-1 ${
                        tag === "sold-out"
                          ? "bg-zinc-800 text-canvas/60"
                          : tag === "just-in" || tag === "limited"
                            ? "bg-gold text-ink"
                            : "bg-canvas text-ink"
                      }`}
                    >
                      {TAG_LABEL[tag] || tag.toUpperCase()}
                    </span>
                  )}
                  <span className="text-[10px] tracking-widest text-canvas/40 uppercase">
                    FEATURED EXCLUSIVE
                  </span>
                </div>

                <h2 className="font-display font-semibold tracking-tighter text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-balance leading-none uppercase mb-3">
                  {currentProduct.name}
                </h2>

                <p className="text-xs tracking-widest text-gold uppercase mb-4 font-medium">
                  {currentProduct.subtitle}
                </p>

                <p className="text-sm text-canvas/80 leading-relaxed max-w-md mb-6 line-clamp-3">
                  {currentProduct.description}
                </p>

                <div className="flex items-baseline gap-4 mb-8">
                  <span className="text-2xl font-semibold tracking-tight">
                    {formatNaira(currentProduct.price)}
                  </span>
                  {currentProduct.stock <= 3 && currentProduct.stock > 0 && (
                    <span className="text-[10px] text-gold uppercase tracking-wider animate-pulse">
                      Only {currentProduct.stock} left in stock!
                    </span>
                  )}
                </div>

                <div>
                  <Link
                    to="/product/$slug"
                    params={{ slug: currentProduct.slug }}
                    className="bg-canvas text-ink text-xs font-semibold tracking-widest uppercase py-4 px-6 inline-flex items-center gap-2 hover:bg-canvas/90 transition-all group"
                  >
                    View product{" "}
                    <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>

              {/* Product Image Column */}
              <div className="relative aspect-[4/3] md:aspect-square w-full max-h-[350px] md:max-h-[420px] overflow-hidden order-1 md:order-2 group-hover:scale-[1.01] transition-transform duration-700">
                <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent z-10" />
                <SafeImage
                  src={currentProduct.images[0]}
                  alt={currentProduct.name}
                  width={800}
                  height={800}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover grayscale transition-all duration-700 hover:grayscale-0 hover:scale-105"
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation Arrows */}
      {sliderProducts.length > 1 && (
        <>
          <button
            id="slide-prev-btn"
            onClick={handlePrev}
            className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 z-20 size-10 md:size-12 grid place-items-center bg-canvas/5 border border-canvas/10 hover:bg-canvas hover:text-ink hover:border-canvas transition-all"
            aria-label="Previous featured product"
          >
            <ChevronLeft className="size-5 md:size-6" />
          </button>
          <button
            id="slide-next-btn"
            onClick={handleNext}
            className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-20 size-10 md:size-12 grid place-items-center bg-canvas/5 border border-canvas/10 hover:bg-canvas hover:text-ink hover:border-canvas transition-all"
            aria-label="Next featured product"
          >
            <ChevronRight className="size-5 md:size-6" />
          </button>
        </>
      )}

      {/* Slide Indicators / Dots */}
      {sliderProducts.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2.5">
          {sliderProducts.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`h-1 cursor-pointer transition-all duration-300 ${
                index === currentIndex ? "w-8 bg-gold" : "w-2 bg-canvas/30 hover:bg-canvas/60"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
