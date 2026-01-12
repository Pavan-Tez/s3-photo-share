import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

const PAGE_SIZE = 25;

export default function Gallery() {
  const router = useRouter();
  const { prefix } = router.query;

  const [files, setFiles] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loaderRef = useRef(null);

  useEffect(() => {
    if (!router.isReady || !prefix) return;

    fetch(`/api/images?prefix=${prefix}`)
      .then(res => res.json())
      .then(setFiles);
  }, [prefix]);

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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
{files.slice(0, visibleCount).map((file, idx) => (
  <a
    key={file.name}
    href={file.fullUrl}
    target="_blank"
    rel="noopener noreferrer"
  >
    <img
      src={file.thumbUrl || file.fullUrl}
      alt={file.name}
      loading="lazy"
      decoding="async"
      className="blur-img"
      onLoad={(e) => e.currentTarget.classList.add("loaded")}
      onError={(e) => {
    // fallback to full image if thumb failed
    if (e.currentTarget.src !== file.fullUrl) {
      e.currentTarget.src = file.fullUrl;
    } else {
      // remove skeleton even if image totally fails
      e.currentTarget.classList.add("loaded");
    }
  }}
      style={{
        width: "250px",
        height: "180px",
        objectFit: "cover",
        borderRadius: 8,
      }}
    />
  </a>
))}

      </div>

      {/* Invisible trigger */}
      <div ref={loaderRef} style={{ height: 40 }} />
    </main>
  );
}
