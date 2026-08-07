// 阿里云函数计算（FC）入口 — 考研工作台数据同步服务
// 存储：OSS（一个 JSON 文件存所有设备数据，适合个人低频场景）
// 运行时：Node.js 16+（内置运行时，HTTP 触发器）

const OSS = require('ali-oss');

// ========== OSS 客户端（通过环境变量配置） ==========
const client = new OSS({
  region: process.env.OSS_REGION || 'oss-cn-hangzhou',
  accessKeyId: process.env.OSS_AK_ID,
  accessKeySecret: process.env.OSS_AK_SECRET,
  bucket: process.env.OSS_BUCKET,
  secure: true, // 强制 HTTPS 访问 OSS
});

const DB_OBJECT_KEY = 'kaoyan-sync/devices.json';

// 读取数据库（不存在时返回空结构）
async function readDB() {
  try {
    const result = await client.get(DB_OBJECT_KEY);
    return JSON.parse(result.content.toString('utf-8'));
  } catch (e) {
    if (e.code === 'NoSuchKey' || e.status === 404) {
      return { devices: {} };
    }
    throw e;
  }
}

// 写入数据库
async function writeDB(db) {
  await client.put(DB_OBJECT_KEY, Buffer.from(JSON.stringify(db), 'utf-8'));
}

// 解析请求体
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
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

// 统一 JSON 响应（含 CORS）
function sendJSON(res, status, data) {
  const body = JSON.stringify(data);
  res.setStatusCode(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.send(body);
}

// ========== HTTP 触发器入口 ==========
module.exports.handler = async (req, resp, context) => {
  const method = req.method;
  const pathname = req.path || new URL(req.url, 'http://x').pathname;

  // CORS 预检
  if (method === 'OPTIONS') {
    resp.setStatusCode(204);
    resp.setHeader('Access-Control-Allow-Origin', '*');
    resp.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    resp.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    resp.send('');
    return;
  }

  try {
    // 注册设备
    if (method === 'POST' && pathname === '/api/register') {
      const body = await parseBody(req);
      const deviceName = body.deviceName || 'Unknown';
      const deviceId = 'dev_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const db = await readDB();
      db.devices[deviceId] = { data: {}, updatedAt: Date.now(), deviceName };
      await writeDB(db);
      console.log(`[注册] ${deviceName} -> ${deviceId}`);
      return sendJSON(resp, 200, { deviceId });
    }

    // 上传数据
    if (method === 'POST' && pathname === '/api/sync') {
      const body = await parseBody(req);
      const { deviceId, data, deviceName } = body;
      if (!deviceId || !data) {
        return sendJSON(resp, 400, { error: 'Missing deviceId or data' });
      }
      const db = await readDB();
      const existing = db.devices[deviceId];
      db.devices[deviceId] = {
        data,
        updatedAt: Date.now(),
        deviceName: deviceName || (existing && existing.deviceName) || 'Unknown',
      };
      await writeDB(db);
      console.log(`[上传] ${deviceId}`);
      return sendJSON(resp, 200, { success: true, updatedAt: db.devices[deviceId].updatedAt });
    }

    // 下载数据
    if (method === 'GET' && pathname.startsWith('/api/sync/')) {
      const deviceId = decodeURIComponent(pathname.replace('/api/sync/', ''));
      const db = await readDB();
      const device = db.devices[deviceId];
      if (!device) {
        return sendJSON(resp, 404, { error: 'Device not found' });
      }
      console.log(`[下载] ${deviceId}`);
      return sendJSON(resp, 200, { data: device.data, updatedAt: device.updatedAt });
    }

    // 设备列表
    if (method === 'GET' && pathname === '/api/devices') {
      const db = await readDB();
      const devices = Object.keys(db.devices).map((deviceId) => ({
        deviceId,
        deviceName: db.devices[deviceId].deviceName,
        updatedAt: db.devices[deviceId].updatedAt,
      })).sort((a, b) => b.updatedAt - a.updatedAt);
      return sendJSON(resp, 200, { devices });
    }

    // 健康检查
    if (method === 'GET' && (pathname === '/' || pathname === '/api/health')) {
      return sendJSON(resp, 200, { status: 'ok', time: new Date().toISOString(), storage: 'oss' });
    }

    sendJSON(resp, 404, { error: 'Not found', path: pathname });
  } catch (e) {
    console.error('请求处理错误:', e.message);
    sendJSON(resp, 500, { error: e.message });
  }
};
