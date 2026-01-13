export default async function handler(req, res) {
  const { url, name = "photo.jpg" } = req.query;

  const response = await fetch(url);
  const buffer = await response.arrayBuffer();

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${name}"`
  );
  res.setHeader("Content-Type", "application/octet-stream");

  res.send(Buffer.from(buffer));
}
