import { useState, useEffect, useRef, useCallback } from "react";
import FeedItem from "./FeedItem";

export default function Feed({ files }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const itemRefs = useRef([]);
  const observersRef = useRef([]);

  // Set ref callback with proper cleanup
  const setItemRef = useCallback((index) => {
    return (el) => {
      if (el) {
        itemRefs.current[index] = el;
      } else {
        // Cleanup when element is removed
        delete itemRefs.current[index];
      }
    };
  }, []);

  // Intersection Observer for tracking active items
  useEffect(() => {
    if (!containerRef.current || files.length === 0) {
      return;
    }

    // Clean up previous observers
    observersRef.current.forEach((observer) => observer.disconnect());
    observersRef.current = [];

    const observerOptions = {
      root: containerRef.current,
      rootMargin: "0px",
      threshold: [0.3, 0.5, 0.7], // Multiple thresholds for better detection
    };

    // Small delay to ensure refs are set
    const timeoutId = setTimeout(() => {
      itemRefs.current.forEach((itemRef, index) => {
        if (!itemRef) return;

        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              // Use the highest intersection ratio to determine active item
              if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                setActiveIndex(index);
              }
            });
          },
          observerOptions
        );

        observer.observe(itemRef);
        observersRef.current.push(observer);
      });
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      observersRef.current.forEach((observer) => observer.disconnect());
      observersRef.current = [];
    };
  }, [files.length]);

  // Handle scroll for snap behavior (backup method)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || files.length === 0) return;

    let scrollTimeout;
    let isScrolling = false;

    const handleScroll = () => {
      if (!isScrolling) {
        isScrolling = true;
      }

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
        
        // Find the item closest to the viewport center
        const containerRect = container.getBoundingClientRect();
        const viewportCenter = containerRect.top + containerRect.height / 2;

        let closestIndex = activeIndex;
        let closestDistance = Infinity;

        itemRefs.current.forEach((itemRef, index) => {
          if (!itemRef) return;
          const itemRect = itemRef.getBoundingClientRect();
          const itemCenter = itemRect.top + itemRect.height / 2;
          const distance = Math.abs(itemCenter - viewportCenter);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        });

        if (closestIndex !== activeIndex) {
          setActiveIndex(closestIndex);
        }
      }, 100);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [files.length, activeIndex]);

  if (files.length === 0) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <div className="text-gray-500 text-center">
          <p className="text-lg mb-2">No photos available</p>
          <p className="text-sm">Check if the prefix exists in your S3 bucket</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="snap-container w-full h-screen overflow-y-scroll bg-black"
      style={{
        scrollBehavior: "smooth",
        WebkitOverflowScrolling: "touch", // Smooth scrolling on iOS
      }}
    >
      {files.map((file, index) => (
        <div
          key={`${file.name}-${index}`}
          ref={setItemRef(index)}
        >
          <FeedItem
            file={file}
            index={index}
            isActive={activeIndex === index}
          />
        </div>
      ))}
    </div>
  );
}
