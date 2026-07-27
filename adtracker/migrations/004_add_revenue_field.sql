-- Add revenue field to leads table for ROI calculations
ALTER TABLE leads ADD COLUMN IF NOT EXISTS revenue NUMERIC(10,2) DEFAULT 0;
