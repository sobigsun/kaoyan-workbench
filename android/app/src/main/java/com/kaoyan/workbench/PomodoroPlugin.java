package com.kaoyan.workbench;

import android.content.Context;
import android.content.Intent;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Pomodoro")
public class PomodoroPlugin extends Plugin {

    /** 允许其他类（ForegroundService）回调前端：一个番茄钟完成 */
    static volatile PomodoroPlugin sharedInstance;
    static final String EVENT_COMPLETE = "pomodoroComplete";

    public PomodoroPlugin() {
        sharedInstance = this;
    }

    static void emitComplete(String taskId) {
        PomodoroPlugin s = sharedInstance;
        if (s == null) return;
        try {
            JSObject data = new JSObject();
            data.put("taskId", taskId == null ? "" : taskId);
            s.notifyListeners(EVENT_COMPLETE, data);
        } catch (Exception ignore) { }
    }

    @Override public void load() {
        sharedInstance = this;
        super.load();
    }

    /**
     * 开始计时（或切换到新的番茄钟）
     * 参数：
     *   taskId: string
     *   taskTitle: string
     *   module: string
     *   totalSec: number   (完整番茄钟长，秒)
     *   remainSec: number  (当前剩余长，秒；start 时通常 = totalSec；从暂停恢复时 < totalSec)
     *   isBreak: boolean   (是否为休息阶段)
     */
    @PluginMethod
    public void startTimer(PluginCall call) {
        Context ctx = getContext();
        Intent i = new Intent(ctx, PomodoroForegroundService.class);
        i.setAction(PomodoroForegroundService.ACTION_START);
        i.putExtra(PomodoroForegroundService.EXTRA_TASK_ID,    call.getString("taskId", ""));
        i.putExtra(PomodoroForegroundService.EXTRA_TASK_TITLE, call.getString("taskTitle", ""));
        i.putExtra(PomodoroForegroundService.EXTRA_MODULE,     call.getString("module", ""));
        i.putExtra(PomodoroForegroundService.EXTRA_IS_BREAK,   call.getBoolean("isBreak", false));
        long totalSec  = (long) call.getInt("totalSec",  1500);  // 默认 25 分
        long remainSec = (long) call.getInt("remainSec", (int) totalSec);
        if (remainSec <= 0) remainSec = totalSec;
        i.putExtra(PomodoroForegroundService.EXTRA_TOTAL_SEC,  totalSec);
        i.putExtra(PomodoroForegroundService.EXTRA_REMAIN_SEC, remainSec);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(i);
        } else {
            ctx.startService(i);
        }
        call.resolve();
    }

    /** 暂停（保留剩余时间，不再刷通知栏进度） */
    @PluginMethod
    public void pauseTimer(PluginCall call) {
        Context ctx = getContext();
        Intent i = new Intent(ctx, PomodoroForegroundService.class);
        i.setAction(PomodoroForegroundService.ACTION_PAUSE);
        try { ctx.startService(i); } catch (Exception ignore) { }
        call.resolve();
    }

    /** 彻底停止：移除前台服务 + 取消通知 */
    @PluginMethod
    public void stopTimer(PluginCall call) {
        Context ctx = getContext();
        Intent i = new Intent(ctx, PomodoroForegroundService.class);
        i.setAction(PomodoroForegroundService.ACTION_STOP);
        try { ctx.startService(i); } catch (Exception ignore) { }
        call.resolve();
    }
}
