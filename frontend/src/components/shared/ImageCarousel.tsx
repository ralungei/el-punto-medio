import { useState, useEffect, useRef, useCallback } from "react";
import type { CarouselImage } from "../../types";

interface ImageCarouselProps {
  images?: CarouselImage[];
  alt?: string;
  className?: string;
  imageClassName?: string;
  style?: React.CSSProperties;
  fallbackElement?: React.ReactNode;
  interval?: number;
  compact?: boolean;
}

export function ImageCarousel({
  images = [],
  alt = "",
  className,
  imageClassName,
  style,
  fallbackElement,
  interval = 5000,
  compact = false,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisibleRef = useRef(true);

  // Filter out failed images
  const viable = images.filter((img) => !failedUrls.has(img.url));

  // Auto-rotation with IntersectionObserver
  useEffect(() => {
    if (viable.length < 2) return;

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );
    observer.observe(el);

    const timer = setInterval(() => {
      if (isVisibleRef.current) {
        setCurrentIndex((prev) => (prev + 1) % viable.length);
      }
    }, interval);

    return () => {
      observer.disconnect();
      clearInterval(timer);
    };
  }, [viable.length, interval]);

  // Reset index if it's out of bounds
  useEffect(() => {
    if (currentIndex >= viable.length && viable.length > 0) {
      setCurrentIndex(0);
    }
  }, [currentIndex, viable.length]);

  const handleError = useCallback(
    (url: string) => {
      setFailedUrls((prev) => new Set(prev).add(url));
    },
    []
  );

  if (viable.length === 0) {
    return <>{fallbackElement || null}</>;
  }

  const current = viable[currentIndex % viable.length];
  const chipText = compact
    ? `Img: ${current.source}`
    : `Imagen de ${current.source}`;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", overflow: "hidden", ...style }}
    >
      {/* Stacked images with crossfade */}
      {viable.map((img, i) => (
        <img
          key={img.url}
          src={img.url}
          alt={i === (currentIndex % viable.length) ? alt : ""}
          className={imageClassName}
          style={{
            position: viable.length > 1 ? "absolute" : undefined,
            inset: viable.length > 1 ? 0 : undefined,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: i === (currentIndex % viable.length) ? 1 : 0,
            transition: "opacity 700ms ease",
          }}
          onError={() => handleError(img.url)}
        />
      ))}

      {/* Source attribution chip */}
      <span
        style={{
          position: "absolute",
          bottom: compact ? 4 : 8,
          left: compact ? 4 : 8,
          fontSize: compact ? 9 : 11,
          fontWeight: 600,
          color: "white",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          padding: compact ? "2px 5px" : "3px 8px",
          borderRadius: 4,
          lineHeight: 1.3,
          transition: "opacity 400ms ease",
          pointerEvents: "none",
        }}
      >
        {chipText}
      </span>
    </div>
  );
}
