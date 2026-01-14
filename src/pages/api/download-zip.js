import AWS from "aws-sdk";

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// simple in-memory cache
let cachedZipKey = null;

export default async function handler(req, res) {
  const { prefix } = req.query;

if (!prefix) {
  return res.status(400).send("Prefix is required");
}

  try {
    if (!cachedZipKey) {
      const data = await s3.listObjectsV2({
        Bucket: process.env.S3_BUCKET_NAME,
        Prefix: prefix,
      }).promise();

      const zip = data.Contents?.find(o =>
        o.Key.toLowerCase().endsWith(".zip")
      );

      if (!zip) {
        return res.status(404).send("ZIP not found");
      }

      cachedZipKey = zip.Key;
      console.log("ZIP CACHED:", cachedZipKey);
    }

    const url = `${process.env.CLOUDFRONT_URL}/${cachedZipKey}`;
    res.writeHead(302, { Location: url });
    res.end();

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
}
