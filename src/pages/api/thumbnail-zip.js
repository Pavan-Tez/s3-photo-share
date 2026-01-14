import formidable from "formidable";
import sharp from "sharp";
import archiver from "archiver";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  const form = formidable({
    multiples: true,

    // 🔥 IMPORTANT LIMITS
    maxTotalFileSize: 0.5 * 1024 * 1024 * 1024, // 0.5 GB total
    maxFileSize: 5 * 1024 * 1024,            // 5 MB per file
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }

    const images = Array.isArray(files.files)
      ? files.files
      : [files.files];

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=thumbnails.zip"
    );

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    for (const file of images) {
      const thumb = await sharp(file.filepath)
        .resize({ width: 250 })
        .jpeg({ quality: 40 })
        .toBuffer();

      archive.append(thumb, { name: file.originalFilename });
    }

    await archive.finalize();
  });
}
