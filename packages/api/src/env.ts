/**
 * Cloudflare Worker 环境绑定类型。
 */
export type Env = {
  DB: D1Database;
  CONSUMER: Service;
  // 邮件处理边界开关：
  // - api: 由 API Worker 本地处理（当前默认）
  // - consumer: 委托给 Consumer Worker 的 /process-emails
  EMAIL_PROCESS_MODE?: 'api' | 'consumer';
  JWT_SECRET: string;
  PERMISSION_CACHE: KVNamespace;
  RESEND_API_KEY: string;
  RESEND_WEBHOOK_SECRET: string;
  CORS_ORIGIN: string;
};
