import { getDb } from '../db/drizzle';
import { roles, createRoleSchema, updateRoleSchema, z } from '@bd2-automata/shared';
import { eq, and, sql } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { parseId } from '../utils/id';
import type { PaginationQuery } from '@bd2-automata/shared';
import { paginate } from '../utils/pagination';
import { rolesToPermissions } from '@bd2-automata/shared';

/**
 * 分页查询角色
 */
export const findRoles = async (d1: D1Database, pagination: PaginationQuery) => {
  const db = getDb(d1);
  const where = eq(roles.isDeleted, false);
  const query = db.select().from(roles).where(where);
  const countSql = sql`SELECT count(*) as count FROM ${roles} WHERE ${where}`;
  return paginate(db, query, countSql, pagination);
};

/**
 * 根据 ID 查找单个角色
 */
export const findRoleById = async (d1: D1Database, id: string) => {
  const db = getDb(d1);
  const role = await db.query.roles.findFirst({
    where: and(eq(roles.id, parseId(id)), eq(roles.isDeleted, false)),
  });
  if (!role) {
    throw new HTTPException(404, { message: '角色未找到' });
  }
  return role;
};

/**
 * 创建一个新角色
 */
export const createRole = async (d1: D1Database, role: z.infer<typeof createRoleSchema>) => {
  const db = getDb(d1);
  return await db.insert(roles).values(role).returning();
};

/**
 * 根据 ID 更新角色信息
 */
export const updateRole = async (d1: D1Database, id: string, role: z.infer<typeof updateRoleSchema>) => {
  const db = getDb(d1);
  const result = await db.update(roles).set({ ...role, updatedAt: new Date().toISOString() })
    .where(and(eq(roles.id, parseId(id)), eq(roles.isDeleted, false)))
    .returning();
  if (result.length === 0) {
    throw new HTTPException(404, { message: '角色未找到，无法更新' });
  }
  return result[0];
};

/**
 * 根据 ID 软删除角色
 */
export const deleteRole = async (d1: D1Database, id: string) => {
  const db = getDb(d1);
  const result = await db.update(roles)
    .set({ isDeleted: true, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(and(eq(roles.id, parseId(id)), eq(roles.isDeleted, false)))
    .returning();
  if (result.length === 0) {
    throw new HTTPException(404, { message: '角色未找到，无法删除' });
  }
  return result[0];
};

/**
 * 为角色分配权限（先删后增，硬删关联表）
 */
export const assignPermissionsToRole = async (d1: D1Database, roleId: string, permissionIds: string[]) => {
  const db = getDb(d1);
  const parsedRoleId = parseId(roleId, 'roleId');
  const parsedPermissionIds = permissionIds.map((pid) => parseId(pid, 'permissionId'));

  await db.transaction(async (tx) => {
    await tx.delete(rolesToPermissions).where(eq(rolesToPermissions.roleId, parsedRoleId));
    if (parsedPermissionIds.length > 0) {
      const newAssignments = parsedPermissionIds.map(permissionId => ({
        roleId: parsedRoleId,
        permissionId,
      }));
      await tx.insert(rolesToPermissions).values(newAssignments);
    }
  });

  return { message: '权限已成功分配。' };
};

/**
 * 查询角色的权限列表
 */
export const getRolePermissions = async (d1: D1Database, roleId: string) => {
  const db = getDb(d1);
  const parsedRoleId = parseId(roleId, 'roleId');

  const result = await db.query.rolesToPermissions.findMany({
    where: eq(rolesToPermissions.roleId, parsedRoleId),
    with: { permission: true },
  });

  return result.map(r => r.permission);
};
