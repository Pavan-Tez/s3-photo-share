import AWS from "aws-sdk";

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  try {
    const { prefix  = ""} = req.query; // root folder

    const data = await s3.listObjectsV2({
      Bucket: process.env.S3_BUCKET_NAME,
      Prefix: prefix,
    }).promise();

    const files = data.Contents
      .filter(obj =>
        obj.Key &&
        !obj.Key.endsWith("/") &&
        !obj.Key.startsWith(`${prefix}thumbnails/`)
      )
      .map(obj => {
        const fileName = obj.Key.split("/").pop();

        return {
          name: fileName,
          fullUrl: `${process.env.CLOUDFRONT_URL}/${obj.Key}`,
          thumbUrl: `${process.env.CLOUDFRONT_URL}/${prefix}thumbnails/${fileName}`,
        };
      });

    res.status(200).json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch images" });
  }
}
