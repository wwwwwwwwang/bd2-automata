-- 邮件队列：新增 resend_email_id 字段
ALTER TABLE `automata_email_queue` ADD COLUMN `resend_email_id` text;
--> statement-breakpoint
-- 邮件统计：新增投递状态统计字段
ALTER TABLE `automata_email_stats` ADD COLUMN `total_delivered` integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `automata_email_stats` ADD COLUMN `total_bounced` integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `automata_email_stats` ADD COLUMN `total_complained` integer DEFAULT 0;
--> statement-breakpoint
CREATE INDEX `idx_email_queue_resend_email_id` ON `automata_email_queue` (`resend_email_id`);
