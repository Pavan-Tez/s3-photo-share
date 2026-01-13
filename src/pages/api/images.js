import AWS from "aws-sdk";
import crypto from "crypto";

/* ============================
   S3 CLIENT (SINGLETON)
============================ */

let s3 = null;
function getS3Client() {
  if (!s3) {
    if (
      !process.env.AWS_REGION ||
      !process.env.AWS_ACCESS_KEY_ID ||
      !process.env.AWS_SECRET_ACCESS_KEY
    ) {
      throw new Error("AWS credentials not configured");
    }

    s3 = new AWS.S3({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      maxRetries: 2,
      httpOptions: {
        timeout: 5000,
        connectTimeout: 2000,
      },
    });
  }
  return s3;
}

/* ============================
   CACHE (SAFE FOR HOT RELOAD)
============================ */

function getCache() {
  if (typeof globalThis !== "undefined" && !globalThis.__s3ImageCache) {
    globalThis.__s3ImageCache = new Map();
  }
  return globalThis.__s3ImageCache;
}

const CACHE_TTL = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 100;

/* ============================
   UTILITIES
============================ */

function getCacheKey(prefix, maxKeys, continuationToken) {
  const key = `${prefix}:${maxKeys}:${continuationToken || "none"}`;
  return `images:${crypto.createHash("md5").update(key).digest("hex")}`;
}

const emptyETag = crypto
  .createHash("md5")
  .update(JSON.stringify([]))
  .digest("hex");

function generateETag(data) {
  if (Array.isArray(data) && data.length === 0) return emptyETag;
  return crypto.createHash("md5").update(JSON.stringify(data)).digest("hex");
}

function validateEnv() {
  if (!process.env.S3_BUCKET_NAME)
    throw new Error("S3_BUCKET_NAME missing");
  if (!process.env.CLOUDFRONT_URL)
    throw new Error("CLOUDFRONT_URL missing");
}

/* ============================
   S3 FETCH
============================ */

async function fetchImagesFromS3(prefix, maxKeys, continuationToken) {
  validateEnv();
  const s3 = getS3Client();

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Prefix: prefix,
    MaxKeys: maxKeys,
    ...(continuationToken && { ContinuationToken: continuationToken }),
  };

  const data = await s3.listObjectsV2(params).promise();

  if (!data.Contents || data.Contents.length === 0) {
    return { files: [], isTruncated: false, nextToken: null };
  }

  const files = data.Contents
    .filter(
      (obj) =>
        obj.Key &&
        !obj.Key.endsWith("/") &&
        !obj.Key.startsWith(`${prefix}thumbnails/`)
    )
    .map((obj) => {
      const name = obj.Key.split("/").pop();
      return {
        name,
        fullUrl: `${process.env.CLOUDFRONT_URL}/${obj.Key}`,
        thumbUrl: `${process.env.CLOUDFRONT_URL}/${prefix}thumbnails/${name}`,
      };
    });

  return {
    files,
    isTruncated: data.IsTruncated,
    nextToken: data.NextContinuationToken || null,
  };
}

/* ============================
   API HANDLER
============================ */

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    validateEnv();

    /* 🔐 SINGLE SOURCE OF TRUTH */
    const ALLOWED_PREFIX = "beachphotos/";

    const rawPrefix = req.query.prefix
      ? decodeURIComponent(req.query.prefix)
      : null;

    // ❗ FORCE beachphotos/ ALWAYS
    let prefix = ALLOWED_PREFIX;

    if (
      rawPrefix &&
      rawPrefix !== "photos" &&
      rawPrefix !== "photos/"
    ) {
      prefix = rawPrefix;
    }

    const normalizedPrefix = prefix.endsWith("/")
      ? prefix
      : `${prefix}/`;

    /* Pagination */
    const maxKeys = Math.min(
      parseInt(req.query.maxKeys || "1000", 10),
      1000
    );

    const continuationToken = req.query.continuationToken
      ? decodeURIComponent(req.query.continuationToken)
      : null;

    const cache = getCache();
    const cacheKey = getCacheKey(
      normalizedPrefix,
      maxKeys,
      continuationToken
    );

    const cached = cache.get(cacheKey);
    const now = Date.now();

    if (cached && now < cached.expiresAt) {
      if (req.headers["if-none-match"] === cached.etag) {
        res.setHeader("ETag", cached.etag);
        return res.status(304).end();
      }

      res.setHeader("ETag", cached.etag);
      res.setHeader("X-Cache", "HIT");
      res.setHeader("X-Resolved-Prefix", normalizedPrefix);
      return res.status(200).json(cached.data);
    }

    const result = await fetchImagesFromS3(
      normalizedPrefix,
      maxKeys,
      continuationToken
    );

    const data = result.files;
    const etag = generateETag(data);

    cache.set(cacheKey, {
      data,
      etag,
      expiresAt: now + CACHE_TTL,
    });

    res.setHeader("ETag", etag);
    res.setHeader("X-Cache", "MISS");
    res.setHeader("X-Resolved-Prefix", normalizedPrefix);

    return res.status(200).json(data);
  } catch (err) {
    console.error("API Error:", err);
    return res.status(500).json({ error: "Failed to fetch images" });
  }
}
