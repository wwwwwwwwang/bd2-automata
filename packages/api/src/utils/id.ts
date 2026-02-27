import { HTTPException } from 'hono/http-exception';

/**
 * 将路由参数中的 string ID 解析为安全整数。
 * 所有接口层 ID 统一以 string 传输，service 层通过此函数转换。
 */
export const parseId = (id: string, fieldName = 'id'): number => {
  if (!/^\d+$/.test(id)) {
    throw new HTTPException(400, { message: `${fieldName} 必须为数字字符串` });
  }
  const parsed = Number(id);
  if (!Number.isSafeInteger(parsed)) {
    throw new HTTPException(400, { message: `${fieldName} 超出安全整数范围` });
  }
  return parsed;
};
