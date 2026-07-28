-- Add conversion_date column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS conversion_date TIMESTAMP;
