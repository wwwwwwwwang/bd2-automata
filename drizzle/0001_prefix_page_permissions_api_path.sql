-- prefix-page-pagination-routes
-- 任务3：权限路径迁移 SQL（待上线执行）
-- 说明：当前环境未运行且数据库为空，本脚本仅预置，不在本阶段执行。

BEGIN TRANSACTION;

UPDATE automata_permissions
SET api_path = api_path || '/page'
WHERE is_deleted = 0
  AND UPPER(TRIM(http_method)) = 'GET'
  AND api_path IN (
    '/api/users',
    '/api/roles',
    '/api/permissions',
    '/api/tasks',
    '/api/events',
    '/api/dictionary-items',
    '/api/dictionary-types',
    '/api/gift-codes',
    '/api/game-accounts',
    '/api/daily-attendance-logs',
    '/api/weekly-attendance-logs',
    '/api/redemption-logs',
    '/api/event-participation-logs',
    '/api/email-templates',
    '/api/email-queue',
    '/api/email-stats',
    '/api/logs'
  )
  AND api_path NOT LIKE '%/page';

COMMIT;

-- 可选核对（执行后手动检查）
-- SELECT http_method, api_path, COUNT(*)
-- FROM automata_permissions
-- WHERE UPPER(TRIM(http_method)) = 'GET'
--   AND (
--     api_path IN (
--       '/api/users','/api/roles','/api/permissions','/api/tasks','/api/events',
--       '/api/dictionary-items','/api/dictionary-types','/api/gift-codes','/api/game-accounts',
--       '/api/daily-attendance-logs','/api/weekly-attendance-logs','/api/redemption-logs',
--       '/api/event-participation-logs','/api/email-templates','/api/email-queue','/api/email-stats','/api/logs'
--     )
--     OR api_path IN (
--       '/api/users/page','/api/roles/page','/api/permissions/page','/api/tasks/page','/api/events/page',
--       '/api/dictionary-items/page','/api/dictionary-types/page','/api/gift-codes/page','/api/game-accounts/page',
--       '/api/daily-attendance-logs/page','/api/weekly-attendance-logs/page','/api/redemption-logs/page',
--       '/api/event-participation-logs/page','/api/email-templates/page','/api/email-queue/page','/api/email-stats/page','/api/logs/page'
--     )
--   )
-- GROUP BY http_method, api_path
-- ORDER BY api_path;
