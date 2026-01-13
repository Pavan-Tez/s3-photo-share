import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download } from "lucide-react";

const DEFAULT_PREFIX = "beachphotos/";

export default function Gallery() {
  const router = useRouter();
  const { prefix } = router.query;

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);
  const lastETagRef = useRef(null);

  /* ============================
     Viewer state
  ============================ */
  const [activeIndex, setActiveIndex] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, time: 0 });

  const controlsTimer = useRef(null);
  const [showControls, setShowControls] = useState(true);

  /* ============================
     Prefix
  ============================ */
  const fetchPrefix = useMemo(() => prefix || DEFAULT_PREFIX, [prefix]);
  const encodedPrefix = useMemo(
    () => encodeURIComponent(fetchPrefix),
    [fetchPrefix]
  );

  /* ============================
     Fetch images
  ============================ */
  useEffect(() => {
    if (!router.isReady) return;

    abortControllerRef.current?.abort();
    const ac = new AbortController();
    abortControllerRef.current = ac;

    setLoading(true);
    setError(null);

    fetch(`/api/images?prefix=${encodedPrefix}`, {
      signal: ac.signal,
      headers: lastETagRef.current
        ? { "If-None-Match": lastETagRef.current }
        : {},
    })
      .then((res) => {
        if (res.status === 304) return null;
        const etag = res.headers.get("ETag");
        if (etag) lastETagRef.current = etag;
        if (!res.ok) throw new Error("Failed to load images");
        return res.json();
      })
      .then((data) => {
        if (data) setFiles(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => ac.abort();
  }, [encodedPrefix, router.isReady]);

  /* ============================
     Controls auto-hide
  ============================ */
  const resetControlsTimer = () => {
    setShowControls(true);
    clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 2200);
  };

  /* ============================
     Open / Close viewer
  ============================ */
  const openViewer = (idx) => {
    setActiveIndex(idx);
    setOffset({ x: 0, y: 0 });
    setScale(1);
    resetControlsTimer();
  };

  const closeViewer = () => {
    setActiveIndex(null);
    setOffset({ x: 0, y: 0 });
    setScale(1);
  };

  /* ============================
     Navigation
  ============================ */
  const goNext = () =>
    setActiveIndex((i) => Math.min(files.length - 1, i + 1));
  const goPrev = () => setActiveIndex((i) => Math.max(0, i - 1));

  /* ============================
     Gesture handling
  ============================ */
  const onPointerDown = (e) => {
    isDraggingRef.current = true;
    const p = e.touches?.[0] || e;
    dragStartRef.current = {
      x: p.clientX,
      y: p.clientY,
      time: Date.now(),
    };
    resetControlsTimer();
  };

  const onPointerMove = (e) => {
    if (!isDraggingRef.current) return;
    const p = e.touches?.[0] || e;
    setOffset({
      x: p.clientX - dragStartRef.current.x,
      y: p.clientY - dragStartRef.current.y,
    });
  };

  const onPointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const { x, y } = offset;

    // Lock gestures when zoomed
    if (scale > 1.05) {
      setOffset({ x: 0, y: 0 });
      return;
    }

    // Horizontal swipe
    if (Math.abs(x) > 80 && Math.abs(x) > Math.abs(y) * 1.2) {
      x < 0 ? goNext() : goPrev();
      setOffset({ x: 0, y: 0 });
      return;
    }

    // Vertical dismiss
    if (Math.abs(y) > 120 && Math.abs(y) > Math.abs(x) * 1.4) {
      closeViewer();
      return;
    }

    // Snap back
    setOffset({ x: 0, y: 0 });
  };

  /* ============================
     Keyboard
  ============================ */
  useEffect(() => {
    const onKey = (e) => {
      if (activeIndex === null) return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") closeViewer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex]);

  /* ============================
     Render
  ============================ */

  if (loading) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen bg-black text-gray-400 flex items-center justify-center">
        {error}
      </div>
    );
  }

  const current = activeIndex !== null ? files[activeIndex] : null;

  return (
    <div className="bg-black min-h-screen text-white">
      {/* GRID */}
      <div className="max-w-[1400px] mx-auto px-2 md:px-4">
        <header className="sticky top-0 z-20 bg-black/70 backdrop-blur py-3 flex justify-between">
          <span className="font-semibold">Photos</span>
          <span className="text-xs text-gray-400">{files.length}</span>
        </header>

        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns:
              "repeat(auto-fill, minmax(110px, 1fr))",
          }}
        >
          {files.map((f, i) => (
            <button
              key={f.name}
              onClick={() => openViewer(i)}
              className="relative aspect-square rounded-lg overflow-hidden img-skeleton"
            >
              <img
                src={f.thumbUrl || f.fullUrl}
                alt={f.name}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover opacity-0 transition-opacity duration-500"
                onLoad={(e) => (e.currentTarget.style.opacity = 1)}
              />
            </button>
          ))}
        </div>
      </div>

      {/* VIEWER */}
      <AnimatePresence>
        {current && (
          <motion.div
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.img
              src={current.fullUrl}
              alt={current.name}
              className="max-w-[95vw] max-h-[90vh] object-contain select-none"
              draggable={false}
              style={{
                x: offset.x,
                y: offset.y,
                scale,
                willChange: "transform",
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 26,
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            />

            {/* Controls */}
            <div
              className={`absolute top-4 inset-x-0 flex justify-between px-4 transition-opacity ${
                showControls ? "opacity-100" : "opacity-0"
              }`}
            >
              <button onClick={closeViewer}>
                <X />
              </button>
              <a href={current.fullUrl} download>
                <Download />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
