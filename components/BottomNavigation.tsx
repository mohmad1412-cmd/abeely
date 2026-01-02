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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border shadow-lg safe-area-bottom">
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
              {/* Subtle Active Background - no layoutId for instant switching */}
              <div
                className={`absolute inset-x-2 inset-y-2 rounded-xl -z-10 transition-opacity duration-150 ${
                  isActive ? "bg-primary/5 opacity-100" : "opacity-0"
                }`}
              />

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

              {/* Minimalist Dot Indicator - CSS transition for instant switching */}
              <div
                className={`absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary shadow-[0_0_8px_rgba(30,150,140,0.6)] transition-all duration-150 ${
                  isActive ? "opacity-100 scale-100" : "opacity-0 scale-0"
                }`}
              />
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

