import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Sparkles } from "lucide-react";

interface GlobalAIOrbProps {
  currentView: string;
  onNavigate: () => void;
}

export const GlobalAIOrb: React.FC<GlobalAIOrbProps> = ({
  currentView,
  onNavigate,
}) => {
  // Hide if we are in create-request view (as CreateRequestV2 has its own orb)
  if (currentView === "create-request") return null;

  const BUBBLE_SIZE = 60;
  // Use explicit coordinates for initial positioning
  // Using percentages or "bottom-4 right-4" classes is safer for responsiveness
  // But to match CreateRequestV2 exactly, we might want to mirror its logic.
  // CreateRequestV2 logic: x: 20, y: window.innerHeight - 150.
  // We'll use fixed positioning at bottom-right (RTL) or bottom-left.
  
  return (
    <div className="fixed bottom-8 left-6 z-50 pointer-events-auto">
      <motion.button
        onClick={onNavigate}
        className="relative flex items-center justify-center group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {/* Soft Animated Halo - Like a real glowing ball */}
        <>
          {/* Ground Shadow */}
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 w-10 h-2 bg-black/15 rounded-full blur-sm"
            style={{ bottom: -8 }}
            animate={{
              scale: [1, 0.9, 1],
              opacity: [0.2, 0.15, 0.2],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Soft Outer Halo - Breathing Effect */}
          <motion.div
            className="absolute -inset-4 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(30,150,140,0.25) 0%, rgba(30,150,140,0.1) 40%, transparent 70%)",
              filter: "blur(8px)",
            }}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.6, 0.8, 0.6],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Inner Halo Ring */}
          <motion.div
            className="absolute -inset-2 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(30,150,140,0.3) 0%, transparent 60%)",
              filter: "blur(4px)",
            }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 0.7, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
          />

          {/* Subtle Shine Arc */}
          <motion.div
            className="absolute top-1 left-1/4 right-1/4 h-3 rounded-full pointer-events-none"
            style={{
              background: "linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)",
              filter: "blur(2px)",
            }}
            animate={{
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </>

        {/* Main Orb Body */}
        <motion.div
          className="relative rounded-full bg-gradient-to-br from-primary via-primary to-teal-600 flex items-center justify-center overflow-hidden"
          style={{
            width: BUBBLE_SIZE,
            height: BUBBLE_SIZE,
            boxShadow: "0 10px 35px rgba(30,150,140,0.45), 0 5px 18px rgba(30,150,140,0.35), inset 0 -2px 6px rgba(0,0,0,0.1), inset 0 2px 6px rgba(255,255,255,0.2)",
          }}
          animate={{
            y: [0, -6, 0],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Inner Glow/Shine Effect */}
          <motion.div
            className="absolute inset-0 rounded-full overflow-hidden"
            initial={false}
          >
            {/* Top shine */}
            <motion.div className="absolute top-1 left-1/4 right-1/4 h-4 bg-gradient-to-b from-white/30 to-transparent rounded-full blur-sm" />
            {/* Animated glow pulse */}
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{
                boxShadow: [
                  "inset 0 0 15px rgba(255,255,255,0.1)",
                  "inset 0 0 25px rgba(255,255,255,0.2)",
                  "inset 0 0 15px rgba(255,255,255,0.1)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>

          {/* Plus Icon with Rotation */}
          <motion.div
            className="text-white z-10"
            initial={{ rotate: 0 }}
            whileHover={{ rotate: 90 }}
            transition={{ duration: 0.3 }}
          >
            <Plus size={32} strokeWidth={2.5} className="drop-shadow-md" />
          </motion.div>
        </motion.div>
      </motion.button>
    </div>
  );
};

