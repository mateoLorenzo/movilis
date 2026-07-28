CREATE TYPE "public"."otp_challenge_purpose" AS ENUM('login', 'phone_change_current', 'phone_change_new', 'account_deletion');--> statement-breakpoint
CREATE TYPE "public"."otp_challenge_status" AS ENUM('pending', 'deliverable', 'consumed', 'superseded', 'delivery_failed');--> statement-breakpoint
LOCK TABLE "otp_challenges" IN ACCESS EXCLUSIVE MODE;--> statement-breakpoint
DROP INDEX "auth_sessions_refresh_token_hash_idx";--> statement-breakpoint
DROP INDEX "otp_challenges_phone_number_idx";--> statement-breakpoint
DROP INDEX "otp_challenges_created_at_idx";--> statement-breakpoint
DELETE FROM "otp_challenges";--> statement-breakpoint
ALTER TABLE "otp_challenges" ADD COLUMN "purpose" "otp_challenge_purpose" NOT NULL;--> statement-breakpoint
ALTER TABLE "otp_challenges" ADD COLUMN "status" "otp_challenge_status" NOT NULL;--> statement-breakpoint
ALTER TABLE "otp_challenges" ADD COLUMN "subject_user_id" text;--> statement-breakpoint
ALTER TABLE "otp_challenges" ADD COLUMN "identifier_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "otp_challenges" ADD COLUMN "ip_hash" text;--> statement-breakpoint
ALTER TABLE "otp_challenges" ADD COLUMN "device_hash" text;--> statement-breakpoint
ALTER TABLE "otp_challenges" ADD COLUMN "provider_message_id" text;--> statement-breakpoint
ALTER TABLE "otp_challenges" ADD COLUMN "terminal_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "otp_challenges" ADD CONSTRAINT "otp_challenges_subject_user_id_users_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_sessions_cleanup_idx" ON "auth_sessions" USING btree (coalesce("revoked_at", "expires_at"),"id");--> statement-breakpoint
CREATE INDEX "otp_challenges_phone_purpose_status_created_at_idx" ON "otp_challenges" USING btree ("phone_number","purpose","status","created_at");--> statement-breakpoint
CREATE INDEX "otp_challenges_identifier_hash_created_at_idx" ON "otp_challenges" USING btree ("identifier_hash","created_at");--> statement-breakpoint
CREATE INDEX "otp_challenges_ip_hash_created_at_idx" ON "otp_challenges" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "otp_challenges_device_hash_created_at_idx" ON "otp_challenges" USING btree ("device_hash","created_at");--> statement-breakpoint
CREATE INDEX "otp_challenges_cleanup_idx" ON "otp_challenges" USING btree (coalesce("terminal_at", "expires_at"),"id");--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_refresh_token_hash_unique" UNIQUE("refresh_token_hash");
