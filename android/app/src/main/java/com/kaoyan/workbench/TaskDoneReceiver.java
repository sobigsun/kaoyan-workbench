package com.kaoyan.workbench;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.app.NotificationManager;

import com.getcapacitor.JSObject;

/**
 * 用户在系统通知栏点某个任务通知的「✓ 完成」按钮后，
 * Android 会通过 PendingIntent 把广播发到这里。
 * - 我们先立刻取消掉该任务对应的那一条通知（用户点过了别再挂着）
 * - 再通过 TaskNotificationsPlugin 的共享实例 notifyListeners 把
 *   { taskId } 事件发回 Web 端，由前端统一走 awardTaskDone + 漂浮金币
 */
public class TaskDoneReceiver extends BroadcastReceiver {
    public static final String ACTION = "com.kaoyan.workbench.action.TASK_DONE_FROM_NOTIF";
    public static final String EXTRA_TASK_ID = "task_id";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !ACTION.equals(intent.getAction())) return;
        String taskId = intent.getStringExtra(EXTRA_TASK_ID);
        if (taskId == null) return;
        // 1) 取消通知
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(taskId, 0);
        } catch (Exception ignore) { }
        // 2) 发到前端（如果 Web 层还活着；如果进程被杀死则下一次启动 App 时前端会重新 sync 通知）
        TaskNotificationsPlugin p = TaskNotificationsPlugin.sharedInstance;
        if (p != null) {
            try {
                JSObject data = new JSObject();
                data.put("taskId", taskId);
                p.emitEvent(TaskNotificationsPlugin.EVENT_TASK_DONE, data);
            } catch (Exception ignore) { }
        } else {
            // 插件尚未加载：把 taskId 暂存，等插件 load() 时补发
            TaskNotificationsPlugin.pendingTaskDoneFromNotif = taskId;
        }
    }
}
