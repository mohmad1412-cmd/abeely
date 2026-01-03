import React from "react";
import { motion, LayoutGroup } from "framer-motion";
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
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-2">
        <LayoutGroup id="bottom-nav">
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
                className="relative flex flex-col items-center justify-center flex-1 h-full gap-1.5"
                whileTap={{ scale: 0.94 }}
              >
                {/* Icon - Green when active */}
                <motion.div
                  animate={{
                    y: isActive ? -1 : 0,
                    scale: isActive ? 1.05 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={`relative flex items-center justify-center transition-colors duration-300 ${
                    isActive ? "text-primary" : "text-muted-foreground/50"
                  }`}
                >
                  <Icon 
                    size={20} 
                    strokeWidth={isActive ? 2.2 : 1.5}
                    className="transition-all duration-300"
                  />
                </motion.div>

                {/* Label - with animated pill background */}
                <div className="relative">
                  {/* Animated pill background */}
                  {isActive && (
                    <motion.div
                      layoutId="bottom-nav-pill"
                      className="absolute inset-0 bg-primary rounded-full"
                      transition={{ 
                        type: "spring", 
                        stiffness: 400, 
                        damping: 30,
                        mass: 0.8
                      }}
                    />
                  )}
                  <span 
                    className={`relative z-10 block text-[10px] font-bold tracking-tight px-2.5 py-0.5 rounded-full transition-colors duration-300 ${
                      isActive 
                        ? "text-white" 
                        : "text-muted-foreground/60"
                    }`}
                  >
                    {tab.label}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </LayoutGroup>
      </div>
    </nav>
  );
};

