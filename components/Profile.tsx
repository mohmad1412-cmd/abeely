import React, { useState, useRef, useEffect } from 'react';
import { Review } from '../types';
import { Badge } from './ui/Badge';
import { Calendar, Edit2, X, Check, Camera, User } from 'lucide-react';
import { UnifiedHeader } from './ui/UnifiedHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadAvatar } from '../services/storageService';

interface ProfileProps {
  userReviews: Review[];
  userRating: number;
  profileRole: 'requester' | 'provider';
  // Unified Header Props
  mode: 'requests' | 'offers';
  toggleMode: () => void;
  isModeSwitching: boolean;
  unreadCount: number;
  hasUnreadMessages: boolean;
  user: any;
  onUpdateProfile?: (updates: any) => Promise<void>;
  setView: (view: any) => void;
  setPreviousView: (view: any) => void;
  titleKey: number;
  notifications: any[];
  onMarkAsRead: (id: string) => void;
  onNotificationClick?: (notification: any) => void;
  onClearAll: () => void;
  onSignOut: () => void;
  onBack: () => void;
  isGuest?: boolean;
  onNavigateToProfile?: () => void;
  onNavigateToSettings?: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ 
  userReviews, 
  userRating,
  profileRole,
  mode,
  toggleMode,
  isModeSwitching,
  unreadCount,
  hasUnreadMessages,
  user,
  onUpdateProfile,
  setView,
  setPreviousView,
  titleKey,
  notifications,
  onMarkAsRead,
  onNotificationClick,
  onClearAll,
  onSignOut,
  onBack,
  isGuest = false,
  onNavigateToProfile,
  onNavigateToSettings,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState((user as any)?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync displayName and bio with user data when user changes
  useEffect(() => {
    setDisplayName(user?.display_name || '');
    setBio((user as any)?.bio || '');
    setAvatarUrl(user?.avatar_url || '');
  }, [user]);

  const handleSaveName = async () => {
    if (onUpdateProfile && displayName.trim()) {
      try {
        await onUpdateProfile({ display_name: displayName.trim() });
        // انتظر قليلاً للتأكد من تحديث user state
        await new Promise(resolve => setTimeout(resolve, 100));
        setIsEditingName(false);
      } catch (error) {
        console.error('خطأ في حفظ الاسم:', error);
        alert('حدث خطأ أثناء حفظ الاسم. يرجى المحاولة مرة أخرى.');
      }
    } else {
      setIsEditingName(false);
    }
  };

  const handleSaveBio = async () => {
    if (onUpdateProfile) {
      const trimmedBio = bio.trim();
      await onUpdateProfile({ bio: trimmedBio.length ? trimmedBio : null });
    }
    setIsEditingBio(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // حفظ الملف للرفع لاحقاً
      setSelectedAvatarFile(file);
      // معاينة الصورة
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAvatar = async () => {
    if (avatarPreview && selectedAvatarFile && onUpdateProfile && user?.id) {
      setIsUploadingAvatar(true);
      try {
        // رفع الصورة إلى Supabase Storage
        const uploadedUrl = await uploadAvatar(selectedAvatarFile, user.id, avatarUrl);
        
        if (uploadedUrl) {
          // حفظ URL في قاعدة البيانات
          await onUpdateProfile({ avatar_url: uploadedUrl });
          
          // تحديث الـ state المحلي بعد الحفظ الناجح
          setAvatarUrl(uploadedUrl);
          setAvatarPreview(null);
          setSelectedAvatarFile(null);
          // إعادة تعيين input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } else {
          console.error('فشل رفع الصورة');
        }
      } catch (error) {
        console.error('خطأ في حفظ الصورة:', error);
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  };

  const handleCancelAvatar = () => {
    setAvatarPreview(null);
    setSelectedAvatarFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Unified Header */}
      <UnifiedHeader
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
        onNotificationClick={onNotificationClick}
        onClearAll={onClearAll}
        onSignOut={onSignOut}
        onGoToMarketplace={onBack}
        title="الملف الشخصي"
        currentView="profile"
        hideModeToggle={true}
        isGuest={isGuest}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToSettings={onNavigateToSettings}
      />

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="container mx-auto max-w-4xl p-4 md:p-8">
          {/* Header Profile Card */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-8 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-l from-primary/10 to-transparent -z-0 rounded-t-xl"></div>
            
            <div className="relative w-24 h-24 md:w-32 md:h-32 shrink-0 z-10 group">
              <div className="w-full h-full rounded-full bg-secondary overflow-hidden border-4 border-background shadow-md">
                {avatarPreview || avatarUrl ? (
                  <img 
                    src={avatarPreview || avatarUrl} 
                    alt="User" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
                    <User size={avatarUrl ? 40 : 32} className="text-primary/40" />
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              {avatarPreview ? (
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 rounded-full">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleSaveAvatar}
                    disabled={isUploadingAvatar}
                    className="p-2 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="حفظ"
                  >
                    {isUploadingAvatar ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Check size={18} />
                    )}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleCancelAvatar}
                    disabled={isUploadingAvatar}
                    className="p-2 rounded-full bg-secondary text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="إلغاء"
                  >
                    <X size={18} />
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAvatarClick}
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-colors"
                  title="تعديل الصورة"
                >
                  <Camera size={16} />
                </motion.button>
              )}
            </div>
            
            <div className="flex-1 text-center md:text-right z-10 w-full">
              <div className="flex flex-col md:flex-row items-center md:items-start justify-between mb-2">
                <div className="flex-1 w-full">
                  {/* Name with Edit */}
                  <div className="w-full mb-2">
                    {isEditingName ? (
                      <div className="flex flex-col gap-2 w-full">
                        <div className="relative">
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => {
                              if (e.target.value.length <= 60) {
                                setDisplayName(e.target.value);
                              }
                            }}
                            maxLength={60}
                            className="w-full text-2xl font-bold bg-background border border-border rounded-lg px-3 py-2 pr-20 focus:outline-none focus:border-primary"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveName();
                              } else if (e.key === 'Escape') {
                                setIsEditingName(false);
                                setDisplayName(user?.display_name || '');
                              }
                            }}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                            <span className={displayName.length >= 50 ? 'text-orange-500 font-medium' : ''}>
                              {displayName.length}
                            </span>
                            <span className="text-muted-foreground"> / 60</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleSaveName}
                            className="px-4 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2"
                          >
                            <Check size={16} />
                            حفظ
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setIsEditingName(false);
                              setDisplayName(user?.display_name || '');
                            }}
                            className="px-4 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium flex items-center gap-2"
                          >
                            <X size={16} />
                            إلغاء
                          </motion.button>
                        </div>
                      </div>
                    ) : (
                      displayName.trim() === '' ? (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setIsEditingName(true)}
                          className="w-full text-center md:text-right py-3 px-4 rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-secondary/20 hover:bg-secondary/40 transition-all text-muted-foreground hover:text-primary"
                        >
                          <div className="flex items-center justify-center md:justify-start gap-2">
                            <Edit2 size={18} />
                            <span className="text-sm font-medium">أضف اسمك</span>
                          </div>
                        </motion.button>
                      ) : (
                        <div className="flex items-start justify-center md:justify-start gap-2 w-full">
                          <h1 className="text-2xl font-bold flex-1 break-words overflow-wrap-anywhere min-w-0">{displayName}</h1>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIsEditingName(true)}
                            className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-primary shrink-0 mt-1"
                            title="تعديل الاسم"
                          >
                            <Edit2 size={18} />
                          </motion.button>
                        </div>
                      )
                    )}
                  </div>
                  
                  {user?.created_at && (
                    <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                      <Badge variant="outline">
                        <Calendar size={12} className="ml-1"/>
                        عضو منذ {new Date(user.created_at).getFullYear()}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Bio with Edit */}
              <div className="relative">
                {isEditingBio ? (
                  <div className="flex flex-col gap-2 w-full">
                    <div className="relative">
                      <textarea
                        value={bio}
                        onChange={(e) => {
                          if (e.target.value.length <= 200) {
                            setBio(e.target.value);
                          }
                        }}
                        rows={4}
                        maxLength={200}
                        className="w-full text-sm leading-relaxed bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary resize-none"
                        autoFocus
                      />
                      <div className="absolute bottom-2 left-3 text-xs text-muted-foreground">
                        <span className={bio.length >= 180 ? 'text-orange-500 font-medium' : ''}>
                          {bio.length}
                        </span>
                        <span className="text-muted-foreground"> / 200</span>
                      </div>
                    </div>
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
                          setBio((user as any)?.bio || '');
                        }}
                        className="px-4 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <X size={16} />
                        إلغاء
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  bio.trim() === '' ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsEditingBio(true)}
                      className="w-full text-center md:text-right py-3 px-4 rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-secondary/20 hover:bg-secondary/40 transition-all text-muted-foreground hover:text-primary"
                    >
                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <Edit2 size={18} />
                        <span className="text-sm font-medium">أضف تعريف بنفسك</span>
                      </div>
                    </motion.button>
                  ) : (
                    <div className="flex items-start justify-center md:justify-start gap-3 w-full">
                      <p className="text-sm leading-relaxed text-muted-foreground flex-1 pr-0">
                        {bio}
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsEditingBio(true)}
                        className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-primary shrink-0 mt-0.5"
                        title="تعديل التعريف"
                      >
                        <Edit2 size={16} />
                      </motion.button>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
