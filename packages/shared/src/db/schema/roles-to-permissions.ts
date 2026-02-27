import { sqliteTable, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { roles } from './roles';
import { permissions } from './permissions';

// 角色-权限关联表（SQLite INTEGER 为 64 位，语义对齐 BIGINT）
export const rolesToPermissions = sqliteTable('automata_role_permissions', {
  roleId: integer('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: integer('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
}));
