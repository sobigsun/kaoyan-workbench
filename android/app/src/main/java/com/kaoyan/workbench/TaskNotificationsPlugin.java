package com.kaoyan.workbench;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.text.TextUtils;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;

import androidx.core.app.NotificationCompat;

/**
 * 「今日任务」→ 安卓通知栏 + 点「✓ 完成」打勾回调 Web 端
 *
 * JS 侧用法：
 *   TaskNotifications.syncTasks([
 *     { taskId: "t_123", title: "英语阅读 Text 1 精翻", module: "英语", done: false }
 *   ])
 *   TaskNotifications.addListener('taskDoneFromNotification', ({ taskId }) => ...)
 *
 * 注意：每个任务通知 tag = taskId，id = 0；Android 按 tag+id 作为唯一键。
 *       任务 done=true 的同步过来时会自动取消对应通知，不会显示"完成了"的任务。
 */
@CapacitorPlugin(name = "TaskNotifications")
public class TaskNotificationsPlugin extends Plugin {

    public static final String EVENT_TASK_DONE = "taskDoneFromNotification";
    public static final String CHANNEL_ID = "today_tasks";

    static volatile TaskNotificationsPlugin sharedInstance;
    static volatile String pendingTaskDoneFromNotif = null;

    public TaskNotificationsPlugin() { sharedInstance = this; }

    /**
     * 公开版 notifyListeners：用于外部类（如 TaskDoneReceiver）触发事件。
     * 因为 Plugin.notifyListeners(String, JSObject) 是 protected，
     * 非子类无法直接访问，所以在这里包一层。
     */
    public void emitEvent(String eventName, JSObject data) {
        try {
            notifyListeners(eventName, data);
        } catch (Exception ignore) { }
    }

    @Override public void load() {
        sharedInstance = this;
        ensureChannel();
        // 插件加载时（通常是 App 启动），补发一下进程被杀时没送到前端的完成事件
        String pending = pendingTaskDoneFromNotif;
        if (pending != null) {
            pendingTaskDoneFromNotif = null;
            final String tid = pending;
            try {
                JSObject data = new JSObject();
                data.put("taskId", tid);
                emitEvent(EVENT_TASK_DONE, data);
            } catch (Exception ignore) { }
        }
        super.load();
    }

    /**
     * 同步今日所有任务：done=false 会生成/刷新一条通知，done=true 会被取消。
     * 参数：{ tasks: TaskNotifInfo[] }
     * TaskNotifInfo = { taskId: string, title: string, module?: string, done: boolean }
     */
    @PluginMethod
    public void syncTasks(PluginCall call) {
        JSArray arr = call.getArray("tasks", new JSArray());
        Context ctx = getContext();
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) { call.resolve(); return; }

        Set<String> incoming = new HashSet<>();
        for (int i = 0; i < arr.length(); i++) {
            try {
                JSONObject o = arr.getJSONObject(i);
                String taskId = o.optString("taskId");
                if (TextUtils.isEmpty(taskId)) continue;
                incoming.add(taskId);
                boolean done = o.optBoolean("done");
                if (done) {
                    nm.cancel(taskId, 0);
                    continue;
                }
                String title  = o.optString("title",  "学习任务");
                String module = o.optString("module", "");
                int count = o.optInt("index", -1);
                NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL_ID)
                        .setSmallIcon(R.drawable.ic_notif)
                        .setContentTitle((count > 0 ? "#" + count + " " : "") + title)
                        .setContentText(TextUtils.isEmpty(module) ? "今日任务" : "科目：" + module)
                        .setStyle(new NotificationCompat.BigTextStyle()
                                .bigText((TextUtils.isEmpty(module) ? "" : "【" + module + "】 ") + title))
                        .setOngoing(false)
                        .setAutoCancel(false)
                        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                        .setCategory(NotificationCompat.CATEGORY_REMINDER)
                        .setGroup("kaoyan_tasks")
                        .setContentIntent(buildOpenAppPendingIntent(ctx))
                        .addAction(R.drawable.ic_notif, "✓ 完成", buildDonePendingIntent(ctx, taskId));
                nm.notify(taskId, 0, b.build());
            } catch (Exception ignore) { }
        }

        // 对于"老的任务通知"（这次没传过来）：清掉（可能被删掉了）
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && nm.getActiveNotifications() != null) {
            for (android.service.notification.StatusBarNotification sbn : nm.getActiveNotifications()) {
                if (sbn.getId() == 0 && sbn.getTag() != null && sbn.getPackageName().equals(ctx.getPackageName())) {
                    if (!incoming.contains(sbn.getTag())) nm.cancel(sbn.getTag(), 0);
                }
            }
        }
        call.resolve();
    }

    /** 清理今日所有任务通知 */
    @PluginMethod
    public void cancelAll(PluginCall call) {
        NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                for (android.service.notification.StatusBarNotification sbn : nm.getActiveNotifications()) {
                    if (sbn.getId() == 0 && sbn.getTag() != null) nm.cancel(sbn.getTag(), 0);
                }
            }
        }
        call.resolve();
    }

    private PendingIntent buildDonePendingIntent(Context ctx, String taskId) {
        Intent i = new Intent(ctx, TaskDoneReceiver.class);
        i.setAction(TaskDoneReceiver.ACTION);
        i.putExtra(TaskDoneReceiver.EXTRA_TASK_ID, taskId);
        return PendingIntent.getBroadcast(ctx, taskId.hashCode(), i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private PendingIntent buildOpenAppPendingIntent(Context ctx) {
        Intent i = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if (i == null) i = new Intent(ctx, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(ctx, 11, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationChannel ch = nm.getNotificationChannel(CHANNEL_ID);
        if (ch != null) return;
        ch = new NotificationChannel(CHANNEL_ID,
                "今日任务提醒", NotificationManager.IMPORTANCE_DEFAULT);
        ch.setDescription("每日学习任务会出现在通知栏，可直接点「完成」打勾");
        ch.setShowBadge(true);
        ch.enableLights(true);
        nm.createNotificationChannel(ch);
    }
}
