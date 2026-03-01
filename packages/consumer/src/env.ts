export type Env = {
  DB: D1Database;
  SELF: Service;
  RESEND_API_KEY: string;
};

export type ConsumerTaskType = 'EMAIL_PROCESS' | 'NOTIFICATION_SEND';
