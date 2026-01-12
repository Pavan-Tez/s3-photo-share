"use client";
import { useDropzone } from "react-dropzone";
import { useState } from "react";

export default function UploadLocally() {
  const [files, setFiles] = useState([]);
  const [stage, setStage] = useState("idle"); // idle | ready | converting | done
  const [progress, setProgress] = useState(0);
  const [zipBlob, setZipBlob] = useState(null);

  const { getRootProps, getInputProps } = useDropzone({
    accept: { "image/jpeg": [] },
    maxFiles: 300,
    onDrop: (acceptedFiles) => {
      setFiles(acceptedFiles);
      setStage("ready");
    },
  });

  const startConversion = async () => {
    setStage("converting");
    setProgress(0);

    // fake smooth progress
    let fake = 0;
    const interval = setInterval(() => {
      fake += Math.random() * 8;
      setProgress(Math.min(fake, 95));
    }, 300);

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    const res = await fetch("/api/thumbnail-zip", {
      method: "POST",
      body: formData,
    });

    const blob = await res.blob();

    clearInterval(interval);
    setProgress(100);
    setZipBlob(blob);
    setStage("done");
  };

  const downloadZip = () => {
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "thumbnails.zip";
    a.click();
  };

  return (
    <div style={{ maxWidth: 600, margin: "auto", textAlign: "center" }}>
      {/* DRAG AREA */}
      {stage === "idle" && (
        <div
          {...getRootProps()}
          style={{
            padding: 50,
            border: "2px dashed #aaa",
            cursor: "pointer",
          }}
        >
          <input {...getInputProps()} />
          <h2>Drag & drop JPG photos</h2>
          <p>~200 images • local • no upload</p>
        </div>
      )}

      {/* READY */}
      {stage === "ready" && (
        <>
          <h3>{files.length} images selected</h3>
          <button onClick={startConversion} style={btn}>
            Convert to Thumbnails
          </button>

        </>
      )}

      {/* CONVERTING */}
      {stage === "converting" && (
        <>
          <h3>Converting thumbnails…</h3>
          
          <div style={barContainer}>
            <div
              style={{
                ...barFill,
                width: `${progress}%`,
              }}
            />
          </div>
          <p>{Math.floor(progress)}%</p>
        </>
      )}

      {/* DONE */}
      {stage === "done" && (
        <>
          <h2 style={{ color: "green" }}>✅ Thumbnails Ready</h2>
          <button onClick={downloadZip} style={btn}>
            Download ZIP
          </button>
        </>
      )}
    </div>
  );
}

/* styles */
const btn = {
  padding: "12px 20px",
  fontSize: 16,
  cursor: "pointer",
  marginTop: 20,
};

const barContainer = {
  width: "100%",
  height: 18,
  background: "#eee",
  borderRadius: 10,
  overflow: "hidden",
  marginTop: 20,
};

const barFill = {
  height: "100%",
  background: "#4caf50",
  transition: "width 0.3s ease",
};
