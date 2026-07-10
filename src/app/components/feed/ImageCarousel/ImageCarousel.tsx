"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./ImageCarousel.module.css";

type Props = {
  images: string[];
  /** Initial slide index. Syncs reactively if the parent changes it
   *  without remounting (e.g., modal opening at a different image). */
  initialIndex?: number;
  /** When provided, clicking the currently-visible slide invokes this
   *  callback with the slide index. Used by the feed to open the image
   *  modal; omitted in contexts (like inside the modal itself) where
   *  slides should not be clickable. */
  onImageClick?: (index: number) => void;
  /** Bottom-edge indicator style.
   *    `dots`    → small pill indicators (feed variant)
   *    `counter` → "1 / 4" pill (modal variant) */
  indicator?: "dots" | "counter";
  /** Extra className merged onto the outer carousel element so consumers
   *  (modal) can drop the default 16 / 10 aspect-ratio and fill their
   *  parent instead. */
  className?: string;
  /** How the image is fitted inside each slide.
   *    `cover`   → fills the slide, cropping as needed (default — feed)
   *    `contain` → shows the full image with letterboxing (modal — so
   *                landscape images in a portrait pane aren't cut off). */
  imageFit?: "cover" | "contain";
};

function ChevronLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function ImageCarousel({
  images,
  initialIndex = 0,
  onImageClick,
  indicator = "dots",
  className,
  imageFit = "cover",
}: Props) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  const atStart = index === 0;
  const atEnd = index === images.length - 1;

  const handlePrev = useCallback(() => {
    setIndex((i) => (i === 0 ? 0 : i - 1));
  }, []);
  const handleNext = useCallback(() => {
    setIndex((i) => (i === images.length - 1 ? i : i + 1));
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <div
      className={`${styles.carousel}${imageFit === "contain" ? ` ${styles.carouselContain}` : ""}${className ? ` ${className}` : ""}`}
      role="region"
      aria-roledescription="carousel"
      aria-label="Images"
    >
      <div
        className={styles.track}
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {images.map((url, i) => {
          const isActive = i === index;
          const clickable = Boolean(onImageClick) && isActive;
          return (
            <div
              key={i}
              className={`${styles.slide}${clickable ? ` ${styles.slideClickable}` : ""}`}
              role={clickable ? "button" : "img"}
              aria-label={`Image ${i + 1} of ${images.length}`}
              aria-hidden={!isActive}
              tabIndex={clickable ? 0 : -1}
              onClick={clickable ? () => onImageClick?.(i) : undefined}
              onKeyDown={(e) => {
                if (clickable && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onImageClick?.(i);
                }
              }}
              style={{ backgroundImage: `url(${url})` }}
            />
          );
        })}
      </div>

      {/* Prev / Next arrows — only render when there is more than one
          image, since there's nowhere to navigate to otherwise. */}
      {images.length > 1 ? (
        <>
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowPrev}`}
            onClick={handlePrev}
            disabled={atStart}
            aria-label="Previous image"
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowNext}`}
            onClick={handleNext}
            disabled={atEnd}
            aria-label="Next image"
          >
            <ChevronRightIcon />
          </button>
        </>
      ) : null}

      {/* Counter renders for ALL cases (including single-image posts)
          because the design requires a persistent "N / M" badge.
          Dots, by contrast, only make sense for 2+ images. */}
      {indicator === "counter" ? (
        <div className={styles.counter} aria-hidden="true">
          {index + 1} / {images.length}
        </div>
      ) : null}

      {indicator === "dots" && images.length > 1 ? (
        <div className={styles.dots} aria-hidden="true">
          {images.map((_, i) => (
            <span
              key={i}
              className={`${styles.dot}${i === index ? ` ${styles.dotActive}` : ""}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
