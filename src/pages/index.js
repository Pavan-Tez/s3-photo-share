import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

const PREFIX = "photos/"; // Constant, moved outside component

const btn = {
  padding: "10px 16px",
  cursor: "pointer",
  marginRIght: 30,
};

export default function Home() {
  const [files, setFiles] = useState([]);
  const [downloading, setDownloading] = useState(false);
  
  // Memoize encoded prefix to avoid recomputation
  const encodedPrefix = useMemo(() => encodeURIComponent(PREFIX), []);

  useEffect(() => {
    const abortController = new AbortController();
    
    fetch(`/api/images?prefix=${encodedPrefix}`, {
      signal: abortController.signal,
    })
      .then(res => {
        if (res.status === 304) {
          return null; // Use cached data
        }
        return res.ok ? res.json() : [];
      })
      .then(data => {
        if (!abortController.signal.aborted && data !== null) {
          const fileList = Array.isArray(data) ? data : (data.files || []);
          setFiles(fileList);
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error("Error fetching images:", err);
          setFiles([]);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [encodedPrefix]); // Only depend on encodedPrefix, not the constant

  return (
    <main style={{ padding: 20 }}>
      <h2>Photo Album</h2>
      <br/><br/>

       <Link href="/convertLocalThumbs">
        <button style={btn}>
          Thumbnail Converter →
        </button>
      </Link>
      {/* DOWNLOAD ALL */}

<a
  href="/api/download-zip"
  onClick={() => setDownloading(true)}
  style={{
    display: "inline-block",
    padding: "10px 16px",
    cursor: "pointer",
    border: "1px solid #ccc",
    borderRadius: 6,
    textDecoration: "none",
  }}
>
  {downloading ? "Preparing...." :"⬇ Download All (ZIP)"}
</a>


      <br /><br />

      {/* VIEW GALLERY */}
      <Link href={`/gallery?prefix=${PREFIX}`}>
        <button style={{ padding: "10px 16px", cursor: "pointer" }}>
          👀 View Gallery
        </button>
      </Link>

     

          <main style={{ textAlign: "center", marginTop: 100 }}>
                <h1>Welcome 👋</h1>

          </main>
    </main>

    
  );

}
