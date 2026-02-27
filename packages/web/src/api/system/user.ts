import { Alova } from '@/utils/http/alova/index';

/**
 * @description: 获取用户信息
 */
export function getUserInfo() {
  return Alova.Get<InResult>('/auth/me');
}

/**
 * @description: 用户登录
 */
export function login(params) {
  return Alova.Post<InResult>('/auth/login', params);
}

/**
 * @description: 用户修改密码
 */
export function changePassword(params) {
  return Alova.Post('/auth/password/change', params);
}

/**
 * @description: 用户登出
 */
export function logout(params) {
  return Alova.Post('/auth/logout', params);
}
