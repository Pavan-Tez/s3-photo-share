import cookie from "cookie";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { answer } = req.body;

  if (!answer) {
    return res.status(401).end();
  }

  const normalized = answer.trim();

  // ✅ regex: starts with "sind", case-insensitive
  const isValid = /^sind/i.test(normalized);

  if (!isValid) {
    return res.status(401).end();
  }

  res.setHeader(
    "Set-Cookie",
    cookie.serialize("family_auth", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 6, // 6 hours
    })
  );

  res.status(200).json({ success: true });
}
