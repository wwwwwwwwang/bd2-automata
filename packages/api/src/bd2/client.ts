/**
 * BD2 外部 API 通用 HTTP 客户端
 *
 * 提供 createClient 工厂函数，为不同外部服务（Firebase、Neon、BD2 Webshop 等）
 * 创建各自独立的客户端实例，避免在每次请求时重复拼接 baseUrl 和 headers。
 *
 * 支持三种请求体格式：
 *  - JSON body（application/json）
 *  - Form body（application/x-www-form-urlencoded）
 *  - 无 body（GET 请求）
 */

export interface ClientOptions {
  /** 服务的基础 URL，末尾斜杠会被自动去除 */
  baseUrl: string;
  /** 每次请求都会携带的默认 headers，可被单次请求的 headers 覆盖 */
  defaultHeaders?: Record<string, string>;
}

export interface RequestOptions {
  /** 覆盖或追加到 defaultHeaders 的请求级 headers */
  headers?: Record<string, string>;
  /** 附加到 URL 的查询参数，自动序列化为 ?key=value&... */
  query?: Record<string, string>;
  /** JSON 请求体，会自动设置 Content-Type: application/json */
  body?: unknown;
  /** Form 格式请求体（已编码字符串），会自动设置 Content-Type: application/x-www-form-urlencoded */
  formBody?: string;
}

/**
 * 将查询参数对象附加到 URL
 */
const withQuery = (url: string, query?: Record<string, string>) => {
  if (!query) return url;
  const params = new URLSearchParams(query);
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
};

/**
 * 创建一个绑定了 baseUrl 和默认 headers 的 HTTP 客户端。
 *
 * 用法：
 * ```ts
 * const client = createClient({ baseUrl: 'https://example.com', defaultHeaders: { 'x-api-key': 'xxx' } });
 * const data = await client.get<MyType>('/api/resource');
 * const result = await client.post<MyType>('/api/resource', { body: { key: 'value' } });
 * ```
 *
 * 错误处理：HTTP 状态码非 2xx 时抛出包含状态码和响应体的 Error。
 */
export const createClient = ({ baseUrl, defaultHeaders = {} }: ClientOptions) => {
  const request = async <T>(
    method: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> => {
    const { headers = {}, query, body, formBody } = options;

    const url = withQuery(`${baseUrl.replace(/\/$/, '')}${path}`, query);

    // 合并 headers：defaultHeaders 优先级低，单次请求 headers 可覆盖
    const mergedHeaders: Record<string, string> = { ...defaultHeaders, ...headers };

    let bodyInit: BodyInit | undefined;
    if (formBody !== undefined) {
      // Form 格式：Firebase token 刷新接口使用此格式
      mergedHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
      bodyInit = formBody;
    } else if (body !== undefined) {
      // JSON 格式：大多数接口使用此格式
      mergedHeaders['Content-Type'] = 'application/json';
      bodyInit = JSON.stringify(body);
    }

    const response = await fetch(url, {
      method,
      headers: mergedHeaders,
      body: bodyInit,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`BD2 API error ${response.status}: ${text}`);
    }

    return response.json() as Promise<T>;
  };

  return {
    /** 发起 GET 请求，不支持 body */
    get: <T>(path: string, options?: Omit<RequestOptions, 'body' | 'formBody'>) =>
      request<T>('GET', path, options),
    /** 发起 POST 请求，支持 JSON body 或 form body */
    post: <T>(path: string, options?: RequestOptions) =>
      request<T>('POST', path, options),
  };
};
