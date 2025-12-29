import React, { useState } from 'react';
import { Review } from '../types';
import { Badge } from './ui/Badge';
import { Calendar, Briefcase, Award, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { UnifiedHeader } from './ui/UnifiedHeader';

interface ProfileProps {
  userReviews: Review[];
  userRating: number;
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
  const [profileRole, setProfileRole] = useState<'requester' | 'provider'>('provider');

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
          {/* Role Switcher */}
          <div className="flex justify-end mb-4">
            <div className="bg-secondary p-1 rounded-lg inline-flex items-center">
               <button 
                 onClick={() => setProfileRole('requester')}
                 className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${profileRole === 'requester' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
               >
                 كمنشئ طلبات
               </button>
               <button 
                 onClick={() => setProfileRole('provider')}
                 className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${profileRole === 'provider' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
               >
                 كمقدم عروض
               </button>
            </div>
          </div>

          {/* Header Profile Card */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-8 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-l from-primary/10 to-transparent -z-0"></div>
            
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-secondary overflow-hidden border-4 border-background shadow-md shrink-0 z-10">
              <img src="https://picsum.photos/200/200" alt="User" className="w-full h-full object-cover" />
            </div>
            
            <div className="flex-1 text-center md:text-right z-10">
              <div className="flex flex-col md:flex-row items-center md:items-start justify-between mb-2">
                <div>
                  <h1 className="text-2xl font-bold mb-1">خالد عبد الله</h1>
                  <p className="text-muted-foreground mb-2 font-medium">
                    {profileRole === 'requester' ? 'صاحب مشاريع ورائد أعمال' : 'مطور ويب وخبير تقني شامل'}
                  </p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                    <Badge variant="outline"><Calendar size={12} className="ml-1"/> عضو منذ 2023</Badge>
                    {profileRole === 'provider' && <Badge variant="success"><CheckCircle size={12} className="ml-1"/> هوية موثقة</Badge>}
                  </div>
                </div>
              </div>
              
              <p className="text-sm leading-relaxed max-w-2xl mx-auto md:mx-0 text-muted-foreground">
                 {profileRole === 'provider' 
                  ? 'مهتم ببناء الحلول الرقمية المبتكرة. لدي خبرة واسعة في إدارة المشاريع التقنية والتعامل مع فرق العمل عن بعد. أسعى دائماً للجودة والاحترافية في العمل.'
                  : 'أبحث دائماً عن محترفين لتنفيذ مشاريعي التقنية بدقة وجودة عالية. أقدر الالتزام بالوقت والتواصل الفعال.'}
              </p>
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
