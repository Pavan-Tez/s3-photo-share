import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [files, setFiles] = useState([]);
  const prefix = "beachPhotos/";
  const [downloading, setDownloading] = useState(false);
  useEffect(() => {
    fetch(`/api/images?prefix=${prefix}`)
      .then(res => res.json())
      .then(setFiles);
  }, []);

    const btn = {
  padding: "10px 16px",
  cursor: "pointer",
  marginRIght: 30,
};

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
      <Link href={`/gallery?prefix=${prefix}`}>
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
