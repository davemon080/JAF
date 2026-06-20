import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageOff } from "lucide-react";

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
}

export function SafeImage({ src, alt, className, containerClassName, ...props }: SafeImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Instantly resolve loading state if image is already cached/loaded
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setIsLoaded(true);
    } else {
      setIsLoaded(false);
      setHasError(false);
    }
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
  };

  // Minimalist, silent, wordless fallback container for complete failure
  const renderFallback = () => (
    <div
      className={cn(
        "w-full h-full min-h-[inherit] bg-zinc-100 dark:bg-zinc-900 flex flex-col items-center justify-center text-center p-4 text-zinc-300 dark:text-zinc-700 select-none border border-zinc-200/50 dark:border-zinc-800/50",
        containerClassName,
      )}
    >
      <ImageOff className="size-5 stroke-[1.25] text-zinc-300/80 dark:text-zinc-700/80" />
    </div>
  );

  return (
    <div className={cn("relative w-full h-full overflow-hidden", containerClassName)}>
      {/* SKELETON LOADER */}
      {!isLoaded && !hasError && (
        <Skeleton className="absolute inset-0 w-full h-full bg-zinc-200 dark:bg-zinc-800 animate-pulse z-10 rounded-none" />
      )}

      {/* FALLBACK IF ERROR OR NO SRC */}
      {hasError || !src ? (
        renderFallback()
      ) : (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300 ease-in-out",
            isLoaded ? "opacity-100" : "opacity-0",
            className,
          )}
          {...props}
        />
      )}
    </div>
  );
}
