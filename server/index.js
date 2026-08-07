// 零依赖后端：仅使用 Node 内置模块 + JSON 文件存储
// 避免原生模块（better-sqlite3）在低版本 Node 下的编译问题
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'devices.json');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 读取数据库
function readDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('读取数据库失败:', e.message);
  }
  return { devices: {} }; // { devices: { deviceId: { data, updatedAt, deviceName } } }
}

// 写入数据库（同步写入保证一致性）
function writeDB(db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    return true;
  } catch (e) {
    console.error('写入数据库失败:', e.message);
    return false;
  }
}

// 解析请求体
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // 限制 50MB
      if (body.length > 50 * 1024 * 1024) {
        reject(new Error('Body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// 发送 JSON 响应
function sendJSON(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

// 处理 OPTIONS 预检
function handleCORS(req, res) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end();
}

// 创建服务器
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method;

  // CORS 预检
  if (method === 'OPTIONS') {
    return handleCORS(req, res);
  }

  try {
    // 注册设备
    if (method === 'POST' && pathname === '/api/register') {
      const body = await parseBody(req);
      const deviceName = body.deviceName || 'Unknown';
      const deviceId = 'dev_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const db = readDB();
      db.devices[deviceId] = {
        data: {},
        updatedAt: Date.now(),
        deviceName,
      };
      writeDB(db);
      console.log(`[注册] ${deviceName} -> ${deviceId}`);
      return sendJSON(res, 200, { deviceId });
    }

    // 上传数据
    if (method === 'POST' && pathname === '/api/sync') {
      const body = await parseBody(req);
      const { deviceId, data, deviceName } = body;
      if (!deviceId || !data) {
        return sendJSON(res, 400, { error: 'Missing deviceId or data' });
      }
      const db = readDB();
      const existing = db.devices[deviceId];
      db.devices[deviceId] = {
        data,
        updatedAt: Date.now(),
        deviceName: deviceName || existing?.deviceName || 'Unknown',
      };
      writeDB(db);
      console.log(`[上传] ${deviceId} (${db.devices[deviceId].deviceName})`);
      return sendJSON(res, 200, { success: true, updatedAt: db.devices[deviceId].updatedAt });
    }

    // 下载数据
    if (method === 'GET' && pathname.startsWith('/api/sync/')) {
      const deviceId = decodeURIComponent(pathname.replace('/api/sync/', ''));
      const db = readDB();
      const device = db.devices[deviceId];
      if (!device) {
        return sendJSON(res, 404, { error: 'Device not found' });
      }
      console.log(`[下载] ${deviceId} (${device.deviceName})`);
      return sendJSON(res, 200, { data: device.data, updatedAt: device.updatedAt });
    }

    // 设备列表
    if (method === 'GET' && pathname === '/api/devices') {
      const db = readDB();
      const devices = Object.entries(db.devices).map(([deviceId, info]) => ({
        deviceId,
        deviceName: info.deviceName,
        updatedAt: info.updatedAt,
      })).sort((a, b) => b.updatedAt - a.updatedAt);
      return sendJSON(res, 200, { devices });
    }

    // 健康检查
    if (method === 'GET' && (pathname === '/' || pathname === '/api/health')) {
      return sendJSON(res, 200, { status: 'ok', time: new Date().toISOString() });
    }

    // 404
    sendJSON(res, 404, { error: 'Not found', path: pathname });
  } catch (e) {
    console.error('请求处理错误:', e.message);
    sendJSON(res, 500, { error: e.message });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log('  考研工作台 - 数据同步服务器');
  console.log('========================================');
  console.log(`本机访问:   http://localhost:${PORT}`);
  console.log(`局域网访问: http://<本机IP>:${PORT}`);
  console.log('');
  console.log('使用方法:');
  console.log('  1. 在手机/平板打开「我的」页面');
  console.log('  2. 在「数据同步」卡片中输入上面的地址');
  console.log('  3. 点击「连接服务器」注册设备');
  console.log('  4. 点击「立即同步」上传/下载数据');
  console.log('========================================');
  console.log('');
  console.log('等待设备连接...');
  console.log('');
});
