import { sqliteTable, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { roles } from './roles';

// 用户-角色关联表（SQLite INTEGER 为 64 位，语义对齐 BIGINT）
export const usersToRoles = sqliteTable('automata_user_roles', {
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: integer('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.roleId] }),
}));
