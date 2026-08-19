package com.kaoyan.workbench;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.CountDownTimer;
import android.os.IBinder;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * 番茄钟前台服务：
 * - 使用 startForeground 常驻通知栏，系统不会因为 App 进入后台而冻结计时
 * - 用 Android 原生 CountDownTimer 精确倒计时（不依赖 WebView/JS 循环）
 * - 每秒刷新通知栏「剩余 MM:SS + 进度条」
 * - 结束时震动 3 声 + 发出"完成"通知
 */
public class PomodoroForegroundService extends Service {

    public static final String ACTION_START = "com.kaoyan.workbench.pomodoro.START";
    public static final String ACTION_PAUSE = "com.kaoyan.workbench.pomodoro.PAUSE";
    public static final String ACTION_STOP  = "com.kaoyan.workbench.pomodoro.STOP";

    public static final String EXTRA_TASK_ID    = "task_id";
    public static final String EXTRA_TASK_TITLE = "task_title";
    public static final String EXTRA_MODULE     = "module";
    public static final String EXTRA_TOTAL_SEC  = "total_sec";
    public static final String EXTRA_REMAIN_SEC = "remain_sec";
    public static final String EXTRA_IS_BREAK   = "is_break";

    public static final String CHANNEL_ID = "pomodoro_timer";
    public static final int    NOTIF_ID   = 1001;

    private CountDownTimer timer = null;
    private long totalMs;
    private long remainMs;
    private String taskId;
    private String taskTitle;
    private String module;
    private boolean isBreak;

    @Nullable
    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onCreate() {
        super.onCreate();
        ensureChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || intent.getAction() == null) {
            stopSelf();
            return START_NOT_STICKY;
        }
        String action = intent.getAction();
        switch (action) {
            case ACTION_START:
                long totalSec  = intent.getLongExtra(EXTRA_TOTAL_SEC, 0);
                long remainSec = intent.getLongExtra(EXTRA_REMAIN_SEC, totalSec);
                taskId    = intent.getStringExtra(EXTRA_TASK_ID);
                taskTitle = intent.getStringExtra(EXTRA_TASK_TITLE);
                module    = intent.getStringExtra(EXTRA_MODULE);
                isBreak   = intent.getBooleanExtra(EXTRA_IS_BREAK, false);
                totalMs   = totalSec * 1000L;
                remainMs  = remainSec * 1000L;
                if (timer != null) timer.cancel();
                startTimer(remainMs);
                startForegroundSafe(buildNotification(remainMs, totalMs));
                break;
            case ACTION_PAUSE:
                if (timer != null) { timer.cancel(); timer = null; }
                updateNotification(remainMs);
                break;
            case ACTION_STOP:
            default:
                if (timer != null) { timer.cancel(); timer = null; }
                stopForeground(true);
                stopSelf();
                break;
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        if (timer != null) { timer.cancel(); timer = null; }
        super.onDestroy();
    }

    private void startTimer(long ms) {
        timer = new CountDownTimer(ms, 1000L) {
            @Override public void onTick(long millisUntilFinished) {
                remainMs = millisUntilFinished;
                updateNotification(millisUntilFinished);
            }
            @Override public void onFinish() {
                remainMs = 0;
                updateNotification(0);
                beepVibrate();
                if (!isBreak) {
                    // 通知 JS：一个番茄钟专注阶段结束
                    PomodoroPlugin.emitComplete(taskId);
                }
                // 常驻通知改成已完成，约 30 秒后自动消失
                stopForeground(false);
                NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
                if (nm != null) {
                    Notification done = new NotificationCompat.Builder(PomodoroForegroundService.this, CHANNEL_ID)
                            .setSmallIcon(R.drawable.ic_notif)
                            .setContentTitle(isBreak ? "休息时间到" : "番茄钟结束")
                            .setContentText(taskTitle == null || taskTitle.isEmpty()
                                    ? (isBreak ? "休息结束，继续加油～" : "专注完成，休息一下吧！")
                                    : (isBreak ? "休息结束，回到「" + taskTitle + "」" : "已完成：" + taskTitle))
                            .setAutoCancel(true)
                            .setPriority(NotificationCompat.PRIORITY_HIGH)
                            .setCategory(NotificationCompat.CATEGORY_ALARM)
                            .setDefaults(NotificationCompat.DEFAULT_LIGHTS)
                            .setTimeoutAfter(30_000L)
                            .setContentIntent(buildOpenAppPendingIntent())
                            .build();
                    nm.notify(NOTIF_ID, done);
                }
                stopSelf();
            }
        }.start();
    }

    private void startForegroundSafe(Notification notification) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIF_ID, notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIF_ID, notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_NONE);
        } else {
            startForeground(NOTIF_ID, notification);
        }
    }

    private Notification buildNotification(long millisLeft) {
        return buildNotification(millisLeft, totalMs);
    }
    private Notification buildNotification(long millisLeft, long total) {
        int remainSec = (int) Math.max(0, Math.round(millisLeft / 1000.0));
        int totalSec  = (int) Math.max(1, Math.round(total / 1000.0));
        int progress = Math.min(100, (int)((long)(totalSec - remainSec) * 100 / totalSec));
        int mm = remainSec / 60;
        int ss = remainSec % 60;
        String timeStr = String.format("%02d:%02d", mm, ss);
        String title = isBreak ? "☕ 休息中" : "🍅 番茄钟进行中";
        if (taskTitle != null && !taskTitle.isEmpty()) title = title + " · " + taskTitle;
        String body  = "剩余 " + timeStr + (module == null || module.isEmpty() ? "" : "  (" + module + ")");

        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notif)
                .setContentTitle(title)
                .setContentText(body)
                .setOngoing(true)
                .setProgress(totalSec, totalSec - remainSec, false)
                .setOnlyAlertOnce(true)
                .setShowWhen(false)
                .setSilent(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_PROGRESS)
                .setContentIntent(buildOpenAppPendingIntent())
                .addAction(R.drawable.ic_notif, "暂停",
                        buildServicePendingIntent(ACTION_PAUSE))
                .addAction(R.drawable.ic_notif, "停止",
                        buildServicePendingIntent(ACTION_STOP));
        // 在通知右侧的 bigText 样式上也能看到进度
        b.setStyle(new NotificationCompat.BigTextStyle().bigText(body));
        Notification notif = b.build();
        // 注：Notification.chronometerOptions / CHRONOMETER_SHOW_WHEN_STOPPED 是 Android 14 (API 34) 才有的 API
        //    这里不使用，因为我们已经通过 setProgress + setContentText 每秒手动更新进度显示，兼容性更好
        return notif;
    }

    private void updateNotification(long millisLeft) {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm == null) return;
        nm.notify(NOTIF_ID, buildNotification(millisLeft));
    }

    private PendingIntent buildServicePendingIntent(String action) {
        Intent i = new Intent(this, PomodoroForegroundService.class);
        i.setAction(action);
        return PendingIntent.getService(this,
                action.hashCode() ^ NOTIF_ID, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private PendingIntent buildOpenAppPendingIntent() {
        Intent i = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (i == null) i = new Intent(this, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(this, 10, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void beepVibrate() {
        try {
            Vibrator vib;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vm = (VibratorManager) getSystemService(VIBRATOR_MANAGER_SERVICE);
                vib = vm != null ? vm.getDefaultVibrator() : null;
            } else {
                vib = (Vibrator) getSystemService(VIBRATOR_SERVICE);
            }
            if (vib == null) return;
            long[] pattern = { 0, 300, 200, 300, 200, 400 };
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vib.vibrate(VibrationEffect.createWaveform(pattern, -1));
            } else {
                //noinspection deprecation
                vib.vibrate(pattern, -1);
            }
        } catch (Exception ignore) { }
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationChannel ch = nm.getNotificationChannel(CHANNEL_ID);
        if (ch != null) return;
        ch = new NotificationChannel(CHANNEL_ID,
                "番茄钟倒计时", NotificationManager.IMPORTANCE_LOW);
        ch.setDescription("番茄钟进行中会常驻通知栏显示剩余时间");
        ch.setShowBadge(false);
        ch.enableLights(true);
        nm.createNotificationChannel(ch);
    }
}
