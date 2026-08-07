import { AIConfig, ChatMessage } from '../types';

const AI_CONFIG_KEY = 'kaoyan_ai_config';

// 平台预设配置
export const PLATFORM_PRESETS: Record<string, {
  label: string;
  defaultModel: string;
  modelOptions: string[];
  defaultBaseUrl: string;
  apiKeyUrl: string;
  docsUrl: string;
  supportsMultimodal: boolean;
}> = {
  deepseek: {
    label: 'DeepSeek',
    defaultModel: 'deepseek-chat',
    modelOptions: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-v4-flash', 'deepseek-v4-pro'],
    defaultBaseUrl: 'https://api.deepseek.com',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    docsUrl: 'https://api-docs.deepseek.com/',
    supportsMultimodal: false,
  },
  kimi: {
    label: 'Kimi (Moonshot)',
    defaultModel: 'kimi-k2.6',
    modelOptions: ['kimi-k2.6', 'kimi-k2.5', 'kimi-k2', 'kimi-k2-thinking', 'moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    apiKeyUrl: 'https://platform.kimi.com/console/api-keys',
    docsUrl: 'https://platform.kimi.com/docs/api/chat',
    supportsMultimodal: true,
  },
};

// 文件类型分类
export type FileCategory = 'text' | 'image' | 'video' | 'office-docx' | 'office-xlsx' | 'office-pptx' | 'pdf' | 'other';

export interface ProcessedFile {
  file: File;
  category: FileCategory;
  content: string; // 文本内容或 base64 data URL
  name: string;
  size: number;
  mimeType: string;
}

// 文件大小限制
export const FILE_SIZE_LIMITS: Record<FileCategory, number> = {
  text: 200 * 1024,           // 200KB
  image: 10 * 1024 * 1024,   // 10MB
  video: 30 * 1024 * 1024,   // 30MB
  'office-docx': 20 * 1024 * 1024,  // 20MB
  'office-xlsx': 20 * 1024 * 1024,  // 20MB
  'office-pptx': 20 * 1024 * 1024,  // 20MB
  pdf: 10 * 1024 * 1024,     // 10MB
  other: 5 * 1024 * 1024,   // 5MB
};

const TEXT_EXTS = ['.txt', '.md', '.csv', '.json', '.log', '.xml', '.yaml', '.yml',
  '.py', '.js', '.ts', '.tsx', '.jsx', '.html', '.css', '.java', '.c', '.cpp',
  '.go', '.rs', '.sql', '.sh', '.ini', '.conf', '.vue', '.php', '.rb', '.swift', '.kt'];

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.ico', '.tiff'];
const VIDEO_EXTS = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm', '.m4v', '.3gp'];

export function getFileCategory(filename: string): FileCategory {
  const ext = '.' + filename.split('.').pop()?.toLowerCase();

  if (TEXT_EXTS.includes(ext)) return 'text';
  if (IMAGE_EXTS.includes(ext)) return 'image';
  if (VIDEO_EXTS.includes(ext)) return 'video';
  if (ext === '.docx') return 'office-docx';
  if (ext === '.xlsx' || ext === '.xls') return 'office-xlsx';
  if (ext === '.pptx' || ext === '.ppt') return 'office-pptx';
  if (ext === '.pdf') return 'pdf';

  // 通过 MIME 类型判断
  const mime = getMimeType(filename);
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';

  return 'other';
}

export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    txt: 'text/plain', md: 'text/markdown', csv: 'text/csv', json: 'application/json',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml', tiff: 'image/tiff',
    mp4: 'video/mp4', avi: 'video/x-msvideo', mov: 'video/quicktime',
    wmv: 'video/x-ms-wmv', mkv: 'video/x-matroska', webm: 'video/webm',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    pdf: 'application/pdf',
  };
  return mimeMap[ext || ''] || 'application/octet-stream';
}

export function getFileSizeLimit(category: FileCategory): number {
  return FILE_SIZE_LIMITS[category];
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// 读取文件为文本
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

// 读取文件为 base64 Data URL
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

// 读取文件为 ArrayBuffer
function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

// 处理单个文件
export async function processFile(file: File): Promise<ProcessedFile> {
  const category = getFileCategory(file.name);
  const mimeType = getMimeType(file.name);

  switch (category) {
    case 'text': {
      const content = await readFileAsText(file);
      return { file, category, content, name: file.name, size: file.size, mimeType };
    }
    case 'image': {
      const content = await readFileAsDataURL(file);
      return { file, category, content, name: file.name, size: file.size, mimeType };
    }
    case 'video': {
      const content = await readFileAsDataURL(file);
      return { file, category, content, name: file.name, size: file.size, mimeType };
    }
    case 'office-docx': {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ arrayBuffer });
      return { file, category, content: result.value, name: file.name, size: file.size, mimeType };
    }
    case 'office-xlsx': {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      let text = '';
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        text += `=== 工作表: ${sheetName} ===\n`;
        text += XLSX.utils.sheet_to_txt(sheet);
        text += '\n\n';
      }
      return { file, category, content: text, name: file.name, size: file.size, mimeType };
    }
    case 'office-pptx': {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(arrayBuffer);
      let text = '';
      const slideFiles = Object.keys(zip.files)
        .filter(name => name.match(/^ppt\/slides\/slide\d+\.xml$/))
        .sort((a, b) => {
          const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
          const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
          return numA - numB;
        });
      for (const slideFile of slideFiles) {
        const slideNum = slideFile.match(/slide(\d+)/)?.[1] || '?';
        const xmlContent = await zip.files[slideFile].async('text');
        // 提取 <a:t> 标签中的文本
        const texts = xmlContent.match(/<a:t>([^<]*)<\/a:t>/g) || [];
        const slideText = texts.map(t => t.replace(/<\/?a:t>/g, '')).join(' ');
        if (slideText) {
          text += `=== 幻灯片 ${slideNum} ===\n${slideText}\n\n`;
        }
      }
      return { file, category, content: text || '（未提取到文本）', name: file.name, size: file.size, mimeType };
    }
    case 'pdf': {
      // PDF 尝试文本提取（简单方式）
      try {
        const arrayBuffer = await readFileAsArrayBuffer(file);
        const text = new TextDecoder().decode(arrayBuffer);
        // 提取可读文本片段
        const readableText = text.replace(/[^\x20-\x7E\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\n]/g, ' ').replace(/\s+/g, ' ').trim();
        if (readableText.length > 50) {
          return { file, category, content: readableText, name: file.name, size: file.size, mimeType };
        }
        return { file, category, content: '（PDF 文件无法提取文本，建议转换为文本后上传）', name: file.name, size: file.size, mimeType };
      } catch {
        return { file, category, content: '（PDF 文件读取失败）', name: file.name, size: file.size, mimeType };
      }
    }
    default: {
      // 其他类型尝试文本读取
      try {
        const content = await readFileAsText(file);
        return { file, category: 'other', content, name: file.name, size: file.size, mimeType };
      } catch {
        return { file, category: 'other', content: '（不支持的文件类型）', name: file.name, size: file.size, mimeType };
      }
    }
  }
}

// 读取 AI 配置
export function getAIConfig(): AIConfig | null {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AIConfig;
  } catch {
    return null;
  }
}

// 保存 AI 配置
export function saveAIConfig(config: AIConfig): void {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
}

// 清除 AI 配置
export function clearAIConfig(): void {
  localStorage.removeItem(AI_CONFIG_KEY);
}

// 遮掩 API Key 用于显示
export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '****';
  return key.slice(0, 4) + '****' + key.slice(-4);
}

// 测试连接
export async function testConnection(config: AIConfig): Promise<{ success: boolean; message: string }> {
  try {
    const url = config.baseUrl.replace(/\/+$/, '') + '/chat/completions';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
        stream: false,
      }),
    });

    if (response.ok) {
      return { success: true, message: '连接成功！API 配置有效。' };
    }

    let errorMsg = `HTTP ${response.status}`;
    try {
      const errorBody = await response.json();
      if (errorBody.error?.message) {
        errorMsg += ' - ' + errorBody.error.message;
      }
    } catch {}
    return { success: false, message: `连接失败：${errorMsg}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `连接失败：${msg}` };
  }
}

// 发送聊天请求（支持多模态）
export async function sendChatMessage(
  config: AIConfig,
  messages: ChatMessage[],
  processedFilesMap?: Record<number, ProcessedFile[]>
): Promise<string> {
  const url = config.baseUrl.replace(/\/+$/, '') + '/chat/completions';
  const preset = PLATFORM_PRESETS[config.platform];
  const supportsMultimodal = preset?.supportsMultimodal ?? false;

  // 构建消息列表
  const apiMessages = messages.map((msg, i) => {
    const files = processedFilesMap?.[i];

    // 如果没有附件，直接返回文本内容
    if (!files || files.length === 0) {
      return { role: msg.role, content: msg.content };
    }

    // DeepSeek 不支持多模态，只发送文本
    if (!supportsMultimodal) {
      // 将所有文件内容提取为文本
      let textContent = msg.content;
      const textFiles = files.filter(f => f.category === 'text' || f.category === 'office-docx' || f.category === 'office-xlsx' || f.category === 'office-pptx' || f.category === 'pdf' || f.category === 'other');
      const unsupportedFiles = files.filter(f => f.category === 'image' || f.category === 'video');

      if (textFiles.length > 0) {
        const fileContents = textFiles.map(f => `=== ${f.name} ===\n${f.content}`).join('\n\n');
        textContent = `${fileContents}\n\n---\n\n${msg.content}`;
      }

      if (unsupportedFiles.length > 0) {
        const names = unsupportedFiles.map(f => f.name).join(', ');
        textContent += `\n\n[注意: 当前平台不支持图片/视频，已跳过 ${names}]`;
      }

      return { role: msg.role, content: textContent };
    }

    // Kimi 支持多模态：构建 content 数组
    const contentParts: any[] = [];

    // 先添加文件内容
    for (const file of files) {
      if (file.category === 'image') {
        contentParts.push({
          type: 'image_url',
          image_url: { url: file.content },
        });
      } else if (file.category === 'video') {
        contentParts.push({
          type: 'video_url',
          video_url: { url: file.content },
        });
      } else {
        // 文本类文件
        contentParts.push({
          type: 'text',
          text: `=== ${file.name} ===\n${file.content}`,
        });
      }
    }

    // 添加用户的问题
    contentParts.push({
      type: 'text',
      text: msg.content,
    });

    return { role: msg.role, content: contentParts };
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: '你是一个考研学习助手，帮助用户解答英语、教育学和政治等考研相关问题。请给出简洁、准确的回答。' },
        ...apiMessages,
      ],
      stream: false,
    }),
  });

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const errorBody = await response.json();
      if (errorBody.error?.message) {
        errorMsg += ' - ' + errorBody.error.message;
      }
    } catch {}
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '（无回复）';
}
