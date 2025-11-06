-- Add attachment fields to club_messages table
-- Sprint-6: File attachment support for club messages

ALTER TABLE "club_messages" 
ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT,
ADD COLUMN IF NOT EXISTS "attachmentType" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "attachmentName" VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN "club_messages"."attachmentUrl" IS 'Base64 data URL of attached image (max 2MB)';
COMMENT ON COLUMN "club_messages"."attachmentType" IS 'MIME type of attachment (image/jpeg, image/png, etc.)';
COMMENT ON COLUMN "club_messages"."attachmentName" IS 'Original filename of attachment';
