import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ImageViewerModalProps {
  images: string[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  images,
  initialIndex,
  isOpen,
  onClose,
}) => {
  const [index, setIndex] = useState(initialIndex);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const nextImage = () => {
    if (index < images.length - 1) setIndex(index + 1);
  };

  const prevImage = () => {
    if (index > 0) setIndex(index - 1);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 50;
    const velocityThreshold = 500;

    // Swipe left (next)
    if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
      if (index < images.length - 1) {
        setIndex(index + 1);
      }
    } // Swipe right (prev)
    else if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
      if (index > 0) {
        setIndex(index - 1);
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") nextImage(); // RTL context? usually ArrowRight is next, but in RTL ArrowLeft might be "next" visually. Let's stick to logical next/prev.
      // In RTL (Arabic), the "next" image (index + 1) is usually to the LEFT.
      // The slider translates x to negative values (moving left).
      // So visually: [0][1][2]. To see [1], we move window right (content left).
      // So "Next" is sliding content to the Left.
      // ArrowLeft should trigger Next?
      // Let's make it standard: ArrowRight -> Next (index+1), ArrowLeft -> Prev (index-1) regardless of visual for now, or match standard gallery.
      // Actually usually ArrowLeft goes back, ArrowRight goes forward.
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "Escape") onClose();
    };
    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, index]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center backdrop-blur-xl"
          onClick={onClose}
        >
          {/* Header Controls */}
          <div className="absolute top-0 left-0 w-full h-20 flex items-center justify-between px-6 z-20 pointer-events-none bg-gradient-to-b from-black/50 to-transparent">
            <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-sm font-bold pointer-events-auto border border-white/10">
              {index + 1} / {images.length}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white flex items-center justify-center transition-all pointer-events-auto border border-white/10"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Arrows (Desktop) */}
          <div
            className="absolute inset-x-6 top-1/2 -translate-y-1/2 justify-between pointer-events-none z-10 hidden md:flex"
            dir="rtl"
          >
            {
              /* Note: In RTL context, Next (Left visually) depends on implementation.
                 But here we just put buttons on Left and Right.
                 Right button -> ?
                 Left button -> ?
                 Let's place them physically.
                 Right Button:
              */
            }
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              disabled={index === images.length - 1} // End of list
              className={`w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all pointer-events-auto border border-white/10 ${
                index === images.length - 1
                  ? "opacity-0 cursor-default"
                  : "hover:scale-105 active:scale-95"
              }`}
            >
              <ChevronRight size={24} />
              {
                /* In standard Carousel, Right chevron usually means "Go Right" (Next).
                  But in Arabic RTL, Next is usually to the Left?
                  Wait. [1] [2] [3]. 1 is displayed. To see 2, we slide 2 in from the Left? No, usually from Right in LTR.
                  In RTL apps, list starts at Right. [1][2][3]. Window is at [1]. Slide window Left to see [2].
                  So [2] comes from Left.
                  So Left Chevron should be "Next".
                  Let's check the slider direction.
                  x: -index * 100%. -100% moves content to the Left.
                  So Next Image appears from right side in LTR.
                  In RTL? `dir="rtl"` on parent?
                  If we don't set dir="rtl" on the track, it behaves LTR.
                  Let's assume standard LTR mechanics for the carousel track to avoid confusion, but localized arrows if needed.
                  But user is Arabic.
                  Let's stick to standard mechanics: Right Arrow -> Next Index. Left Arrow -> Prev Index.
              */
              }
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              disabled={index === 0}
              className={`w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all pointer-events-auto border border-white/10 ${
                index === 0
                  ? "opacity-0 cursor-default"
                  : "hover:scale-105 active:scale-95"
              }`}
            >
              <ChevronLeft size={24} />
            </button>
          </div>

          {/* Slider Container */}
          <div
            ref={containerRef}
            className="w-full h-full flex items-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            dir="ltr"
          >
            <motion.div
              className="flex h-full"
              initial={false}
              animate={{ x: `-${index * 100}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              onDragEnd={handleDragEnd}
              style={{ width: `${images.length * 100}%` }}
            >
              {images.map((src, i) => (
                <div
                  key={i}
                  className="h-full flex items-center justify-center relative"
                  style={{ width: `${100 / images.length}%` }} // Correct width calculation
                >
                  <img
                    src={src}
                    alt={`View ${i + 1}`}
                    className="max-w-full max-h-full w-auto h-auto object-contain select-none pointer-events-none drop-shadow-2xl"
                    draggable={false}
                  />
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
