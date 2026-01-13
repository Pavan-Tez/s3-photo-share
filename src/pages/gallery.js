import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/router";
import Feed from "./components/Feed";

const DEFAULT_PREFIX = "beachphotos/";

export default function Gallery() {
  const router = useRouter();
  const { prefix } = router.query;

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  const lastETagRef = useRef(null);

  // Memoize prefix computation to avoid unnecessary recomputation
  const fetchPrefix = useMemo(() => {
    return prefix || DEFAULT_PREFIX;
  }, [prefix]);

  // Memoize encoded prefix
  const encodedPrefix = useMemo(() => {
    return encodeURIComponent(fetchPrefix);
  }, [fetchPrefix]);

  useEffect(() => {
    if (!router.isReady) return;
    
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null); // Clear previous errors
    
    // Build headers with ETag for conditional requests (only if ETag exists)
    const headers = {};
    if (lastETagRef.current) {
      headers['If-None-Match'] = lastETagRef.current;
    }

    fetch(`/api/images?prefix=${encodedPrefix}`, {
      signal: abortController.signal,
      headers,
    })
      .then((res) => {
        // Handle 304 Not Modified - keep existing files
        if (res.status === 304) {
          setLoading(false);
          return null; // Use existing cached data in state
        }

        // Store ETag for next request
        const etag = res.headers.get('ETag');
        if (etag) {
          lastETagRef.current = etag;
        }

        if (!res.ok) {
          // Try to get error message from response
          return res.json().then(errData => {
            throw new Error(errData.error || `HTTP ${res.status}: ${res.statusText}`);
          }).catch(() => {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          });
        }
        return res.json();
      })
      .then((data) => {
        // Only update if request wasn't aborted
        if (abortController.signal.aborted) {
          return; // Don't update state if request was cancelled
        }

        if (data === null) {
          // 304 response - keep existing files, just stop loading
          setLoading(false);
          return;
        }

        // Handle paginated response
        const fileList = Array.isArray(data) ? data : (data.files || []);
        
        // Log for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Gallery] Loaded ${fileList.length} files for prefix: ${fetchPrefix}`);
          if (fileList.length === 0) {
            console.warn(`[Gallery] No files found for prefix: ${fetchPrefix}. Check S3 bucket.`);
          }
        }
        
        setFiles(fileList);
        setError(null); // Clear any previous errors
        setLoading(false);
      })
      .catch((err) => {
        // Ignore abort errors
        if (err.name === 'AbortError') {
          return;
        }
        console.error("Error fetching images:", err);
        setError(err.message);
        // Don't clear files on error - keep what we have
        setLoading(false);
      });

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [encodedPrefix, router.isReady]); // Use encodedPrefix instead of prefix to avoid unnecessary re-encodes

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-500 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading photos...</p>
          {fetchPrefix && (
            <p className="text-gray-600 text-xs mt-2">Prefix: {fetchPrefix}</p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <div className="text-center max-w-md px-4">
          <p className="text-red-500 text-lg mb-2">Error loading photos</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <p className="text-gray-600 text-xs">Prefix: {fetchPrefix}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              // Trigger re-fetch by updating a dependency
              lastETagRef.current = null;
            }}
            className="mt-4 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-black overflow-hidden">
      {/* Mobile-first: Full width on mobile, centered on desktop */}
      <div className="w-full h-full md:max-w-md md:mx-auto md:shadow-2xl">
        <Feed files={files} />
      </div>
    </div>
  );
}