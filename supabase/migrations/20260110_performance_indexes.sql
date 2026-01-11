-- ==========================================
-- Performance Indexes Migration
-- ==========================================
-- هذه الـ indexes تحسن أداء الاستعلامات الشائعة

-- 1. Requests: للفلترة حسب المؤلف والحالة
CREATE INDEX IF NOT EXISTS idx_requests_author_status 
ON requests(author_id, status);

-- 2. Requests: للبحث حسب التاريخ
CREATE INDEX IF NOT EXISTS idx_requests_created_at 
ON requests(created_at DESC);

-- 3. Offers: للبحث عن عروض طلب معين
CREATE INDEX IF NOT EXISTS idx_offers_request_status 
ON offers(request_id, status);

-- 4. Offers: للبحث عن عروض مزود معين
CREATE INDEX IF NOT EXISTS idx_offers_provider 
ON offers(provider_id, status);

-- 5. Messages: للبحث في محادثة معينة
CREATE INDEX IF NOT EXISTS idx_messages_conversation 
ON messages(conversation_id, created_at DESC);

-- 6. Notifications: للإشعارات غير المقروءة
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- 7. Request Views: لتتبع المشاهدات
CREATE INDEX IF NOT EXISTS idx_request_views_user 
ON request_views(user_id, request_id);

-- 8. Reviews: للتقييمات حسب المستخدم
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee 
ON reviews(reviewee_id);

-- ==========================================
-- Verification
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '✅ تم إنشاء 8 indexes لتحسين الأداء!';
END $$;
