import React, { useState } from 'react';
import { Review } from '../types';
import { Badge } from './ui/Badge';
import { Calendar, Briefcase, Award, CheckCircle, Clock, DollarSign, Edit2, X, Check } from 'lucide-react';
import { UnifiedHeader } from './ui/UnifiedHeader';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileProps {
  userReviews: Review[];
  userRating: number;
  profileRole: 'requester' | 'provider';
  // Unified Header Props
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  mode: 'requests' | 'offers';
  toggleMode: () => void;
  isModeSwitching: boolean;
  unreadCount: number;
  hasUnreadMessages: boolean;
  user: any;
  setView: (view: any) => void;
  setPreviousView: (view: any) => void;
  titleKey: number;
  notifications: any[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onSignOut: () => void;
  onBack: () => void;
  isGuest?: boolean;
}

export const Profile: React.FC<ProfileProps> = ({ 
  userReviews, 
  userRating,
  profileRole,
  isSidebarOpen,
  setIsSidebarOpen,
  mode,
  toggleMode,
  isModeSwitching,
  unreadCount,
  hasUnreadMessages,
  user,
  setView,
  setPreviousView,
  titleKey,
  notifications,
  onMarkAsRead,
  onClearAll,
  onSignOut,
  onBack,
  isGuest = false,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [displayName, setDisplayName] = useState('خالد عبد الله');
  const [bio, setBio] = useState(profileRole === 'provider' 
    ? 'مهتم ببناء الحلول الرقمية المبتكرة. لدي خبرة واسعة في إدارة المشاريع التقنية والتعامل مع فرق العمل عن بعد. أسعى دائماً للجودة والاحترافية في العمل.'
    : 'أبحث دائماً عن محترفين لتنفيذ مشاريعي التقنية بدقة وجودة عالية. أقدر الالتزام بالوقت والتواصل الفعال.');

  const handleSaveName = () => {
    // هنا يمكن إضافة حفظ الاسم في قاعدة البيانات
    setIsEditingName(false);
  };

  const handleSaveBio = () => {
    // هنا يمكن إضافة حفظ التعريف في قاعدة البيانات
    setIsEditingBio(false);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Unified Header */}
      <UnifiedHeader
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        mode={mode}
        toggleMode={toggleMode}
        isModeSwitching={isModeSwitching}
        unreadCount={unreadCount}
        hasUnreadMessages={hasUnreadMessages}
        user={user}
        setView={setView}
        setPreviousView={setPreviousView}
        titleKey={titleKey}
        notifications={notifications}
        onMarkAsRead={onMarkAsRead}
        onClearAll={onClearAll}
        onSignOut={onSignOut}
        showSidebarButton={true}
        title="الملف الشخصي"
        currentView="profile"
        hideModeToggle={true}
        isGuest={isGuest}
      />

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="container mx-auto max-w-4xl p-4 md:p-8">
          {/* Header Profile Card */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-8 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-l from-primary/10 to-transparent -z-0"></div>
            
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-secondary overflow-hidden border-4 border-background shadow-md shrink-0 z-10">
              <img src="https://picsum.photos/200/200" alt="User" className="w-full h-full object-cover" />
            </div>
            
            <div className="flex-1 text-center md:text-right z-10">
              <div className="flex flex-col md:flex-row items-center md:items-start justify-between mb-2">
                <div className="flex-1">
                  {/* Name with Edit */}
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                    {isEditingName ? (
                      <div className="flex items-center gap-2 flex-1 max-w-md">
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="flex-1 text-2xl font-bold bg-background border border-border rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
                          autoFocus
                        />
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={handleSaveName}
                          className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
                        >
                          <Check size={18} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            setIsEditingName(false);
                            setDisplayName('خالد عبد الله');
                          }}
                          className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                        >
                          <X size={18} />
                        </motion.button>
                      </div>
                    ) : (
                      <>
                        <h1 className="text-2xl font-bold">{displayName}</h1>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setIsEditingName(true)}
                          className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-primary"
                          title="تعديل الاسم"
                        >
                          <Edit2 size={18} />
                        </motion.button>
                      </>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                    <Badge variant="outline"><Calendar size={12} className="ml-1"/> عضو منذ 2023</Badge>
                    {profileRole === 'provider' && <Badge variant="success"><CheckCircle size={12} className="ml-1"/> هوية موثقة</Badge>}
                  </div>
                </div>
              </div>
              
              {/* Bio with Edit */}
              <div className="relative">
                {isEditingBio ? (
                  <div className="flex flex-col gap-2 max-w-2xl mx-auto md:mx-0">
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                      className="w-full text-sm leading-relaxed bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSaveBio}
                        className="px-4 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <Check size={16} />
                        حفظ
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setIsEditingBio(false);
                          setBio(profileRole === 'provider' 
                            ? 'مهتم ببناء الحلول الرقمية المبتكرة. لدي خبرة واسعة في إدارة المشاريع التقنية والتعامل مع فرق العمل عن بعد. أسعى دائماً للجودة والاحترافية في العمل.'
                            : 'أبحث دائماً عن محترفين لتنفيذ مشاريعي التقنية بدقة وجودة عالية. أقدر الالتزام بالوقت والتواصل الفعال.');
                        }}
                        className="px-4 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <X size={16} />
                        إلغاء
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <div className="relative group">
                    <p className="text-sm leading-relaxed max-w-2xl mx-auto md:mx-0 text-muted-foreground">
                      {bio}
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setIsEditingBio(true)}
                      className="absolute top-0 left-0 p-1.5 rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100"
                      title="تعديل التعريف"
                    >
                      <Edit2 size={16} />
                    </motion.button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats Grid - Changes based on Role */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-card p-4 rounded-xl border border-border text-center hover:border-primary/50 transition-colors">
              <Briefcase className="mx-auto mb-2 text-primary" />
              <div className="font-bold text-xl">{profileRole === 'provider' ? '15' : '8'}</div>
              <div className="text-xs text-muted-foreground">{profileRole === 'provider' ? 'مشاريع منفذة' : 'طلبات مكتملة'}</div>
            </div>
            <div className="bg-card p-4 rounded-xl border border-border text-center hover:border-primary/50 transition-colors">
              <Award className="mx-auto mb-2 text-yellow-500" />
              <div className="font-bold text-xl">98%</div>
              <div className="text-xs text-muted-foreground">{profileRole === 'provider' ? 'نسبة إكمال' : 'معدل التوظيف'}</div>
            </div>
            <div className="bg-card p-4 rounded-xl border border-border text-center hover:border-primary/50 transition-colors">
              <Clock className="mx-auto mb-2 text-blue-500" />
              <div className="font-bold text-xl">سريع</div>
              <div className="text-xs text-muted-foreground">{profileRole === 'provider' ? 'سرعة الرد' : 'سرعة الدفع'}</div>
            </div>
            <div className="bg-card p-4 rounded-xl border border-border text-center hover:border-primary/50 transition-colors">
              <DollarSign className="mx-auto mb-2 text-green-500" />
              <div className="font-bold text-xl">50k+</div>
              <div className="text-xs text-muted-foreground">قيمة التعاملات</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
