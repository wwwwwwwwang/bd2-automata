import { getDb } from '../db/drizzle';
import { roles, createRoleSchema, updateRoleSchema, z } from '@bd2-automata/shared';
import { eq, and, sql } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
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
export const findRoleById = async (d1: D1Database, id: number) => {
  const db = getDb(d1);
  const [role] = await db.select().from(roles)
    .where(and(eq(roles.id, id), eq(roles.isDeleted, false)));
  if (!role) {
    throw new HTTPException(404, { message: '角色未找到' });
  }
  return role;
};

/**
 * 创建一个新角色
 */
export const createRole = async (d1: D1Database, roleData: z.infer<typeof createRoleSchema>) => {
  const db = getDb(d1);

  try {
    const newRole = {
      ...roleData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const [inserted] = await db.insert(roles).values(newRole).returning();
    return inserted;
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      throw new HTTPException(409, { message: '角色名称已存在' });
    }
    throw new HTTPException(500, { message: '创建角色时发生未知错误' });
  }
};

/**
 * 根据 ID 更新角色信息
 */
export const updateRole = async (d1: D1Database, id: number, roleData: z.infer<typeof updateRoleSchema>) => {
  const db = getDb(d1);
  const [updated] = await db.update(roles).set({ ...roleData, updatedAt: new Date().toISOString() })
    .where(and(eq(roles.id, id), eq(roles.isDeleted, false)))
    .returning();
  if (!updated) {
    throw new HTTPException(404, { message: '角色未找到，无法更新' });
  }
  return updated;
};

/**
 * 根据 ID 软删除角色
 */
export const deleteRole = async (d1: D1Database, id: number) => {
  const db = getDb(d1);
  const result = await db.update(roles)
    .set({ isDeleted: true, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(and(eq(roles.id, id), eq(roles.isDeleted, false)))
    .returning({ id: roles.id });
  if (result.length === 0) {
    throw new HTTPException(404, { message: '角色未找到，无法删除' });
  }
  return { message: '角色已成功删除。' };
};

/**
 * 为角色分配权限（先删后增，硬删关联表）
 */
export const assignPermissionsToRole = async (d1: D1Database, roleId: number, permissionIds: number[]) => {
  const db = getDb(d1);

  await db.transaction(async (tx) => {
    await tx.delete(rolesToPermissions).where(eq(rolesToPermissions.roleId, roleId));
    if (permissionIds.length > 0) {
      const newAssignments = permissionIds.map((permissionId) => ({
        roleId,
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
export const getRolePermissions = async (d1: D1Database, roleId: number) => {
  const db = getDb(d1);

  const result = await db.query.rolesToPermissions.findMany({
    where: eq(rolesToPermissions.roleId, roleId),
    with: { permission: true },
  });

  return result.map((r: any) => r.permission);
};
