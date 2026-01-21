import { useState } from "react";
import { useRouter } from "next/router";

export default function FamilyAuth() {
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const submit = async () => {
    setError("");

    const res = await fetch("/api/family-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer }),
    });

    if (res.ok) {
      router.push("/components/family");
    } else {
      setError(
        "SORRY!! You're not authorised. Contact Pavan Tez for authorisation."
      );
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b0b0b",
        padding: 20,
      }}
    >
      <div
        style={{
          border: "1px solid #333",
          borderRadius: 10,
          padding: 24,
          width: "100%",
          maxWidth: 380,
          background: "#000",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.02)",
        }}
      >
        <h2 style={{ marginBottom: 6 }}>👨‍👩‍👧‍👦 Family Gallery</h2>
        <p style={{ color: "#aaa", fontSize: 14, marginBottom: 20 }}>
          Authorised access only
        </p>

        <label style={{ fontSize: 13, color: "#ccc" }}>
          Security Question:

          <h3>What is Aarnavi's {'->'} Mom's {'->'} sister's name??</h3>
        </label>

        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Enter answer"
          style={{
            marginTop: 6,
            padding: "10px 12px",
            width: "100%",
            borderRadius: 6,
            border: "1px solid #333",
            background: "#111",
            color: "#fff",
            outline: "none",
            marginBottom: 14,
          }}
        />

        <button
          onClick={submit}
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 6,
            border: "1px solid #555",
            background: "#111",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          🔐 Verify Access
        </button>

        {error && (
          <p
            style={{
              marginTop: 14,
              color: "#ff6b6b",
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
