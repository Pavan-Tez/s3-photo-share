import AWS from "aws-sdk";
import crypto from "crypto";

// Singleton S3 client (reused across requests)
// Lazy initialization to handle missing env vars gracefully
let s3 = null;
function getS3Client() {
  if (!s3) {
    if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error("AWS credentials not configured");
    }
    s3 = new AWS.S3({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      // Performance optimizations
      maxRetries: 2,
      httpOptions: {
        timeout: 5000, // 5 second timeout
        connectTimeout: 2000, // 2 second connection timeout
      },
    });
  }
  return s3;
}

// In-memory cache with TTL - wrapped in a function to prevent hot-reload leaks
let cache = null;
let cleanupInterval = null;

function getCache() {
  // In Next.js dev mode, modules can be hot-reloaded
  // Use globalThis to persist across hot-reloads safely
  if (typeof globalThis !== 'undefined' && !globalThis.__s3ImageCache) {
    globalThis.__s3ImageCache = new Map();
  }
  return globalThis.__s3ImageCache || new Map();
}

function getCleanupInterval() {
  if (typeof globalThis !== 'undefined' && globalThis.__s3ImageCacheCleanup) {
    return globalThis.__s3ImageCacheCleanup;
  }
  return null;
}

function setupCleanupInterval() {
  // Prevent multiple intervals in dev hot-reload
  if (getCleanupInterval()) {
    return; // Already set up
  }

  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  const MAX_CACHE_SIZE = 100;
  const CLEANUP_INTERVAL = 60000; // 1 minute

  const intervalId = setInterval(() => {
    const cache = getCache();
    if (cache.size === 0) {
      return; // Skip cleanup if cache is empty
    }

    const now = Date.now();
    let cleaned = 0;

    // Clean expired entries
    for (const [key, value] of cache.entries()) {
      if (now > value.expiresAt) {
        cache.delete(key);
        cleaned++;
      }
    }

    // If cache is too large, remove oldest entries
    if (cache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(cache.entries())
        .sort((a, b) => a[1].expiresAt - b[1].expiresAt);
      const toRemove = entries.slice(0, cache.size - MAX_CACHE_SIZE);
      toRemove.forEach(([key]) => cache.delete(key));
    }
  }, CLEANUP_INTERVAL);

  // Store interval ID to prevent duplicates
  if (typeof globalThis !== 'undefined') {
    globalThis.__s3ImageCacheCleanup = intervalId;
  }

  return intervalId;
}

// Initialize cleanup on module load (only once)
if (typeof globalThis !== 'undefined') {
  setupCleanupInterval();
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_CACHE_SIZE = 100; // Prevent memory leaks

/**
 * Generate cache key from prefix and pagination params
 * Uses hash to prevent key collisions and limit key length
 */
function getCacheKey(prefix, maxKeys, continuationToken) {
  const keyParts = [prefix, maxKeys || 'default', continuationToken || 'none'];
  const keyString = keyParts.join(':');
  
  // Hash long keys to prevent memory issues and collisions
  if (keyString.length > 200) {
    return `images:${crypto.createHash('md5').update(keyString).digest('hex')}`;
  }
  return `images:${keyString}`;
}

/**
 * Generate ETag from response data
 * Memoized for empty arrays to avoid recomputation
 */
const emptyArrayETag = crypto.createHash('md5').update(JSON.stringify([])).digest('hex');

function generateETag(data) {
  // Fast path for empty arrays
  if (Array.isArray(data) && data.length === 0) {
    return emptyArrayETag;
  }
  const str = JSON.stringify(data);
  return crypto.createHash('md5').update(str).digest('hex');
}

/**
 * Validate environment variables
 */
function validateEnv() {
  if (!process.env.S3_BUCKET_NAME) {
    throw new Error("S3_BUCKET_NAME environment variable is required");
  }
  if (!process.env.CLOUDFRONT_URL) {
    throw new Error("CLOUDFRONT_URL environment variable is required");
  }
}

/**
 * Fetch images from S3 with pagination support
 * Handles empty buckets gracefully
 */
async function fetchImagesFromS3(prefix, maxKeys = 1000, continuationToken = null) {
  validateEnv();
  const s3Client = getS3Client();

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Prefix: prefix,
    MaxKeys: maxKeys,
  };

  if (continuationToken) {
    params.ContinuationToken = continuationToken;
  }

  const data = await s3Client.listObjectsV2(params).promise();

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[S3 API] Fetching prefix: "${prefix}"`);
    console.log(`[S3 API] Found ${data.Contents?.length || 0} objects`);
    if (data.Contents && data.Contents.length > 0) {
      console.log(`[S3 API] Sample keys:`, data.Contents.slice(0, 5).map(obj => obj.Key));
    }
  }

  // Handle empty buckets or no results
  if (!data.Contents || data.Contents.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[S3 API] No objects found for prefix: "${prefix}"`);
    }
    return {
      files: [],
      isTruncated: false,
      nextContinuationToken: null,
    };
  }

  // Process files
  const files = data.Contents
    .filter(obj => {
      // Validate object structure
      if (!obj || !obj.Key) {
        return false;
      }
      // Skip directories and thumbnails
      const isDirectory = obj.Key.endsWith("/");
      const isThumbnail = obj.Key.startsWith(`${prefix}thumbnails/`);
      return !isDirectory && !isThumbnail;
    })
    .map(obj => {
      const fileName = obj.Key.split("/").pop();
      // Ensure fileName is valid
      if (!fileName) {
        return null;
      }
      return {
        name: fileName,
        fullUrl: `${process.env.CLOUDFRONT_URL}/${obj.Key}`,
        thumbUrl: `${process.env.CLOUDFRONT_URL}/${prefix}thumbnails/${fileName}`,
      };
    })
    .filter(Boolean); // Remove any null entries

  if (process.env.NODE_ENV === 'development') {
    console.log(`[S3 API] After filtering: ${files.length} files`);
    if (files.length === 0 && data.Contents.length > 0) {
      console.warn(`[S3 API] All ${data.Contents.length} objects were filtered out. Check filter logic.`);
      console.warn(`[S3 API] Filtered keys:`, data.Contents.map(obj => ({
        key: obj.Key,
        isDir: obj.Key.endsWith("/"),
        isThumb: obj.Key.startsWith(`${prefix}thumbnails/`)
      })));
    }
  }

  return {
    files,
    isTruncated: data.IsTruncated || false,
    nextContinuationToken: data.NextContinuationToken || null,
  };
}

/**
 * Clean expired cache entries (lazy cleanup on access)
 */
function cleanupCacheIfNeeded() {
  const cache = getCache();
  if (cache.size === 0) {
    return; // No cleanup needed
  }

  const now = Date.now();
  let needsCleanup = false;

  // Quick check if any entries are expired
  for (const value of cache.values()) {
    if (now > value.expiresAt) {
      needsCleanup = true;
      break;
    }
  }

  if (!needsCleanup && cache.size <= MAX_CACHE_SIZE) {
    return; // No cleanup needed
  }

  // Perform cleanup
  for (const [key, value] of cache.entries()) {
    if (now > value.expiresAt) {
      cache.delete(key);
    }
  }

  // If still too large, remove oldest entries
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(cache.entries())
      .sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    const toRemove = entries.slice(0, cache.size - MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => cache.delete(key));
  }
}

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate environment early
    validateEnv();

    // Parse and validate query parameters
    const prefix = req.query.prefix 
      ? decodeURIComponent(req.query.prefix) 
      : "beachphotos/";
    
    // Validate prefix format
    if (typeof prefix !== 'string' || prefix.length > 500) {
      return res.status(400).json({ error: 'Invalid prefix parameter' });
    }

    const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
    
    // Pagination support with validation
    let maxKeys = 1000;
    if (req.query.maxKeys) {
      const parsed = parseInt(req.query.maxKeys, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 1000) {
        return res.status(400).json({ error: 'maxKeys must be between 1 and 1000' });
      }
      maxKeys = parsed;
    }

    let continuationToken = null;
    if (req.query.continuationToken) {
      continuationToken = decodeURIComponent(req.query.continuationToken);
      if (continuationToken.length > 1000) {
        return res.status(400).json({ error: 'Invalid continuationToken' });
      }
    }

    // Lazy cache cleanup on access
    cleanupCacheIfNeeded();

    // Check cache
    const cache = getCache();
    const cacheKey = getCacheKey(normalizedPrefix, maxKeys, continuationToken);
    const cached = cache.get(cacheKey);
    const now = Date.now();

    if (cached && now < cached.expiresAt) {
      // Serve from cache - no recomputation needed
      const etag = req.headers['if-none-match'];
      if (etag && etag === cached.etag) {
        // Client has same version, return 304
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
        res.setHeader('ETag', cached.etag);
        return res.status(304).end();
      }

      // Return cached data with fresh headers
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      res.setHeader('ETag', cached.etag);
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cached.data);
    }

    // Cache miss or expired - fetch from S3
    const startTime = Date.now();
    const result = await fetchImagesFromS3(normalizedPrefix, maxKeys, continuationToken);
    const fetchTime = Date.now() - startTime;

    // Always return array format for backward compatibility
    const responseData = result.files;
    
    // Generate ETag (only when needed, not from cache)
    const etag = generateETag(responseData);

    // Add debug headers in development
    if (process.env.NODE_ENV === 'development') {
      res.setHeader('X-Debug-Prefix', normalizedPrefix);
      res.setHeader('X-Debug-File-Count', responseData.length.toString());
    }

    // Check if client has same version (before storing in cache)
    const clientETag = req.headers['if-none-match'];
    if (clientETag && clientETag === etag) {
      // Still store in cache for future requests
      cache.set(cacheKey, {
        data: responseData,
        etag,
        expiresAt: now + CACHE_TTL,
        fetchedAt: now,
      });

      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      res.setHeader('ETag', etag);
      return res.status(304).end();
    }

    // Store in cache
    cache.set(cacheKey, {
      data: responseData,
      etag,
      expiresAt: now + CACHE_TTL,
      fetchedAt: now,
    });

    // Return response
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.setHeader('ETag', etag);
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('X-Fetch-Time', `${fetchTime}ms`);
    
    // Include pagination metadata in headers if paginated (non-breaking change)
    if (result.isTruncated && result.nextContinuationToken) {
      res.setHeader('X-Pagination-Has-More', 'true');
      res.setHeader('X-Pagination-Next-Token', result.nextContinuationToken);
    }

    // Always return array format for backward compatibility
    return res.status(200).json(responseData);
  } catch (err) {
    console.error('S3 API Error:', err);
    
    // Handle specific error types
    if (err.message && err.message.includes('environment variable')) {
      return res.status(500).json({ 
        error: "Server configuration error",
        message: err.message 
      });
    }

    if (err.code === 'NoSuchBucket' || err.code === 'AccessDenied') {
      return res.status(404).json({ 
        error: "Bucket not found or access denied",
        code: err.code 
      });
    }

    // Return cached data if available (stale-while-revalidate pattern)
    try {
      const prefix = req.query.prefix 
        ? decodeURIComponent(req.query.prefix) 
        : "beachphotos/";
      const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
      const cacheKey = getCacheKey(
        normalizedPrefix, 
        req.query.maxKeys ? parseInt(req.query.maxKeys, 10) : 1000, 
        req.query.continuationToken ? decodeURIComponent(req.query.continuationToken) : null
      );
      const cache = getCache();
      const cached = cache.get(cacheKey);
      
      if (cached) {
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
        res.setHeader('ETag', cached.etag);
        res.setHeader('X-Cache', 'STALE');
        res.setHeader('X-Error', 'Served stale cache due to S3 error');
        return res.status(200).json(cached.data);
      }
    } catch (cacheError) {
      // Ignore cache errors during error handling
      console.error('Cache error during error handling:', cacheError);
    }

    res.status(500).json({ 
      error: "Failed to fetch images",
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
}
