-- ==========================================
-- إصلاح مشكلة "trigger already exists"
-- ==========================================
-- شغّل هذا الملف إذا واجهت خطأ "trigger already exists" عند تنفيذ MIGRATE_ALL_SCHEMA.sql
-- ==========================================

-- حذف جميع Triggers القديمة
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_verified_guests_updated_at ON verified_guests;
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON messages;
DROP TRIGGER IF EXISTS trigger_notify_on_new_offer ON offers;
DROP TRIGGER IF EXISTS trigger_notify_on_offer_accepted ON offers;
DROP TRIGGER IF EXISTS trigger_notify_on_new_message ON messages;
DROP TRIGGER IF EXISTS trigger_notify_on_new_interest_request ON requests;
DROP TRIGGER IF EXISTS trigger_push_notification_offer ON offers;
DROP TRIGGER IF EXISTS trigger_push_notification_message ON messages;

-- حذف Functions القديمة (إذا لزم)
-- ⚠️ احذر: هذا سيحذف جميع النسخ، قد تحتاج لإعادة إنشائها
-- DO $$ 
-- DECLARE
--     r RECORD;
-- BEGIN
--     FOR r IN (SELECT oid::regprocedure FROM pg_proc WHERE proname IN (
--         'update_updated_at_column',
--         'update_conversation_on_message',
--         'notify_on_new_offer',
--         'notify_on_offer_accepted',
--         'notify_on_new_message',
--         'notify_on_new_interest_request'
--     )) 
--     LOOP
--         EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid::regprocedure || ' CASCADE';
--     END LOOP;
-- END $$;

-- ==========================================
-- بعد شغّل هذا الملف، يمكنك إعادة شغّل MIGRATE_ALL_SCHEMA.sql بأمان
-- ==========================================
