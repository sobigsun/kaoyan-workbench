package com.kaoyan.workbench;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;

/**
 * App 级自定义 Application：
 * - 提前把"番茄钟"和"今日任务"两个 NotificationChannel 创建好（Android 8+ 必须）
 * - 不用等用户打开某个页面才创建，开机/冷启动即可立即发通知
 */
public class KaoyanApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannels();
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm == null) return;

        // 番茄钟前台服务：IMPORTANCE_LOW（不响铃，只常驻显示）
        NotificationChannel pomo = new NotificationChannel(
                PomodoroForegroundService.CHANNEL_ID,
                "番茄钟倒计时",
                NotificationManager.IMPORTANCE_LOW);
        pomo.setDescription("番茄钟进行中会常驻通知栏显示剩余时间");
        pomo.setShowBadge(false);
        pomo.enableLights(true);
        nm.createNotificationChannel(pomo);

        // 今日任务通知：IMPORTANCE_DEFAULT（跟随系统铃声/震动提示）
        NotificationChannel tasks = new NotificationChannel(
                TaskNotificationsPlugin.CHANNEL_ID,
                "今日任务提醒",
                NotificationManager.IMPORTANCE_DEFAULT);
        tasks.setDescription("每日学习任务会出现在通知栏，可直接点「完成」打勾");
        tasks.setShowBadge(true);
        tasks.enableLights(true);
        tasks.enableVibration(true);
        nm.createNotificationChannel(tasks);
    }
}
