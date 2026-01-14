import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

const PAGE_SIZE = 50;

export default function Gallery() {
  const router = useRouter();
  const { prefix } = router.query;

  const [files, setFiles] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loaderRef = useRef(null);

  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [isImageLoading, setIsImageLoading] = useState(false);


const openLightbox = (index) => {
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
  useEffect(() => {
    if (!router.isReady || !prefix) return;

    fetch(`/api/images?prefix=${prefix}`)
      .then(res => res.json())
      .then(setFiles);
  }, [prefix]);

  useEffect(() => {
  if (lightboxIndex === null) return;

  const img = new Image();
  img.src = files[lightboxIndex].fullUrl;

  img.onload = () => {
    setIsImageLoading(false);
  };
}, [lightboxIndex]);


  useEffect(() => {
    if (!loaderRef.current) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setVisibleCount(v =>
            Math.min(v + PAGE_SIZE, files.length)
          );
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [files.length]);

  return (
    <main style={{ padding: 20 }}>
      <h2>Gallery</h2>

      <div className="gallery-grid">

{files.slice(0, visibleCount).map((file, idx) => (
  <img
    key={file.name}
    src={file.thumbUrl || file.fullUrl}
    alt={file.name}
    loading="lazy"
    decoding="async"
    className="blur-img"
    onLoad={(e) => e.currentTarget.classList.add("loaded")}
    onError={(e) => {
      if (e.currentTarget.src !== file.fullUrl) {
        e.currentTarget.src = file.fullUrl;
      } else {
        e.currentTarget.classList.add("loaded");
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
))}


      </div>

      {/* Invisible trigger */}
      <div ref={loaderRef} style={{ height: 40 }} />
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
    {/* Stop click bubbling */}
    <div onClick={(e) => e.stopPropagation()}>

      {/* Image */}
      <div
  style={{
    width: "90vw",
    height: "80vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }}
>
  {isImageLoading ? (
    <div style={{ color: "white" }}>Loading…</div>
  ) : (
    <img
      src={files[lightboxIndex].fullUrl}
      alt=""
      style={{
        maxWidth: "100%",
        maxHeight: "100%",
        borderRadius: 8,
      }}
    />
  )}
</div>


      {/* Controls */}
      <div
        style={{
          marginTop: 12,
          display: "flex",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <button onClick={showPrev}>⬅ Prev</button>
        <button onClick={showNext}>Next ➡</button>

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

        <button onClick={closeLightbox}>✖ Close</button>
      </div>
    </div>
  </div>
)}

    </main>
  );
}
