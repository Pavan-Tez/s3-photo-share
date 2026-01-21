import { useEffect, useState } from "react";

/**
 * 🔒 Server-side authentication
 * Redirects to /family-auth if not authorised
 */
export async function getServerSideProps({ req }) {
  const cookieHeader = req.headers.cookie || "";

  const isAuthed = cookieHeader.includes("family_auth=true");

  if (!isAuthed) {
    return {
      redirect: {
        destination: "/family-auth",
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}

export default function Family() {
  const albums = [
    {
      name: "Aarnavi 3rd Birthday",
      date: "20 Jan 2026",
      main_prefix: "aarnavi3rdbday/",
      parts: [
        {
          name: "Part-A",
          prefix: "aarnavi3rdbday/part-a/",
          icon: "📸 ",
        },
        {
          name: "Part-B",
          prefix: "aarnavi3rdbday/part-b/",
          icon: "📸 ",
        },
        {
          name: "Videos",
          prefix: "aarnavi3rdbday/videos",
          icon: "🎥 ",
        },
      ],
    },
  ];

  const [partStatus, setPartStatus] = useState({});
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    albums.forEach((album) => {
      album.parts.forEach(async (part) => {
        try {
          setPartStatus((prev) => ({
            ...prev,
            [part.prefix]: { loading: true },
          }));

          const res = await fetch(
            `/api/images?prefix=${encodeURIComponent(part.prefix)}`
          );

          if (!res.ok) throw new Error("API error");

          const data = await res.json();

          setPartStatus((prev) => ({
            ...prev,
            [part.prefix]: {
              loading: false,
              error: false,
              hasImages: data.length > 0,
            },
          }));
        } catch {
          setPartStatus((prev) => ({
            ...prev,
            [part.prefix]: {
              loading: false,
              error: true,
              hasImages: false,
            },
          }));
        }
      });
    });
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        padding: 20,
      }}
    >
      {/* PAGE CONTAINER */}
      <div style={{ width: "100%", maxWidth: 420 }}>
        {albums.map((alb, i) => {
          const hasAnyImages = alb.parts.some(
            (p) => partStatus[p.prefix]?.hasImages
          );

          return (
            <div
              key={i}
              style={{
                border: "1px solid #333",
                borderRadius: 8,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <h3>{alb.name}</h3>
                <h6>{alb.date}</h6>
              </div>

              {/* PART LINKS */}
              {alb.parts.map((part, k) => {
                const status = partStatus[part.prefix] || {};
                const disabled = !status.hasImages;

                return (
                  <a
                    key={k}
                    href={disabled ? "#" : `/gallery?prefix=${part.prefix}`}
                    onClick={(e) => disabled && e.preventDefault()}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #ccc",
                      borderRadius: 6,
                      textDecoration: "none",
                      display: "inline-block",
                      margin: 5,
                      opacity: disabled ? 0.6 : 1,
                      cursor: disabled ? "not-allowed" : "pointer",
                    }}
                  >
                    {part.icon}
                    {part.name}
                  </a>
                );
              })}

              {/* ZIP DOWNLOAD */}
              <a
                href={
                  hasAnyImages
                    ? `/api/download-zip?prefix=${alb.main_prefix}`
                    : undefined
                }
                onClick={(e) => {
                  if (!hasAnyImages) {
                    e.preventDefault();
                    return;
                  }
                  setDownloading(alb.name);
                }}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #ccc",
                  borderRadius: 6,
                  textDecoration: "none",
                  display: "inline-block",
                  margin: 5,
                  opacity: hasAnyImages ? 1 : 0.6,
                  cursor: hasAnyImages ? "pointer" : "not-allowed",
                }}
              >
                {downloading === alb.name ? "Preparing..." : "⬇ Download ZIP"}
              </a>

              {!hasAnyImages && (
                <p style={{ color: "#777", fontSize: 12 }}>
                  No images available in this album
                </p>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
