CREATE TABLE `automata_users` (
	`id` integer PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`is_active` integer DEFAULT true,
	`max_game_accounts` integer DEFAULT 3,
	`email` text,
	`email_verified` integer DEFAULT false,
	`email_verify_token` text,
	`email_verify_token_expires` integer,
	`last_login_at` text,
	`created_by` integer DEFAULT 0,
	`updated_by` integer DEFAULT 0,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`version` integer DEFAULT 0,
	`is_deleted` integer DEFAULT false NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `automata_roles` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `automata_permissions` (
	`id` integer PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'button',
	`parent_id` integer,
	`menu_path` text,
	`icon` text,
	`description` text,
	`http_method` text,
	`api_path` text,
	`sort_order` integer DEFAULT 0,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`parent_id`) REFERENCES `automata_permissions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `automata_cron_configs` (
	`task_type` text PRIMARY KEY NOT NULL,
	`cron_expression` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `automata_dictionaries` (
	`id` integer PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_system` integer DEFAULT false,
	`sort_order` integer DEFAULT 0,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `automata_dictionary_items` (
	`id` integer PRIMARY KEY NOT NULL,
	`dictionary_id` integer NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`label` text,
	`sort_order` integer DEFAULT 0,
	`is_active` integer DEFAULT true,
	`is_default` integer DEFAULT false,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`dictionary_id`) REFERENCES `automata_dictionaries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `automata_task_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_type` text NOT NULL,
	`account_id` integer,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`max_retries` integer DEFAULT 3 NOT NULL,
	`error_message` text,
	`started_at` text,
	`completed_at` text,
	`priority` integer DEFAULT 0,
	`next_retry_at` text,
	`execution_history` text DEFAULT '[]',
	`created_by` integer DEFAULT 0,
	`updated_by` integer DEFAULT 0,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`version` integer DEFAULT 0,
	`is_deleted` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `automata_game_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `automata_task_logs` (
	`id` integer PRIMARY KEY NOT NULL,
	`task_id` integer,
	`game_account_id` integer,
	`status` text NOT NULL,
	`message` text,
	`details` text,
	`executed_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `automata_task_queue`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`game_account_id`) REFERENCES `automata_game_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `automata_gift_codes` (
	`id` integer PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`reward_desc` text,
	`is_active` integer DEFAULT true,
	`expired_at` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `automata_event_schedules` (
	`id` integer PRIMARY KEY NOT NULL,
	`event_schedule_id` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`is_active` integer DEFAULT true,
	`reward_info` text,
	`popup_info` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `automata_game_accounts` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`game_nickname` text NOT NULL,
	`refresh_token` text NOT NULL,
	`is_active` integer DEFAULT true,
	`last_sync_at` text,
	`auto_daily_attend` integer DEFAULT true,
	`auto_weekly_attend` integer DEFAULT true,
	`auto_redeem` integer DEFAULT true,
	`auto_event_attend` integer DEFAULT true,
	`token_expired_notification` integer DEFAULT true,
	`provider_type` text DEFAULT 'GOOGLE',
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `automata_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `automata_user_roles` (
	`user_id` integer NOT NULL,
	`role_id` integer NOT NULL,
	PRIMARY KEY(`role_id`, `user_id`),
	FOREIGN KEY (`user_id`) REFERENCES `automata_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`role_id`) REFERENCES `automata_roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `automata_role_permissions` (
	`role_id` integer NOT NULL,
	`permission_id` integer NOT NULL,
	PRIMARY KEY(`permission_id`, `role_id`),
	FOREIGN KEY (`role_id`) REFERENCES `automata_roles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`permission_id`) REFERENCES `automata_permissions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `automata_daily_attendance_logs` (
	`id` integer PRIMARY KEY NOT NULL,
	`game_account_id` integer NOT NULL,
	`attendance_date` text NOT NULL,
	`status` integer DEFAULT 1,
	`response_msg` text,
	`created_by` integer DEFAULT 0,
	`updated_by` integer DEFAULT 0,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`version` integer DEFAULT 0,
	`is_deleted` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`game_account_id`) REFERENCES `automata_game_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `automata_weekly_attendance_logs` (
	`id` integer PRIMARY KEY NOT NULL,
	`game_account_id` integer NOT NULL,
	`week_identifier` text NOT NULL,
	`status` integer DEFAULT 1,
	`response_msg` text,
	`created_by` integer DEFAULT 0,
	`updated_by` integer DEFAULT 0,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`version` integer DEFAULT 0,
	`is_deleted` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`game_account_id`) REFERENCES `automata_game_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `automata_redemption_logs` (
	`id` integer PRIMARY KEY NOT NULL,
	`game_account_id` integer NOT NULL,
	`gift_code_id` integer,
	`code_used` text NOT NULL,
	`redeem_result` integer DEFAULT 1,
	`response_msg` text,
	`task_id` integer,
	`created_by` integer DEFAULT 0,
	`updated_by` integer DEFAULT 0,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`version` integer DEFAULT 0,
	`is_deleted` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`game_account_id`) REFERENCES `automata_game_accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`gift_code_id`) REFERENCES `automata_gift_codes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `automata_event_participation_logs` (
	`id` integer PRIMARY KEY NOT NULL,
	`game_account_id` integer NOT NULL,
	`event_schedule_id` integer,
	`participation_result` integer DEFAULT 1,
	`response_msg` text,
	`task_id` integer,
	`created_by` integer DEFAULT 0,
	`updated_by` integer DEFAULT 0,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`version` integer DEFAULT 0,
	`is_deleted` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`game_account_id`) REFERENCES `automata_game_accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_schedule_id`) REFERENCES `automata_event_schedules`(`event_schedule_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `automata_distributed_locks` (
	`lock_key` text PRIMARY KEY NOT NULL,
	`locked_by` text NOT NULL,
	`locked_at` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `automata_refresh_tokens` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`token` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `automata_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `automata_password_reset_tokens` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`token` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `automata_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `automata_email_change_tokens` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`old_email` text NOT NULL,
	`new_email` text NOT NULL,
	`token` text NOT NULL,
	`old_code` text NOT NULL,
	`new_code` text NOT NULL,
	`old_verified` integer DEFAULT false,
	`new_verified` integer DEFAULT false,
	`old_attempts` integer DEFAULT 0,
	`new_attempts` integer DEFAULT 0,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `automata_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `automata_email_templates` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`subject` text NOT NULL,
	`html_content` text NOT NULL,
	`description` text,
	`available_vars` text,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `automata_email_queue` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`recipient_email` text NOT NULL,
	`subject` text NOT NULL,
	`html_content` text NOT NULL,
	`email_type` text NOT NULL,
	`template_id` integer,
	`template_vars` text,
	`resend_email_id` text,
	`status` text DEFAULT 'pending',
	`retry_count` integer DEFAULT 0,
	`error_msg` text,
	`execution_history` text DEFAULT '[]',
	`sent_at` text,
	`created_by` integer DEFAULT 0,
	`updated_by` integer DEFAULT 0,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`version` integer DEFAULT 0,
	`is_deleted` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `automata_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `automata_email_templates`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `automata_email_stats` (
	`id` integer PRIMARY KEY NOT NULL,
	`stat_date` text NOT NULL,
	`total_sent` integer DEFAULT 0,
	`total_delivered` integer DEFAULT 0,
	`total_failed` integer DEFAULT 0,
	`total_bounced` integer DEFAULT 0,
	`total_complained` integer DEFAULT 0,
	`total_pending` integer DEFAULT 0,
	`password_reset_count` integer DEFAULT 0,
	`token_expired_count` integer DEFAULT 0,
	`system_notify_count` integer DEFAULT 0,
	`created_by` integer DEFAULT 0,
	`updated_by` integer DEFAULT 0,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`version` integer DEFAULT 0,
	`is_deleted` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `automata_users_username_unique` ON `automata_users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `automata_users_email_unique` ON `automata_users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `automata_roles_name_unique` ON `automata_roles` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `automata_permissions_code_unique` ON `automata_permissions` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `automata_dictionaries_code_unique` ON `automata_dictionaries` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `automata_dictionary_items_dictionary_id_key_unique` ON `automata_dictionary_items` (`dictionary_id`,`key`);--> statement-breakpoint
CREATE UNIQUE INDEX `automata_gift_codes_code_unique` ON `automata_gift_codes` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `automata_event_schedules_event_schedule_id_unique` ON `automata_event_schedules` (`event_schedule_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `automata_game_accounts_game_nickname_unique` ON `automata_game_accounts` (`game_nickname`);--> statement-breakpoint
CREATE UNIQUE INDEX `automata_refresh_tokens_token_unique` ON `automata_refresh_tokens` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `automata_password_reset_tokens_token_unique` ON `automata_password_reset_tokens` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `automata_email_change_tokens_token_unique` ON `automata_email_change_tokens` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `automata_email_templates_name_unique` ON `automata_email_templates` (`name`);--> statement-breakpoint
CREATE INDEX `idx_email_queue_resend_email_id` ON `automata_email_queue` (`resend_email_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `automata_email_stats_stat_date_unique` ON `automata_email_stats` (`stat_date`);