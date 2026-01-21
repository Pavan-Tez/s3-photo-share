import formidable from "formidable";
import sharp from "sharp";
import archiver from "archiver";
import fs from "fs";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  const form = formidable({
    multiples: true,
    maxTotalFileSize: 2 * 1024 * 1024 * 1024, // 0.5 GB
    maxFileSize: 25 * 1024 * 1024, // 25 MB per file
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form error:", err);
      return res.status(400).json({ error: err.message });
    }

    // ✅ normalize files
    const uploaded = files.files
      ? Array.isArray(files.files)
        ? files.files
        : [files.files]
      : [];

    if (uploaded.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=thumbnails.zip"
    );

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    for (const file of uploaded) {
      try {
        // ✅ skip videos & non-images
        if (!file.mimetype?.startsWith("image/")) {
          console.log("Skipping non-image:", file.originalFilename);
          continue;
        }

        const buffer = fs.readFileSync(file.filepath);

        const thumb = await sharp(buffer)
          .resize({ width: 250 })
          .jpeg({ quality: 40 })
          .toBuffer();

        archive.append(thumb, {
          name: file.originalFilename,
        });
      } catch (e) {
        console.error("Failed processing:", file.originalFilename, e);
        // continue with other files
      }
    }

    await archive.finalize();
  });
}
