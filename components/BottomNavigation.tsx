import React from "react";
import { motion } from "framer-motion";
import { Store, FileText, Briefcase } from "lucide-react";

export type BottomNavTab = "marketplace" | "my-requests" | "my-offers";

interface BottomNavigationProps {
  activeTab: BottomNavTab;
  onTabChange: (tab: BottomNavTab) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
}) => {
  const tabs = [
    { id: "marketplace" as BottomNavTab, label: "سوق الطلبات", icon: Store },
    { id: "my-requests" as BottomNavTab, label: "طلباتي", icon: FileText },
    { id: "my-offers" as BottomNavTab, label: "عروضي", icon: Briefcase },
  ];

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-50 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-lg safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <motion.button
              key={tab.id}
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(10);
                onTabChange(tab.id);
              }}
              className={`relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300 ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground/50 hover:text-foreground/80"
              }`}
              whileTap={{ scale: 0.94 }}
            >
              {/* Subtle Active Background */}
              {isActive && (
                <motion.div
                  layoutId="activeGlow"
                  className="absolute inset-x-2 inset-y-2 bg-primary/5 rounded-xl -z-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}

              <motion.div
                animate={{
                  y: isActive ? -1 : 0,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="relative flex items-center justify-center"
              >
                <Icon 
                  size={20} 
                  strokeWidth={isActive ? 2.2 : 1.5}
                  className="transition-all duration-300"
                />
              </motion.div>

              <span 
                className={`relative text-[10px] font-medium tracking-tight transition-all duration-300 ${
                  isActive ? "opacity-100 scale-100" : "opacity-80 scale-95"
                }`}
              >
                {tab.label}
              </span>

              {/* Minimalist Dot Indicator with Wave Effect */}
              {isActive && (
                <>
                  {/* Wave/Ripple Effect */}
                  <motion.div
                    className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary/50"
                    initial={{ scale: 1, opacity: 0.8 }}
                    animate={{ 
                      scale: [1, 3, 4],
                      opacity: [0.6, 0.2, 0],
                    }}
                    transition={{ 
                      duration: 0.8, 
                      ease: "easeOut",
                    }}
                    key={activeTab} // Re-trigger on tab change
                  />
                  <motion.div
                    className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary/30"
                    initial={{ scale: 1, opacity: 0.6 }}
                    animate={{ 
                      scale: [1, 2.5, 3.5],
                      opacity: [0.5, 0.15, 0],
                    }}
                    transition={{ 
                      duration: 0.6, 
                      ease: "easeOut",
                      delay: 0.1,
                    }}
                    key={`${activeTab}-wave2`}
                  />
                  {/* Main Dot */}
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary shadow-[0_0_8px_rgba(30,150,140,0.6)]"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </>
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

