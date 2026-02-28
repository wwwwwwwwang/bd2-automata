import { getDb } from '../db/drizzle';
import { users, usersToRoles, createUserSchema, updateUserSchema, z, Argon2id } from '@bd2-automata/shared';
import { eq, and, sql } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import type { PaginationQuery } from '@bd2-automata/shared';
import { paginate } from '../utils/pagination';

/** 面向 API 的安全字段列表，排除 passwordHash 等敏感信息 */
const safeUserColumns = {
  id: users.id,
  username: users.username,
  isActive: users.isActive,
  maxGameAccounts: users.maxGameAccounts,
  email: users.email,
  emailVerified: users.emailVerified,
  lastLoginAt: users.lastLoginAt,
  createdBy: users.createdBy,
  updatedBy: users.updatedBy,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  version: users.version,
  isDeleted: users.isDeleted,
  deletedAt: users.deletedAt,
} as const;

/**
 * 分页查询用户
 */
export const findUsers = async (d1: D1Database, pagination: PaginationQuery) => {
  const db = getDb(d1);
  const where = eq(users.isDeleted, false);
  const query = db.select(safeUserColumns).from(users).where(where);
  const countSql = sql`SELECT count(*) as count FROM ${users} WHERE ${where}`;
  return paginate(db, query, countSql, pagination);
};

/**
 * 根据 ID 查找单个用户
 */
export const findUserById = async (d1: D1Database, id: number) => {
  const db = getDb(d1);
  const [user] = await db.select(safeUserColumns).from(users)
    .where(and(eq(users.id, id), eq(users.isDeleted, false)));
  if (!user) {
    throw new HTTPException(404, { message: '用户未找到' });
  }
  return user;
};

/**
 * 创建一个新用户
 */
export const createUser = async (d1: D1Database, userData: z.infer<typeof createUserSchema>) => {
  const db = getDb(d1);
  const hashedPassword = await new Argon2id().hash(userData.password);

  try {
    const { password: _password, ...rest } = userData;
    const newUser = {
      ...rest,
      passwordHash: hashedPassword,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const [inserted] = await db.insert(users).values(newUser).returning();
    const { passwordHash: _ph, emailVerifyToken: _t, emailVerifyTokenExpires: _e, ...safeResult } = inserted;
    return safeResult;
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      throw new HTTPException(409, { message: '用户名或邮箱地址已存在' });
    }
    throw new HTTPException(500, { message: '创建用户时发生未知错误' });
  }
};

/**
 * 根据 ID 更新用户信息
 */
export const updateUser = async (d1: D1Database, id: number, userData: z.infer<typeof updateUserSchema>) => {
  const db = getDb(d1);
  const { password, ...rest } = userData;

  const dataToUpdate = {
    ...rest,
    updatedAt: new Date().toISOString(),
    ...(password ? { passwordHash: await new Argon2id().hash(password) } : {}),
  };

  const [updated] = await db.update(users).set(dataToUpdate)
    .where(and(eq(users.id, id), eq(users.isDeleted, false)))
    .returning();

  if (!updated) {
    throw new HTTPException(404, { message: '用户未找到，无法更新' });
  }
  const { passwordHash: _ph, emailVerifyToken: _t, emailVerifyTokenExpires: _e, ...safeResult } = updated;
  return safeResult;
};

/**
 * 根据 ID 软删除用户
 */
export const deleteUser = async (d1: D1Database, id: number) => {
  const db = getDb(d1);
  const result = await db.update(users)
    .set({ isDeleted: true, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(and(eq(users.id, id), eq(users.isDeleted, false)))
    .returning({ id: users.id });

  if (result.length === 0) {
    throw new HTTPException(404, { message: '用户未找到，无法删除' });
  }
  return { message: '用户已成功删除。' };
};

/**
 * 为用户分配角色（先删后增）
 */
export const assignRolesToUser = async (d1: D1Database, userId: number, roleIds: number[]) => {
  const db = getDb(d1);

  await db.transaction(async (tx) => {
    await tx.delete(usersToRoles).where(eq(usersToRoles.userId, userId));
    if (roleIds.length > 0) {
      const newAssignments = roleIds.map((roleId) => ({ userId, roleId }));
      await tx.insert(usersToRoles).values(newAssignments);
    }
  });

  return { message: '角色已成功分配。' };
};

/**
 * 查询用户的角色列表
 */
export const getUserRoles = async (d1: D1Database, userId: number) => {
  const db = getDb(d1);

  const result = await db.query.usersToRoles.findMany({
    where: eq(usersToRoles.userId, userId),
    with: { role: true },
  });

  return result.map((r: any) => r.role);
};
