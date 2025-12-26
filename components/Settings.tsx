import React, { useState } from 'react';
import { Moon, Sun, ArrowLeftRight, ArrowRight, Bell, MapPin, User, Languages, ChevronLeft, X, ChevronDown, Plus, Filter, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AVAILABLE_CATEGORIES } from '../data';
import { UserPreferences } from '../types';
import { UserProfile } from '../services/authService';

interface SettingsProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  onBack?: () => void;
  userPreferences?: UserPreferences;
  onUpdatePreferences?: (prefs: UserPreferences) => void;
  user?: UserProfile | null;
  onSignOut?: () => void;
}

const CITIES = [
  "الرياض", "جدة", "الدمام", "مكة", "المدينة", "الخبر", "أبها", "الطائف", "تبوك", "القصيم",
  "بريدة", "خميس مشيط", "الهفوف", "المبرز", "حفر الباطن", "حائل", "نجران", "الجبيل", "القطيف", "ينبع",
  "الخرج", "الثقبة", "ينبع البحر", "عرعر", "الحوية", "عنيزة", "سكاكا", "جيزان", "القريات", "الظهران",
  "الباحة", "الزلفي", "الرس", "وادي الدواسر", "بيشة", "القنفذة", "رابغ", "عفيف", "الليث"
];

export const Settings: React.FC<SettingsProps> = ({ 
  isDarkMode, 
  toggleTheme, 
  onBack,
  userPreferences = {
    interestedCategories: [],
    interestedCities: [],
    notifyOnInterest: true,
    roleMode: 'requester'
  },
  onUpdatePreferences,
  user = null,
  onSignOut
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editedName, setEditedName] = useState(user?.display_name || "");
  const [editedEmail, setEditedEmail] = useState(user?.email || "");
  const [editedPhone, setEditedPhone] = useState(user?.phone || "");
  
  // Initialize edited values when user changes
  React.useEffect(() => {
    setEditedName(user?.display_name || "");
    setEditedEmail(user?.email || "");
    setEditedPhone(user?.phone || "");
  }, [user]);
  const [notifyOnInterest, setNotifyOnInterest] = useState(userPreferences.notifyOnInterest);
  const [notifyOnOffers, setNotifyOnOffers] = useState(true);
  const [notifyOnMessages, setNotifyOnMessages] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(userPreferences.interestedCategories);
  const [selectedCities, setSelectedCities] = useState<string[]>(userPreferences.interestedCities);
  const [selectedRadarWords, setSelectedRadarWords] = useState<string[]>([]);
  const [isManageInterestsOpen, setIsManageInterestsOpen] = useState(false);
  const [tempCategories, setTempCategories] = useState<string[]>(selectedCategories);
  const [tempCities, setTempCities] = useState<string[]>(selectedCities);
  const [tempRadarWords, setTempRadarWords] = useState<string[]>([]);
  const [citySearch, setCitySearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [isCitiesExpanded, setIsCitiesExpanded] = useState(false);
  const [isRadarWordsExpanded, setIsRadarWordsExpanded] = useState(false);
  const [newRadarWord, setNewRadarWord] = useState("");
  const [isInterestsPreviewExpanded, setIsInterestsPreviewExpanded] = useState(false);

  const handleSaveInterests = () => {
    setSelectedCategories(tempCategories);
    setSelectedCities(tempCities);
    setSelectedRadarWords(tempRadarWords);
    if (onUpdatePreferences) {
      onUpdatePreferences({
        ...userPreferences,
        interestedCategories: tempCategories,
        interestedCities: tempCities,
        notifyOnInterest
      });
    }
    setIsManageInterestsOpen(false);
  };

  const toggleCategory = (catId: string) => {
    setTempCategories(prev => 
      prev.includes(catId) 
        ? prev.filter(id => id !== catId)
        : [...prev, catId]
    );
  };

  const toggleCity = (city: string) => {
    setTempCities(prev => 
      prev.includes(city)
        ? prev.filter(c => c !== city)
        : [...prev, city]
    );
  };

  const filteredCities = CITIES.filter(city => 
    city.toLowerCase().includes(citySearch.toLowerCase())
  );

  const filteredCategories = AVAILABLE_CATEGORIES.filter(cat =>
    cat.label.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const addRadarWord = () => {
    const trimmedWord = newRadarWord.trim();
    if (trimmedWord && !tempRadarWords.includes(trimmedWord)) {
      setTempRadarWords([...tempRadarWords, trimmedWord]);
      setNewRadarWord("");
    }
  };

  const removeRadarWord = (word: string) => {
    setTempRadarWords(tempRadarWords.filter(w => w !== word));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto relative">
        {/* Sticky Header - Back Button & Theme Toggle */}
        <div className="sticky top-0 z-50 transition-all duration-300 bg-transparent">
          <div className="flex items-center justify-between px-4 py-3">
            {onBack && (
              <motion.button
                onClick={onBack}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all text-foreground focus:outline-none bg-card/80 backdrop-blur-sm border border-border shadow-lg hover:bg-card"
              >
                <ArrowRight size={22} strokeWidth={2.5} />
              </motion.button>
            )}
            {!onBack && <div />}
            
            {/* Theme Toggle Button */}
            <motion.button 
              onClick={toggleTheme}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 group ${
                isDarkMode 
                  ? 'bg-card/80 backdrop-blur-sm hover:bg-card border-border text-foreground shadow-lg' 
                  : 'bg-card/80 backdrop-blur-sm hover:bg-card border-border text-foreground shadow-lg'
              }`}
            >
              <Sun size={18} className={`transition-all ${isDarkMode ? 'opacity-40' : 'opacity-100 text-orange-500'}`} />
              <ArrowLeftRight 
                size={16} 
                className={`text-muted-foreground group-hover:text-primary transition-all duration-300 ${isDarkMode ? 'rotate-180' : ''}`}
              />
              <Moon size={18} className={`transition-all ${isDarkMode ? 'opacity-100 text-indigo-400' : 'opacity-40'}`} />
            </motion.button>
          </div>
        </div>
        <div className="max-w-2xl mx-auto p-6 mt-8">
      <h2 className="text-2xl font-bold mb-6">الإعدادات</h2>
      
          <div className="space-y-4">
            {/* Account Settings - First */}
            <div className="p-4 bg-secondary/50 rounded-lg border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  <User size={20} />
                </div>
                <h3 className="font-bold text-base">الحساب</h3>
              </div>
              
              <div className="space-y-3">
                {/* Name */}
                <div className="flex items-center justify-between">
                  <div className="flex-1 text-right">
                    <p className="font-medium text-sm">الاسم</p>
                    {isEditingName ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="flex-1 h-8 px-2 text-xs rounded-lg border border-border bg-background text-right"
                          dir="rtl"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            // TODO: Save name
                            setIsEditingName(false);
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          حفظ
                        </button>
                        <button
                          onClick={() => {
                            setEditedName(user?.display_name || "");
                            setIsEditingName(false);
                          }}
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground" dir="rtl">
                        {user?.display_name || "غير محدد"}
                      </p>
                    )}
                  </div>
                  {!isEditingName && (
                    <button 
                      onClick={() => setIsEditingName(true)}
                      className="text-xs text-primary hover:underline shrink-0 mr-2"
                    >
                      تعديل
                    </button>
                  )}
                </div>
                
                {/* Email */}
                <div className="flex items-center justify-between">
                  <div className="flex-1 text-right">
                    <p className="font-medium text-sm">البريد الإلكتروني</p>
                    {isEditingEmail ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="email"
                          value={editedEmail}
                          onChange={(e) => setEditedEmail(e.target.value)}
                          className="flex-1 h-8 px-2 text-xs rounded-lg border border-border bg-background text-left"
                          dir="ltr"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            // TODO: Save email
                            setIsEditingEmail(false);
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          حفظ
                        </button>
                        <button
                          onClick={() => {
                            setEditedEmail(user?.email || "");
                            setIsEditingEmail(false);
                          }}
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        {user?.email || "غير محدد"}
                      </p>
                    )}
                  </div>
                  {!isEditingEmail && (
                    <button 
                      onClick={() => setIsEditingEmail(true)}
                      className="text-xs text-primary hover:underline shrink-0 mr-2"
                    >
                      تعديل
                    </button>
                  )}
                </div>
                
                {/* Phone */}
                <div className="flex items-center justify-between">
                  <div className="flex-1 text-right">
                    <p className="font-medium text-sm">رقم الجوال</p>
                    {isEditingPhone ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="tel"
                          value={editedPhone}
                          onChange={(e) => setEditedPhone(e.target.value)}
                          className="flex-1 h-8 px-2 text-xs rounded-lg border border-border bg-background text-left"
                          dir="ltr"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            // TODO: Save phone
                            setIsEditingPhone(false);
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          حفظ
                        </button>
                        <button
                          onClick={() => {
                            setEditedPhone(user?.phone || "");
                            setIsEditingPhone(false);
                          }}
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          إلغاء
                        </button>
             </div>
                    ) : (
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        {user?.phone || "غير محدد"}
                      </p>
                    )}
                  </div>
                  {!isEditingPhone && (
                    <button 
                      onClick={() => setIsEditingPhone(true)}
                      className="text-xs text-primary hover:underline shrink-0 mr-2"
                    >
                      تعديل
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Notifications Section */}
            <div className="p-4 bg-secondary/50 rounded-lg border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  <Bell size={20} />
                </div>
                <h3 className="font-bold text-base">الإشعارات</h3>
              </div>
              
              <div className="space-y-3">
                {/* Notify on Interest */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">إشعارات الطلبات الجديدة</p>
                    <p className="text-xs text-muted-foreground">إشعار عند وجود طلبات جديدة حسب اهتماماتك</p>
             </div>
                  <button
                    onClick={() => setNotifyOnInterest(!notifyOnInterest)}
                    className={`w-14 h-7 rounded-full p-1 transition-all relative flex items-center shrink-0 ${
                      notifyOnInterest ? "bg-primary" : "bg-gray-300"
                    }`}
                  >
                    <motion.div
                      animate={{ x: notifyOnInterest ? -28 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="w-5 h-5 bg-white rounded-full shadow-lg"
                    />
                  </button>
          </div>
          
                {/* Notify on Offers */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">إشعارات العروض</p>
                    <p className="text-xs text-muted-foreground">إشعار عند استلام عروض جديدة على طلباتك</p>
                  </div>
          <button 
                    onClick={() => setNotifyOnOffers(!notifyOnOffers)}
                    className={`w-14 h-7 rounded-full p-1 transition-all relative flex items-center shrink-0 ${
                      notifyOnOffers ? "bg-primary" : "bg-gray-300"
                    }`}
          >
                    <motion.div
                      animate={{ x: notifyOnOffers ? -28 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="w-5 h-5 bg-white rounded-full shadow-lg"
            />
          </button>
        </div>

                {/* Notify on Messages */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">إشعارات الرسائل</p>
                    <p className="text-xs text-muted-foreground">إشعار عند استلام رسائل جديدة</p>
                  </div>
                  <button
                    onClick={() => setNotifyOnMessages(!notifyOnMessages)}
                    className={`w-14 h-7 rounded-full p-1 transition-all relative flex items-center shrink-0 ${
                      notifyOnMessages ? "bg-primary" : "bg-gray-300"
                    }`}
                  >
                    <motion.div
                      animate={{ x: notifyOnMessages ? -28 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="w-5 h-5 bg-white rounded-full shadow-lg"
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Interests & Cities Section */}
            <div className="p-4 bg-secondary/50 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10 text-primary">
                    <Filter size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-base">إدارة الاهتمامات</h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedCategories.length > 0 || selectedCities.length > 0 || selectedRadarWords.length > 0
                        ? [
                            selectedCategories.length > 0 && `${selectedCategories.length} تصنيف`,
                            selectedCities.length > 0 && `${selectedCities.length} مدينة`,
                            selectedRadarWords.length > 0 && `${selectedRadarWords.length} كلمة رادار`
                          ].filter(Boolean).join('، ')
                        : 'لم يتم تحديد أي اهتمامات'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setTempCategories(selectedCategories);
                    setTempCities(selectedCities);
                    setTempRadarWords(selectedRadarWords);
                    setCitySearch("");
                    setCategorySearch("");
                    setNewRadarWord("");
                    setIsManageInterestsOpen(true);
                  }}
                  className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-medium shrink-0"
                >
                  إدارة
                </button>
              </div>

              {/* Preview Section - Collapsible */}
              {(selectedCategories.length > 0 || selectedCities.length > 0 || selectedRadarWords.length > 0) && (
                <div className="border-t border-border pt-3">
                  <div 
                    onClick={() => setIsInterestsPreviewExpanded(!isInterestsPreviewExpanded)}
                    className="flex items-center justify-between cursor-pointer hover:bg-secondary/50 rounded-lg p-2 -mx-2 transition-all"
                  >
                    <span className="text-xs font-medium text-muted-foreground">عرض التفاصيل</span>
                    <ChevronDown 
                      size={16} 
                      className={`text-muted-foreground transition-transform duration-200 ${isInterestsPreviewExpanded ? "rotate-180" : ""}`} 
                    />
                  </div>
                  <AnimatePresence>
                    {isInterestsPreviewExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 space-y-3">
                          {/* Categories Preview */}
                          {selectedCategories.length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold text-muted-foreground mb-2">التصنيفات المختارة:</h4>
                              <div className="flex flex-wrap gap-2">
                                {selectedCategories.map((catId) => {
                                  const cat = AVAILABLE_CATEGORIES.find(c => c.id === catId);
                                  return cat ? (
                                    <div
                                      key={catId}
                                      className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-2 py-1 rounded-lg text-xs"
                                    >
                                      <span>{cat.emoji}</span>
                                      <span className="text-primary font-medium">{cat.label}</span>
                                    </div>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          )}

                          {/* Cities Preview */}
                          {selectedCities.length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold text-muted-foreground mb-2">المدن المختارة:</h4>
                              <div className="flex flex-wrap gap-2">
                                {selectedCities.map((city) => (
                                  <div
                                    key={city}
                                    className="px-2 py-1 bg-primary/10 border border-primary/20 rounded-lg text-xs text-primary font-medium"
                                  >
                                    {city}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Radar Words Preview */}
                          {selectedRadarWords.length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold text-muted-foreground mb-2">كلمات الرادار:</h4>
                              <div className="flex flex-wrap gap-2">
                                {selectedRadarWords.map((word) => (
                                  <div
                                    key={word}
                                    className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-600 dark:text-amber-400 font-medium"
                                  >
                                    📡 {word}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Manage Interests Modal */}
      <AnimatePresence>
        {isManageInterestsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-bold">إدارة الاهتمامات</h3>
                <button
                  onClick={() => setIsManageInterestsOpen(false)}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                {/* Notification Toggle - Moved to top */}
                <div className="p-4 bg-secondary/50 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell size={18} className="text-primary" />
                      <div>
                        <h4 className="font-bold text-sm">إشعارات الاهتمامات</h4>
                        <p className="text-xs text-muted-foreground">تنبيهات فورية للطلبات التي تهمك</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setNotifyOnInterest(!notifyOnInterest)}
                      className={`w-14 h-7 rounded-full p-1 transition-all relative flex items-center shrink-0 ${
                        notifyOnInterest ? "bg-primary" : "bg-gray-300"
                      }`}
                    >
                      <motion.div
                        animate={{ x: notifyOnInterest ? -28 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="w-5 h-5 bg-white rounded-full shadow-lg"
                      />
                    </button>
                  </div>
                </div>

                {/* Categories - Collapsible */}
                <div className="bg-secondary/50 rounded-lg border border-border overflow-hidden">
                  <div 
                    onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/70 transition-all"
                  >
                    <h4 className="font-bold text-sm">التصنيفات والمهام</h4>
                    <ChevronDown 
                      size={18} 
                      className={`text-muted-foreground transition-transform duration-200 ${isCategoriesExpanded ? "rotate-180" : ""}`} 
                    />
                  </div>
                  <AnimatePresence>
                    {isCategoriesExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-border"
                      >
                        <div className="p-3 space-y-3">
                          <input
                            type="text"
                            placeholder="بحث..."
                            value={categorySearch}
                            onChange={(e) => setCategorySearch(e.target.value)}
                            className="w-full text-xs px-3 py-1.5 rounded-lg border-2 border-[#1E968C]/30 bg-background focus:border-[#178075] focus:outline-none transition-all"
                          />
                          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto no-scrollbar">
                            {filteredCategories.map((cat) => (
                              <button
                                key={cat.id}
                                onClick={() => toggleCategory(cat.id)}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                                  tempCategories.includes(cat.id)
                                    ? 'bg-primary text-white'
                                    : 'bg-background text-foreground hover:bg-secondary/80 border border-border'
                                }`}
                              >
                                {cat.emoji} {cat.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Cities - Collapsible */}
                <div className="bg-secondary/50 rounded-lg border border-border overflow-hidden">
                  <div 
                    onClick={() => setIsCitiesExpanded(!isCitiesExpanded)}
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/70 transition-all"
                  >
                    <h4 className="font-bold text-sm">المدن والمناطق</h4>
                    <ChevronDown 
                      size={18} 
                      className={`text-muted-foreground transition-transform duration-200 ${isCitiesExpanded ? "rotate-180" : ""}`} 
                    />
                  </div>
                  <AnimatePresence>
                    {isCitiesExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-border"
                      >
                        <div className="p-3 space-y-3">
                          <input
                            type="text"
                            placeholder="بحث..."
                            value={citySearch}
                            onChange={(e) => setCitySearch(e.target.value)}
                            className="w-full text-xs px-3 py-1.5 rounded-lg border-2 border-[#1E968C]/30 bg-background focus:border-[#178075] focus:outline-none transition-all"
                          />
                          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto no-scrollbar">
                            {filteredCities.map((city) => (
                              <button
                                key={city}
                                onClick={() => toggleCity(city)}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                                  tempCities.includes(city)
                                    ? 'bg-primary text-white'
                                    : 'bg-background text-foreground hover:bg-secondary/80 border border-border'
                                }`}
                              >
                                {city}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Radar Words - Collapsible */}
                <div className="bg-secondary/50 rounded-lg border border-border overflow-hidden">
                  <div 
                    onClick={() => setIsRadarWordsExpanded(!isRadarWordsExpanded)}
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/70 transition-all"
                  >
                    <h4 className="font-bold text-sm">رادار الكلمات</h4>
                    <ChevronDown 
                      size={18} 
                      className={`text-muted-foreground transition-transform duration-200 ${isRadarWordsExpanded ? "rotate-180" : ""}`} 
                    />
                  </div>
                  <AnimatePresence>
                    {isRadarWordsExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-border"
                      >
                        <div className="p-3 space-y-3">
                          <p className="text-xs text-muted-foreground">
                            إذا كان الطلب يتضمن إحدى هذه الكلمات، سيتم إشعارك
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="اكتب الكلمة..."
                              value={newRadarWord}
                              onChange={(e) => setNewRadarWord(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addRadarWord();
                                }
                              }}
                              className="flex-1 text-xs px-3 py-1.5 rounded-lg border-2 border-[#1E968C]/30 bg-background focus:border-[#178075] focus:outline-none transition-all"
                            />
                            <button
                              onClick={addRadarWord}
                              disabled={!newRadarWord.trim()}
                              className="px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          {tempRadarWords.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {tempRadarWords.map((word) => (
                                <div
                                  key={word}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-sm"
                                >
                                  <span>{word}</span>
                                  <button
                                    onClick={() => removeRadarWord(word)}
                                    className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 p-4 border-t border-border">
                <button
                  onClick={() => setIsManageInterestsOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors font-medium"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveInterests}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-medium"
                >
                  حفظ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sign Out Button - At the bottom */}
      {onSignOut && (
        <div className="max-w-2xl mx-auto px-6 pb-8">
          <motion.button
            onClick={onSignOut}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-all group"
          >
            <LogOut size={20} className="group-hover:scale-110 transition-transform" />
            <span className="font-bold">تسجيل الخروج</span>
          </motion.button>
        </div>
      )}
    </div>
  );
};
