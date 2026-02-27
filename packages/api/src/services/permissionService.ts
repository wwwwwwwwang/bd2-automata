import { getDb } from '../db/drizzle';
import { usersToRoles, rolesToPermissions, permissions, createPermissionSchema, updatePermissionSchema, z } from '@bd2-automata/shared';
import { eq, and, sql } from 'drizzle-orm';
import type { PaginationQuery } from '@bd2-automata/shared';
import { HTTPException } from 'hono/http-exception';
import { parseId } from '../utils/id';
import { paginate } from '../utils/pagination';

/**
 * 分页查询权限
 */
export const findPermissions = async (d1: D1Database, pagination: PaginationQuery) => {
  const db = getDb(d1);
  const where = eq(permissions.isDeleted, false);
  const query = db.select().from(permissions).where(where);
  const countSql = sql`SELECT count(*) as count FROM ${permissions} WHERE ${where}`;
  return paginate(db, query, countSql, pagination);
};

/**
 * 根据 ID 查找单个权限
 */
export const findPermissionById = async (d1: D1Database, id: string) => {
  const db = getDb(d1);
  const permission = await db.query.permissions.findFirst({
    where: and(eq(permissions.id, parseId(id)), eq(permissions.isDeleted, false)),
  });
  if (!permission) {
    throw new HTTPException(404, { message: '权限未找到' });
  }
  return permission;
};

/**
 * 创建一个新权限
 */
export const createPermission = async (d1: D1Database, data: z.infer<typeof createPermissionSchema>) => {
  const db = getDb(d1);
  const { parentId, ...rest } = data;
  const values = {
    ...rest,
    ...(parentId ? { parentId: parseId(parentId, 'parentId') } : {}),
  };
  const [newPermission] = await db.insert(permissions).values(values).returning();
  return newPermission;
};

/**
 * 更新一个权限
 */
export const updatePermission = async (d1: D1Database, id: string, data: z.infer<typeof updatePermissionSchema>) => {
  const db = getDb(d1);
  const { parentId, ...rest } = data;
  const values = {
    ...rest,
    updatedAt: new Date().toISOString(),
    ...(parentId ? { parentId: parseId(parentId, 'parentId') } : {}),
  };
  const [updatedPermission] = await db.update(permissions).set(values)
    .where(and(eq(permissions.id, parseId(id)), eq(permissions.isDeleted, false)))
    .returning();
  if (!updatedPermission) {
    throw new HTTPException(404, { message: '权限未找到，无法更新' });
  }
  return updatedPermission;
};

/**
 * 软删除一个权限
 */
export const deletePermission = async (d1: D1Database, id: string) => {
  const db = getDb(d1);
  const result = await db.update(permissions)
    .set({ isDeleted: true, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(and(eq(permissions.id, parseId(id)), eq(permissions.isDeleted, false)))
    .returning();
  if (result.length === 0) {
    throw new HTTPException(404, { message: '权限未找到，无法删除' });
  }
  return { message: '权限已成功删除。' };
};

/**
 * 获取指定用户的所有权限（单次 JOIN 查询）
 */
export const getUserPermissions = async (d1: D1Database, userId: string | number) => {
  const db = getDb(d1);
  const parsedUserId = typeof userId === 'string' ? parseId(userId, 'userId') : userId;

  const rows = await db
    .selectDistinct({
      id: permissions.id,
      code: permissions.code,
      name: permissions.name,
      type: permissions.type,
      parentId: permissions.parentId,
      menuPath: permissions.menuPath,
      icon: permissions.icon,
      description: permissions.description,
      httpMethod: permissions.httpMethod,
      apiPath: permissions.apiPath,
      sortOrder: permissions.sortOrder,
      createdAt: permissions.createdAt,
      updatedAt: permissions.updatedAt,
      isDeleted: permissions.isDeleted,
      deletedAt: permissions.deletedAt,
    })
    .from(usersToRoles)
    .innerJoin(rolesToPermissions, eq(usersToRoles.roleId, rolesToPermissions.roleId))
    .innerJoin(permissions, eq(rolesToPermissions.permissionId, permissions.id))
    .where(and(eq(usersToRoles.userId, parsedUserId), eq(permissions.isDeleted, false)));

  return rows;
};
