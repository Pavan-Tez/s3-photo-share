import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useMotionTemplate, useMotionValue } from "framer-motion";

const PREFIX = "beachphotos/";

// --- ANIMATION VARIANTS ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10, filter: "blur(5px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 50, damping: 15 },
  },
};

export default function Home() {
  const [files, setFiles] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [bgImage, setBgImage] = useState(null);

  // --- MOUSE SPOTLIGHT LOGIC ---
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const encodedPrefix = useMemo(() => encodeURIComponent(PREFIX), []);

  useEffect(() => {
    const abortController = new AbortController();

    fetch(`/api/images?prefix=${encodedPrefix}`, {
      signal: abortController.signal,
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!abortController.signal.aborted) {
          const fileList = Array.isArray(data) ? data : [];
          setFiles(fileList);
          if (fileList.length > 0) {
            const random = fileList[Math.floor(Math.random() * fileList.length)];
            setBgImage(random.url);
          }
        }
      })
      .catch(() => setFiles([]));

    return () => abortController.abort();
  }, [encodedPrefix]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#000000] text-white flex items-center justify-center font-sans antialiased selection:bg-white/30">
      
      {/* --- LAYER 1: CINEMATIC BACKGROUND --- */}
      <div className="absolute inset-0 z-0">
         {/* Deep Aurora Gradient */}
        <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_farthest-corner_at_50%_50%,_rgba(30,30,30,1)_0%,_rgba(0,0,0,1)_100%)]" />
        
        {/* Dynamic Image Layer (Heavily muted) */}
        <AnimatePresence>
          {bgImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.2 }} // Low opacity for subtlety
              transition={{ duration: 2.5 }}
              className="absolute inset-0 bg-cover bg-center blur-[80px] saturate-0 brightness-75 scale-110"
              style={{ backgroundImage: `url(${bgImage})` }}
            />
          )}
        </AnimatePresence>

        {/* Film Grain (Adds texture/removes banding) */}
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
      </div>

      {/* --- LAYER 2: THE CARD (With Spotlight) --- */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-lg mx-6 group"
        onMouseMove={handleMouseMove}
      >
        {/* Spotlight Effect Border */}
        <motion.div
          className="absolute -inset-px rounded-[34px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: useMotionTemplate`
              radial-gradient(
                650px circle at ${mouseX}px ${mouseY}px,
                rgba(255, 255, 255, 0.15),
                transparent 80%
              )
            `,
          }}
        />

        {/* Main Glass Content */}
        <div className="relative overflow-hidden rounded-[32px] bg-[#0a0a0a]/60 backdrop-blur-2xl border border-white/[0.08] shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] p-12">
          
          {/* HEADER */}
          <motion.div variants={itemVariants} className="text-center mb-12">
            <h1 className="text-5xl font-bold tracking-tight mb-3 text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/50">
              Collection
            </h1>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.3em] pl-1">
              Private Archives
            </p>
          </motion.div>

          {/* STATUS PILL */}
          <motion.div variants={itemVariants} className="flex justify-center mb-14">
            <div className="relative group/pill">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-white/10 to-white/0 rounded-full blur opacity-50 group-hover/pill:opacity-75 transition duration-500"></div>
                <div className="relative px-5 py-2 rounded-full bg-black/40 border border-white/10 backdrop-blur-md flex items-center gap-3">
                    <span className="relative flex h-2 w-2">
                        {files.length > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${files.length > 0 ? 'bg-emerald-500' : 'bg-gray-500'}`}></span>
                    </span>
                    <span className="text-xs font-medium text-gray-300 tracking-wide">
                        {files.length > 0 ? `${files.length} Photos Synced` : "Connecting..."}
                    </span>
                </div>
            </div>
          </motion.div>

          {/* PRIMARY ACTIONS */}
          <div className="flex flex-col gap-4">
            
            {/* Enter Gallery (Magnetic & Shiny) */}
            <motion.div variants={itemVariants}>
              <Link href={`/gallery?prefix=${PREFIX}`} className="block">
                <motion.button
                  whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,1)" }}
                  whileTap={{ scale: 0.98 }}
                  className="relative w-full py-5 rounded-2xl bg-[#ffffff] text-black font-bold text-[17px] tracking-tight overflow-hidden transition-colors"
                >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        View Gallery
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                    </span>
                </motion.button>
              </Link>
            </motion.div>

            {/* Download Action (Subtle) */}
            <motion.div variants={itemVariants}>
                <motion.a
                href="/api/download-zip"
                onClick={() => setDownloading(true)}
                whileHover={{ scale: 1.01, backgroundColor: "rgba(255,255,255,0.05)" }}
                whileTap={{ scale: 0.98 }}
                className="group w-full py-4 rounded-2xl border border-white/5 text-gray-400 hover:text-white flex items-center justify-center gap-2 transition-all"
                >
                {downloading ? (
                    <>
                    <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-sm">Preparing...</span>
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        <span className="text-sm font-medium">Download ZIP</span>
                    </>
                )}
                </motion.a>
            </motion.div>
          </div>

          {/* FOOTER (Barely visible until needed) */}
          <motion.div variants={itemVariants} className="mt-12 flex justify-center">
            <Link href="/convertLocalThumbs">
                <button className="text-[10px] text-gray-800 hover:text-gray-500 transition-colors uppercase tracking-widest font-semibold">
                    Admin Tools
                </button>
            </Link>
          </motion.div>

        </div>
        
        {/* Security Badge Below Card */}
        <motion.div variants={itemVariants} className="mt-8 flex justify-center items-center gap-2 opacity-40">
            <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest">End-to-End Encrypted</span>
        </motion.div>

      </motion.div>
    </div>
  );
}