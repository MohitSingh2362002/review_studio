CREATE TABLE `google_connections` (
	`owner` text PRIMARY KEY NOT NULL,
	`credentials` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `google_states` (
	`state` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`verifier` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`mime` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`owner` text PRIMARY KEY NOT NULL,
	`display_name` text DEFAULT '' NOT NULL,
	`agency` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE `clients` ADD `description` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `address` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `phone` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `whatsapp` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `website` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `image` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `google_account` text;--> statement-breakpoint
ALTER TABLE `clients` ADD `google_location` text;--> statement-breakpoint
ALTER TABLE `clients` ADD `synced_at` text;--> statement-breakpoint
ALTER TABLE `clients` ADD `review_data` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `sync_warnings` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_clients_google_owner` ON `clients` (`owner`,`google_location`);