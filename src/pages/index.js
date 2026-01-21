import { useEffect, useState } from "react";
import Link from "next/link";

const albums = [
  {
    name: "Beach Photos",
    prefix: process.env.NEXT_PUBLIC_S3_BEACH_PREFIX,
    date: "11 Jan 2026",
  },
  {
    name: "Sankranthi kites",
    prefix: process.env.NEXT_PUBLIC_S3_BHOGI_PREFIX,
    date: "14 Jan 2026",
  },
];

export default function Home() {
  const [downloading, setDownloading] = useState(null);

  // NEW: album status map
  const [albumStatus, setAlbumStatus] = useState({});

  // NEW: check albums on load
  useEffect(() => {
    albums.forEach(async (album) => {
      try {
        setAlbumStatus((prev) => ({
          ...prev,
          [album.prefix]: { loading: true },
        }));

        const res = await fetch(
          `/api/images?prefix=${encodeURIComponent(album.prefix)}`
        );

        if (!res.ok) throw new Error("API error");

        const data = await res.json();

        setAlbumStatus((prev) => ({
          ...prev,
          [album.prefix]: {
            error: false,
            hasImages: data.length > 0,
          },
        }));
      } catch (err) {
        setAlbumStatus((prev) => ({
          ...prev,
          [album.prefix]: {

            error: true,
            hasImages: false,
          },
        }));
      }
    });
  }, []);

  return (
    <main style={{ padding: 20 }}>
      <div
        style={{
          border: "1px solid #333",
          borderRadius: 8,
          padding: 16,
          marginBottom: 20,
          maxWidth: 400,
        }}
      >
        <a href="/convertLocalThumbs" style={{
                padding: "8px 12px",
                border: "1px solid #ccc",
                borderRadius: 6,
                textDecoration: "none",
                display: "inline-block",
              }}>
            Thumbnail Converter →
        </a>
        <h6>Entries only below 100mb (free server, can't more than that)</h6>
      </div>
      <h2>Photo Albums</h2>
      <br />

      <div
            
            style={{
              border: "1px solid #333",
              borderRadius: 8,
              padding: 16,
              marginBottom: 20,
              maxWidth: 400,
              opacity:1,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" ,marginBottom:5}}>
              <h3>Family</h3>
            </div>
          
            <a
              href="/components/family"
               style={{
                padding: "8px 12px",
                border: "1px solid #ccc",
                borderRadius: 6,
                textDecoration: "none",
                display: "inline-block",
                cursor: "pointer",
                marginRight:10
              }}
            >
                👀 View Gallery
            </a>
            </div>
      {albums.map((album) => {
        const status = albumStatus[album.prefix] || {};
        const disabled =
          !status.hasImages;

        return (
          <div
            key={album.prefix}
            style={{
              border: "1px solid #333",
              borderRadius: 8,
              padding: 16,
              marginBottom: 20,
              maxWidth: 400,
              opacity: disabled ? 0.6 : 1,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" ,marginBottom:5}}>
              <h3>{album.name}</h3>
              <h6>{album.date}</h6>
            </div>

            {/* VIEW GALLERY */}
            <a
              href={
                disabled ? "#" : `/gallery?prefix=${album.prefix}`
              }
               style={{
                padding: "8px 12px",
                border: "1px solid #ccc",
                borderRadius: 6,
                textDecoration: "none",
                display: "inline-block",
                cursor: disabled ? "not-allowed" : "pointer",
                marginRight:10
              }}
            >
                👀 View Gallery
            </a>

            {/* DOWNLOAD ZIP */}
            <a
              href={
                disabled
                  ? undefined
                  : `/api/download-zip?prefix=${album.prefix}`
              }
              onClick={(e) => {
                if (disabled) {
                  e.preventDefault();
                  return;
                }
                setDownloading(album.prefix);
              }}
              style={{
                padding: "8px 12px",
                border: "1px solid #ccc",
                borderRadius: 6,
                textDecoration: "none",
                display: "inline-block",
                cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              {downloading === album.prefix
                ? "Preparing..."
                : "⬇ Download ZIP"}
            </a>

            {/* STATUS MESSAGE */}
            {!status.loading && status.error && (
              <p style={{ color: "red", fontSize: 12 }}>
                Album not accessible
              </p>
            )}

            {!status.loading && !status.error && !status.hasImages && (
              <p style={{ color: "#777", fontSize: 12 }}>
                No images in this album
              </p>
            )}
          </div>
        );
      })}
    </main>
  );
}
