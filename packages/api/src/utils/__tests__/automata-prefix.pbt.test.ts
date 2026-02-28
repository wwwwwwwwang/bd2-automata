import { describe, expect, it } from 'vitest';
import { buildValidationReport } from '../../../scripts/validate-automata-prefix.mjs';

function createConsistentArtifacts() {
  const sqlText = `
CREATE TABLE \`automata_users\` (
  \`id\` integer PRIMARY KEY NOT NULL,
  \`name\` text NOT NULL,
  \`created_at\` text DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE \`automata_task_queue\` (
  \`id\` integer PRIMARY KEY NOT NULL,
  \`user_id\` integer,
  \`status\` text DEFAULT 'pending',
  FOREIGN KEY (\`user_id\`) REFERENCES \`automata_users\`(\`id\`) ON UPDATE no action ON DELETE set null
);

CREATE UNIQUE INDEX \`automata_task_queue_user_id_unique\` ON \`automata_task_queue\` (\`user_id\`);
`;

  const schemaFileContents = [
    `
import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('automata_users', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: text('created_at').default(sql\`(CURRENT_TIMESTAMP)\`),
});

export const taskQueue = sqliteTable(
  'automata_task_queue',
  {
    id: integer('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null', onUpdate: 'no action' }),
    status: text('status').default('pending'),
  },
  (table) => ({
    userUnique: uniqueIndex('automata_task_queue_user_id_unique').on(table.userId),
  })
);
`,
  ];

  const snapshotText = JSON.stringify({
    tables: {
      automata_users: {
        columns: {
          id: { name: 'id', type: 'integer', notNull: true, primaryKey: true, default: null },
          name: { name: 'name', type: 'text', notNull: true, primaryKey: false, default: null },
          created_at: {
            name: 'created_at',
            type: 'text',
            notNull: false,
            primaryKey: false,
            default: '(CURRENT_TIMESTAMP)',
          },
        },
        foreignKeys: {},
        indexes: {},
      },
      automata_task_queue: {
        columns: {
          id: { name: 'id', type: 'integer', notNull: true, primaryKey: true, default: null },
          user_id: { name: 'user_id', type: 'integer', notNull: false, primaryKey: false, default: null },
          status: { name: 'status', type: 'text', notNull: false, primaryKey: false, default: "'pending'" },
        },
        foreignKeys: {
          fk_task_queue_user: {
            tableTo: 'automata_users',
            columnsFrom: ['user_id'],
            columnsTo: ['id'],
            onUpdate: 'no action',
            onDelete: 'set null',
          },
        },
        indexes: {
          idx_task_queue_user_unique: {
            name: 'automata_task_queue_user_id_unique',
            isUnique: true,
            columns: ['user_id'],
          },
        },
      },
    },
  });

  return {
    sqlText,
    snapshotText,
    schemaFileContents,
    runnerCommands: [
      'packages/api/package.json:scripts:deploy=wrangler deploy',
      'packages/api/package.json:scripts:dev=wrangler dev',
    ],
    migrationSqlFiles: ['0000_zippy_blink.sql'],
    rollbackSqlFiles: [],
    supersedeCurrentTexts: [
      '本变更 supersede enforce-automata-prefix-0000-sql 中存量环境必须前向迁移约束。',
    ],
    supersedeLegacyText: '存量环境必须前向迁移路径。',
  };
}

function getCheck(report, id) {
  const check = report.checks.find((item) => item.id === id);
  if (!check) {
    throw new Error(`Missing check: ${id}`);
  }
  return check;
}

describe('migration strategy validation properties', () => {
  it('4.1 Runner Uniqueness: enabling drizzle migrator alongside wrangler must fail', () => {
    const base = createConsistentArtifacts();
    const report = buildValidationReport(base);
    expect(getCheck(report, 'runner-uniqueness').ok).toBe(true);

    const mutated = buildValidationReport({
      ...base,
      runnerCommands: [...base.runnerCommands, 'packages/api/package.json:scripts:migrate=drizzle-kit migrate'],
    });

    const check = getCheck(mutated, 'runner-uniqueness');
    expect(check.ok).toBe(false);
    expect(check.severity).toBe('blocker');
  });

  it('4.2 Bootstrap Lane Exclusivity: default lane containing 0001/0002/rollback must fail', () => {
    const base = createConsistentArtifacts();
    const report = buildValidationReport(base);
    expect(getCheck(report, 'bootstrap-lane-exclusivity').ok).toBe(true);

    const mutated = buildValidationReport({
      ...base,
      migrationSqlFiles: ['0000_zippy_blink.sql', '0001_prefix_page_permissions_api_path.sql'],
      rollbackSqlFiles: ['rollback/0002_rename_cron_task_tables_for_existing_dbs.rollback.sql'],
    });

    const check = getCheck(mutated, 'bootstrap-lane-exclusivity');
    expect(check.ok).toBe(false);
    expect(check.severity).toBe('blocker');
  });

  it('4.3 Structural Equality Across Artifacts: structure drift must produce blocker', () => {
    const base = createConsistentArtifacts();
    const report = buildValidationReport(base);
    expect(getCheck(report, 'structural-equality-across-artifacts').ok).toBe(true);

    const mutated = buildValidationReport({
      ...base,
      sqlText: base.sqlText.replace("\`status\` text DEFAULT 'pending'", "\`status\` integer DEFAULT 0"),
    });

    const check = getCheck(mutated, 'structural-equality-across-artifacts');
    expect(check.ok).toBe(false);
    expect(check.severity).toBe('blocker');
  });

  it('4.4 Deterministic Validation: repeated executions should be deterministic', () => {
    const artifacts = createConsistentArtifacts();
    const first = buildValidationReport(artifacts);
    const second = buildValidationReport(artifacts);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(getCheck(first, 'deterministic-validation').ok).toBe(true);
  });

  it('4.5 Supersede Consistency: dropping supersede markers must fail', () => {
    const base = createConsistentArtifacts();
    const report = buildValidationReport(base);
    expect(getCheck(report, 'supersede-consistency').ok).toBe(true);

    const mutated = buildValidationReport({
      ...base,
      supersedeCurrentTexts: ['仅单基线，不包含 supersede 说明'],
    });

    const check = getCheck(mutated, 'supersede-consistency');
    expect(check.ok).toBe(false);
    expect(check.severity).toBe('blocker');
  });

  it('SQL parser should accept CONSTRAINT FOREIGN KEY syntax', () => {
    const base = createConsistentArtifacts();
    const withConstraintFk = buildValidationReport({
      ...base,
      sqlText: base.sqlText.replace(
        "FOREIGN KEY (`user_id`) REFERENCES `automata_users`(`id`) ON UPDATE no action ON DELETE set null",
        "CONSTRAINT `fk_task_queue_user` FOREIGN KEY (`user_id`) REFERENCES `automata_users`(`id`) ON UPDATE no action ON DELETE set null"
      ),
    });

    expect(getCheck(withConstraintFk, 'structural-equality-across-artifacts').ok).toBe(true);
  });

  it('schema parser should accept block callback and nested default expression', () => {
    const base = createConsistentArtifacts();
    const withBlockCallbackSchema = buildValidationReport({
      ...base,
      schemaFileContents: [
        `
import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable("automata_users", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at").default(sql\`(CURRENT_TIMESTAMP)\`),
});

export const taskQueue = sqliteTable(
  "automata_task_queue",
  {
    id: integer("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: 'set null', onUpdate: 'no action' }),
    status: text("status").default(sql\`lower(('PENDING'))\`),
  },
  (table) => {
    return {
      userUnique: uniqueIndex("automata_task_queue_user_id_unique").on(table.userId),
    };
  }
);
`,
      ],
      sqlText: base.sqlText.replace("`status` text DEFAULT 'pending'", "`status` text DEFAULT lower(('PENDING'))"),
      snapshotText: JSON.stringify({
        tables: {
          automata_users: {
            columns: {
              id: { name: 'id', type: 'integer', notNull: true, primaryKey: true, default: null },
              name: { name: 'name', type: 'text', notNull: true, primaryKey: false, default: null },
              created_at: {
                name: 'created_at',
                type: 'text',
                notNull: false,
                primaryKey: false,
                default: '(CURRENT_TIMESTAMP)',
              },
            },
            foreignKeys: {},
            indexes: {},
          },
          automata_task_queue: {
            columns: {
              id: { name: 'id', type: 'integer', notNull: true, primaryKey: true, default: null },
              user_id: { name: 'user_id', type: 'integer', notNull: false, primaryKey: false, default: null },
              status: {
                name: 'status',
                type: 'text',
                notNull: false,
                primaryKey: false,
                default: "lower(('PENDING'))",
              },
            },
            foreignKeys: {
              fk_task_queue_user: {
                tableTo: 'automata_users',
                columnsFrom: ['user_id'],
                columnsTo: ['id'],
                onUpdate: 'no action',
                onDelete: 'set null',
              },
            },
            indexes: {
              idx_task_queue_user_unique: {
                name: 'automata_task_queue_user_id_unique',
                isUnique: true,
                columns: ['user_id'],
              },
            },
          },
        },
      }),
    });

    expect(getCheck(withBlockCallbackSchema, 'structural-equality-across-artifacts').ok).toBe(true);
  });

  it('runner evidence should redact sensitive values', () => {
    const report = buildValidationReport({
      ...createConsistentArtifacts(),
      runnerCommands: [
        'packages/api/package.json:scripts:unsafe=TOKEN=abc123 curl https://user:secret@example.com -H "Authorization: Bearer token-value" --api-key=xyz',
      ],
    });

    const check = getCheck(report, 'runner-uniqueness');
    expect(check.evidence.join('\n')).not.toContain('abc123');
    expect(check.evidence.join('\n')).not.toContain('secret@example.com');
    expect(check.evidence.join('\n')).not.toContain('token-value');
    expect(check.evidence.join('\n')).not.toContain('--api-key=xyz');
  });

  it('parse failure should be reported as blocker with fixed schema', () => {
    const broken = buildValidationReport({
      ...createConsistentArtifacts(),
      snapshotText: '{invalid-json}',
    });

    expect(broken.ok).toBe(false);
    expect(broken.summary.blockers).toBeGreaterThan(0);
    expect(getCheck(broken, 'artifact-parse-integrity').severity).toBe('blocker');
  });
});
