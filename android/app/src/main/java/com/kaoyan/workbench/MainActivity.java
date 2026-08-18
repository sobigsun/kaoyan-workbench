package com.kaoyan.workbench;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /**
     * 注册自定义的两个 Capacitor 插件：
     * - Pomodoro：启动 / 暂停 / 停止 番茄钟前台服务
     * - TaskNotifications：同步今日任务到通知栏 + 监听点「完成」
     *
     * （使用 @CapacitorPlugin 注解的插件通常也会被代码生成器自动注册，
     *  这里手动 register 双保险，以防云端构建过程中 gradle 没有生成 plugin registry）
     */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PomodoroPlugin.class);
        registerPlugin(TaskNotificationsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
