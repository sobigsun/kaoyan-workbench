// 考研工作台 Service Worker - 离线缓存
// 策略：app-shell 优先缓存，静态资源缓存优先，导航网络优先+超时回退

const CACHE_VERSION = 'kaoyan-v3';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icon-maskable.svg',
];

// 网络请求超时（3秒），超时后回退缓存
function fetchWithTimeout(request, timeoutMs) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(null);
    }, timeoutMs);
    fetch(request).then((response) => {
      clearTimeout(timer);
      resolve(response);
    }).catch(() => {
      clearTimeout(timer);
      resolve(null);
    });
  });
}

// 安装：预缓存 app shell（容错，单个失败不影响整体）
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      // 逐个缓存，某个失败不影响其他
      await Promise.allSettled(
        APP_SHELL.map((url) => cache.add(url))
      );
      await self.skipWaiting();
    })()
  );
});

// 激活：清理旧缓存并接管页面
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// 请求拦截
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理同源 GET 请求
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // 导航请求：网络优先（3秒超时），失败回退到缓存的 index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const response = await fetchWithTimeout(request, 3000);
        if (response) {
          const copy = response.clone();
          const cache = await caches.open(CACHE_VERSION);
          cache.put('/index.html', copy);
          return response;
        }
        // 超时或失败：回退缓存
        const cached = await caches.match('/index.html');
        if (cached) return cached;
        // 最后兜底
        return new Response('正在加载...', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      })()
    );
    return;
  }

  // 静态资源（带 hash 的 JS/CSS）：缓存优先（永久缓存）
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          const copy = response.clone();
          const cache = await caches.open(CACHE_VERSION);
          cache.put(request, copy);
          return response;
        } catch {
          return new Response('', { status: 404 });
        }
      })()
    );
    return;
  }

  // 其他同源资源：缓存优先，回退网络
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        return await fetch(request);
      } catch {
        return new Response('', { status: 404 });
      }
    })()
  );
});
