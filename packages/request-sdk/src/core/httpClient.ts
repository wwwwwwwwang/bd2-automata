import type { ApiResponse, RequestClientConfig, RequestOptions } from './types';

const withQuery = (url: string, query?: RequestOptions['query']) => {
  if (!query) return url;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    searchParams.set(key, String(value));
  }

  const queryString = searchParams.toString();
  if (!queryString) return url;
  return `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
};

const withBaseUrl = (baseUrl: string, path: string) => {
  if (!path) return baseUrl;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

export const createRequestClient = (config: RequestClientConfig) => {
  const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
    const { query, body, headers, ...init } = options;

    const target = withQuery(withBaseUrl(config.baseUrl, path), query);

    const requestHeaders = new Headers(config.headers);
    if (headers) {
      const runtimeHeaders = new Headers(headers);
      runtimeHeaders.forEach((value, key) => requestHeaders.set(key, value));
    }

    const requestInit: RequestInit = {
      ...init,
      headers: requestHeaders,
    };

    if (body !== undefined) {
      requestHeaders.set('Content-Type', 'application/json');
      requestInit.body = JSON.stringify(body);
    }

    const response = await fetch(target, requestInit);

    let payload: ApiResponse<T>;
    try {
      payload = (await response.json()) as ApiResponse<T>;
    } catch {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    if (!response.ok || !payload.success) {
      throw new Error(payload.error ?? `Request failed: ${response.status} ${response.statusText}`);
    }

    return payload.data as T;
  };

  return {
    request,
    get: <T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
      request<T>(path, { ...options, method: 'GET' }),
    post: <T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
      request<T>(path, { ...options, method: 'POST', body }),
    put: <T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
      request<T>(path, { ...options, method: 'PUT', body }),
    delete: <T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
      request<T>(path, { ...options, method: 'DELETE' }),
  };
};

export type RequestClient = ReturnType<typeof createRequestClient>;
