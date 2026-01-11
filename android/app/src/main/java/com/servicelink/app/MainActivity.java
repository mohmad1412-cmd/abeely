package com.servicelink.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.os.Build;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    private static final String CHANNEL_ID = "default";
    private static final String CHANNEL_NAME = "إشعارات";
    
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannel();
    }
    
    /**
     * إنشاء Notification Channel بأهمية عالية للسرعة القصوى
     * ⚡ هذا مهم جداً للحصول على إشعارات سريعة
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            
            if (notificationManager == null) {
                return;
            }
            
            // التحقق من وجود القناة مسبقاً
            NotificationChannel existingChannel = notificationManager.getNotificationChannel(CHANNEL_ID);
            if (existingChannel != null) {
                // تحديث القناة الموجودة إذا كانت الأهمية أقل
                if (existingChannel.getImportance() < NotificationManager.IMPORTANCE_HIGH) {
                    existingChannel.setImportance(NotificationManager.IMPORTANCE_HIGH);
                    existingChannel.enableVibration(true);
                    existingChannel.setSound(
                        RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
                        new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                    );
                    notificationManager.createNotificationChannel(existingChannel);
                }
                return;
            }
            
            // إنشاء قناة جديدة بأهمية عالية
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH  // ⚡ IMPORTANCE_HIGH للسرعة القصوى
            );
            
            // تفعيل الاهتزاز
            channel.enableVibration(true);
            
            // إعداد الصوت (default notification sound)
            channel.setSound(
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            );
            
            // إظهار على الشاشة المقفلة
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            
            // تفعيل الضوء (LED) إذا كان متوفراً
            channel.enableLights(true);
            
            // وصف القناة (اختياري)
            channel.setDescription("إشعارات التطبيق المهمة");
            
            // إنشاء القناة
            notificationManager.createNotificationChannel(channel);
        }
    }
}
