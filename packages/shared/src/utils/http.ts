/**
 * 基于原生 fetch 的轻量级封装，提供类似 axios 的开发体验
 * 专为 Cloudflare Workers (Edge 环境) 优化，零外部依赖
 */

// 定义我们自己的请求配置项，扩展原生 RequestInit
export interface RequestOptions extends Omit<RequestInit, 'body'> {
  // 支持直接传对象，自动拼接为 ?a=1&b=2
  params?: Record<string, string | number | boolean>;
  // 支持直接传 JSON 对象，自动序列化并设置 Content-Type
  json?: Record<string, any>;
  // 如果需要发纯文本或 FormData，依然可以用 rawBody
  rawBody?: BodyInit; 
}

// 核心请求函数，支持泛型推导返回值类型 <T>
export async function request<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
  const { params, json, rawBody, headers, ...restOptions } = options;
  
  // 1. 处理 URL 参数 (Query String)
  let finalUrl = url;
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    finalUrl += finalUrl.includes('?') ? `&${searchParams.toString()}` : `?${searchParams.toString()}`;
  }

  // 2. 处理请求头与请求体 (JSON)
  const fetchHeaders = new Headers(headers);
  let fetchBody = rawBody;

  if (json) {
    fetchHeaders.set('Content-Type', 'application/json');
    fetchBody = JSON.stringify(json);
  }

  // 3. 发送请求
  const response = await fetch(finalUrl, {
    headers: fetchHeaders,
    body: fetchBody,
    ...restOptions,
  });

  // 4. 统一错误拦截 (模拟 Axios 的 catch 机制)
  if (!response.ok) {
    // 尝试解析后端的错误信息
    let errorMsg = response.statusText;
    try {
      const errorData = await response.json();
      errorMsg = errorData.message || JSON.stringify(errorData);
    } catch {
      errorMsg = await response.text();
    }
    
    throw new Error(`[HTTP ${response.status}] Request failed: ${errorMsg}`);
  }

  // 5. 自动解析 JSON 响应
  // (在 BD2 的接口中，绝大多数返回的都是 JSON)
  return (await response.json()) as T;
}

// 导出一组语法糖，用法和 axios 一模一样
export const http = {
  get: <T>(url: string, options?: Omit<RequestOptions, 'json' | 'rawBody'>) => 
    request<T>(url, { method: 'GET', ...options }),
    
  post: <T>(url: string, data?: any, options?: Omit<RequestOptions, 'json'>) => 
    request<T>(url, { method: 'POST', json: data, ...options }),
};