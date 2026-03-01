export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface RequestClientConfig {
  baseUrl: string;
  headers?: HeadersInit;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  query?: object;
  body?: unknown;
}
