-- Body composition redesign: unified mode-less flow with source tracking
-- measurement_mode is no longer required (any combination of fields per day)
-- source tracks provenance per field (manual, health_connect, smart_scale, whoop)

ALTER TABLE body_measurements ALTER COLUMN measurement_mode DROP NOT NULL;
ALTER TABLE body_measurements ALTER COLUMN measurement_mode DROP DEFAULT;

ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS source jsonb DEFAULT '{}';
-- Example: {"weight": "health_connect", "body_fat_percentage": "manual", "waist": "manual"}
