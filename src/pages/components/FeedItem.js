import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Music,
} from "lucide-react";

export default function FeedItem({ file, index, isActive }) {
  const [isLiked, setIsLiked] = useState(false);
  const [showBigHeart, setShowBigHeart] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const lastTap = useRef({ time: 0, x: 0, y: 0 });
  const imageRef = useRef(null);

  // Double tap to like - improved to not interfere with scrolling
  const handleTap = (e) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    
    // Get touch or mouse position
    const touch = e.touches?.[0] || e.changedTouches?.[0];
    const clientX = touch?.clientX || e.clientX;
    const clientY = touch?.clientY || e.clientY;
    
    // Check if this is a double tap (not a scroll)
    if (now - lastTap.current.time < DOUBLE_PRESS_DELAY) {
      // Only trigger if it's a quick tap, not a drag
      if (clientX !== undefined && clientY !== undefined) {
        const moveDistance = Math.sqrt(
          Math.pow(clientX - (lastTap.current.x || clientX), 2) +
          Math.pow(clientY - (lastTap.current.y || clientY), 2)
        );
        // If moved more than 10px, it's a scroll, not a tap
        if (moveDistance > 10) {
          lastTap.current = { time: now, x: clientX, y: clientY };
          return;
        }
      }
      
      setIsLiked(true);
      setShowBigHeart(true);
      setTimeout(() => setShowBigHeart(false), 800);
      e.preventDefault();
      e.stopPropagation();
    } else {
      // Store tap position and time for next comparison
      lastTap.current = { 
        time: now, 
        x: clientX || 0, 
        y: clientY || 0 
      };
    }
  };

  // Progressive blur loading
  useEffect(() => {
    if (imageRef.current?.complete) {
      setImageLoaded(true);
    }
  }, []);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true);
  };

  // Always render images (lazy loading handles performance)
  // isActive is used for tracking and future optimizations (e.g., video playback)

  return (
    <div className="snap-item relative w-full h-screen flex items-center justify-center bg-black overflow-hidden">
      {/* Main Image Container */}
      <div
        className="relative w-full h-full flex items-center justify-center"
        onDoubleClick={handleTap}
        onTouchEnd={handleTap}
        onClick={(e) => {
          // Only handle click on desktop (not touch devices)
          if (!('ontouchstart' in window)) {
            handleTap(e);
          }
        }}
      >
        {/* Progressive Blur Placeholder */}
        {!imageLoaded && (
          <div className="absolute inset-0 blur-img" />
        )}

        {/* Actual Image */}
        <img
          ref={imageRef}
          src={file.fullUrl}
          alt={file.name}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          loading="lazy"
        />

        {/* Fallback for error */}
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <p className="text-gray-500 text-sm">Failed to load image</p>
          </div>
        )}

        {/* Double Tap Heart Animation */}
        <AnimatePresence>
          {showBigHeart && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 0] }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{
                  duration: 0.6,
                  times: [0, 0.3, 1],
                  ease: "easeOut",
                }}
              >
                <Heart className="w-32 h-32 text-white fill-white drop-shadow-2xl" />
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Action Bar */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-40">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 p-[2px] cursor-pointer">
          <div className="w-full h-full rounded-full bg-gray-800 border-2 border-black flex items-center justify-center">
            <span className="text-white text-xs font-bold">U</span>
          </div>
        </div>

        {/* Like Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsLiked(!isLiked)}
          className="flex flex-col items-center gap-1"
        >
          <motion.div
            animate={{ scale: isLiked ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 0.3 }}
          >
            <Heart
              className={`w-7 h-7 transition-colors ${
                isLiked
                  ? "text-red-500 fill-red-500"
                  : "text-white hover:text-gray-300"
              }`}
            />
          </motion.div>
          <span className="text-white text-xs font-semibold">
            {isLiked ? "1.2K" : "1.1K"}
          </span>
        </motion.button>

        {/* Comment Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center gap-1"
        >
          <MessageCircle className="w-7 h-7 text-white hover:text-gray-300 transition-colors" />
          <span className="text-white text-xs font-semibold">24</span>
        </motion.button>

        {/* Share Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center gap-1"
        >
          <Send className="w-7 h-7 text-white hover:text-gray-300 transition-colors -rotate-45" />
          <span className="text-white text-xs font-semibold">Share</span>
        </motion.button>

        {/* Save Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center gap-1"
        >
          <Bookmark className="w-7 h-7 text-white hover:text-gray-300 transition-colors" />
        </motion.button>

        {/* More Options */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          className="mt-2"
        >
          <MoreHorizontal className="w-7 h-7 text-white hover:text-gray-300 transition-colors" />
        </motion.button>
      </div>

      {/* Bottom Overlay - Glassmorphism */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-8 z-40">
        <div className="glass rounded-2xl p-4">
          {/* User Info & Caption */}
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 p-[2px] flex-shrink-0">
              <div className="w-full h-full rounded-full bg-gray-800 border-2 border-black flex items-center justify-center">
                <span className="text-white text-xs font-bold">U</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold mb-1">
                user_gallery
              </p>
              <p className="text-white text-sm leading-relaxed break-words">
                {file.name.replace(/\.[^/.]+$/, "")} — Beautiful moment captured
                ✨
              </p>
            </div>
          </div>

          {/* Audio/Music Tag - Scrolling */}
          <div className="flex items-center gap-2 mt-3 overflow-hidden">
            <Music className="w-4 h-4 text-white flex-shrink-0" />
            <div className="flex-1 overflow-hidden">
              <motion.div
                animate={{
                  x: [0, -100],
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="flex items-center gap-2"
              >
                <span className="text-white text-sm font-medium whitespace-nowrap">
                  Original Audio
                </span>
                <span className="text-gray-400 text-xs whitespace-nowrap">
                  • user_gallery
                </span>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
