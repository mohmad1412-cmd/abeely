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
              className={`relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              whileTap={{ scale: 0.95 }}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="relative text-xs font-bold">
                {tab.label}
                {/* Centered underline indicator */}
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute -bottom-1.5 left-0 right-0 mx-auto h-[3px] rounded-full"
                    style={{ 
                      width: "70%",
                      background: "linear-gradient(90deg, #1E968C 0%, #2db5a9 50%, #1E968C 100%)"
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

