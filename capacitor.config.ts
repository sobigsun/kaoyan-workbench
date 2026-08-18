import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kaoyan.workbench',
  appName: '考研工作台',
  webDir: 'dist',
  android: {
    backgroundColor: '#FAF6F0',
    allowMixedContent: true,
    // 开启 edge-to-edge：让 WebView 绘制到状态栏/导航栏下方
    // 这样 CSS 的 env(safe-area-inset-*) 会被注入真实值，避免内容与状态栏重叠
    androidEdgeToEdge: true,
    // 状态栏颜色：与页面背景（暖米色）一致，视觉更融合
    // 导航栏颜色：同样配暖米，避免出现黑条
    statusBarColor: '#FAF6F0',
    navigationBarColor: '#FAF6F0',
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    // SystemBars 插件配置（Capacitor 8+ 内置）
    // 进一步确保 insets 注入与背景色匹配
    SystemBars: {
      // style: DEFAULT 让系统根据背景自动选择深色/浅色状态栏图标
      style: 'DEFAULT',
    },
    SplashScreen: {
      // 启动页保持暖色系，与 App 整体风格一致
      backgroundColor: '#FAF6F0',
      showSpinner: false,
    },
  },
};

export default config;
