import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

const PAGE_SIZE = 50;

/* ------------------ HELPERS ------------------ */

// Detect video files
const isVideo = (file) =>
  file?.name?.match(/\.(mp4|webm|ogg|mov)$/i);

// Desktop detection (mouse / trackpad)
const isDesktop = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(pointer: fine)").matches;

// Image preloader
const preloadImage = (url) => {
  if (!url) return;
  const img = new Image();
  img.src = url;
};

/* ------------------ COMPONENT ------------------ */

export default function Gallery() {
  const router = useRouter();
  const { prefix } = router.query;

  const loaderRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [isImageLoading, setIsImageLoading] = useState(false);

  /* ------------------ LIGHTBOX ------------------ */

  const openLightbox = (index) => {
    const file = files[index];

    // ❌ block ONLY videos on mobile
    if (isVideo(file) && !isDesktop()) return;

    setIsImageLoading(true);
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const showPrev = () => {
    setIsImageLoading(true);
    setLightboxIndex((i) => (i > 0 ? i - 1 : i));
  };

  const showNext = () => {
    setIsImageLoading(true);
    setLightboxIndex((i) =>
      i < files.length - 1 ? i + 1 : i
    );
  };

  /* ------------------ FETCH FILES ------------------ */

  useEffect(() => {
    if (!router.isReady || !prefix) return;

    fetch(`/api/images?prefix=${encodeURIComponent(prefix)}`)
      .then((res) => res.json())
      .then(setFiles);
  }, [router.isReady, prefix]);

  /* ------------------ PRELOAD FULL IMAGE ------------------ */

  useEffect(() => {
    if (lightboxIndex === null) return;

    const file = files[lightboxIndex];
    if (!file || isVideo(file)) {
      setIsImageLoading(false);
      return;
    }

    const img = new Image();
    img.src = file.fullUrl;

    if (img.complete) {
      setIsImageLoading(false);
    } else {
      img.onload = () => setIsImageLoading(false);
      img.onerror = () => setIsImageLoading(false);
    }

    const next = files[lightboxIndex + 1];
    const prev = files[lightboxIndex - 1];

    if (next && !isVideo(next)) preloadImage(next.fullUrl);
    if (prev && !isVideo(prev)) preloadImage(prev.fullUrl);
  }, [lightboxIndex, files]);

  /* ------------------ INFINITE SCROLL ------------------ */

  useEffect(() => {
    if (!loaderRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((v) =>
            Math.min(v + PAGE_SIZE, files.length)
          );
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [files.length]);

  /* ------------------ RENDER ------------------ */

  return (
    <main style={{ padding: 20 }}>
      <h2>Gallery</h2>

      {/* GRID */}
      <div className="gallery-grid">
        {files.slice(0, visibleCount).map((file, idx) => {
          const video = isVideo(file);

          return video ? (
            // 🎞️ GRID VIDEO
            <video
              key={file.name}
              src={file.fullUrl}
              preload="metadata"
              controls={!isDesktop()}
              playsInline
              onClick={() => {
                if (isDesktop()) openLightbox(idx);
              }}
              style={{
                width: "100%",
                aspectRatio: "4 / 3",
                objectFit: "cover",
                cursor: isDesktop() ? "pointer" : "default",
                background: "#000",
              }}
            />
          ) : (
            // 🖼️ GRID IMAGE
            <img
              key={file.name}
              src={file.thumbUrl || file.fullUrl}
              alt={file.name}
              loading="lazy"
              decoding="async"
              className="blur-img"
              onError={(e) => {
                if (e.currentTarget.src !== file.fullUrl) {
                  e.currentTarget.src = file.fullUrl;
                }
              }}
              onClick={() => openLightbox(idx)}
              style={{
                width: "100%",
                aspectRatio: "4 / 3",
                objectFit: "cover",
                cursor: "pointer",
                background: "#000",
              }}
            />
          );
        })}
      </div>

      {/* Infinite scroll trigger */}
      <div ref={loaderRef} style={{ height: 40 }} />

      {/* LIGHTBOX */}
      {lightboxIndex !== null && (
        <div
          onClick={closeLightbox}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                width: "90vw",
                height: "80vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {(() => {
                const file = files[lightboxIndex];
                const video = isVideo(file);

                if (video) {
                  return (
                    <video
                      src={file.fullUrl}
                      controls
                      playsInline
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        borderRadius: 8,
                      }}
                    />
                  );
                }

                if (isImageLoading) {
                  return (
                    <div style={{ color: "white" }}>
                      Loading…
                    </div>
                  );
                }

                return (
                  <img
                    src={file.fullUrl}
                    alt=""
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      borderRadius: 8,
                    }}
                  />
                );
              })()}
            </div>

            {/* CONTROLS */}
            <div
              style={{
                marginTop: 12,
                display: "flex",
                justifyContent: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={showPrev}
                disabled={lightboxIndex === 0}
              >
                ⬅ Prev
              </button>

              <button
                onClick={showNext}
                disabled={
                  lightboxIndex === files.length - 1
                }
              >
                Next ➡
              </button>

              <a
                href={`/api/download-image?url=${encodeURIComponent(
                  files[lightboxIndex].fullUrl
                )}&name=${files[lightboxIndex].name}`}
              >
                ⬇ Download
              </a>

              <a
                href={files[lightboxIndex].fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "white" }}
              >
                🔗 Open
              </a>

              <button onClick={closeLightbox}>
                ✖ Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
