CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`niche` text NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`url` text NOT NULL,
	`services` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_clients_owner` ON `clients` (`owner`);--> statement-breakpoint
CREATE TABLE `draft_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
