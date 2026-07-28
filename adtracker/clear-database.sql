-- SQL script to clear all existing performance data from the database
-- Run this in your PostgreSQL database before the historical sync if you want fresh data
-- WARNING: This will delete all campaigns, ad groups, keywords, and daily stats

BEGIN;

-- Delete in order of dependencies (foreign keys)
DELETE FROM daily_stats;
DELETE FROM keywords;
DELETE FROM ad_groups;
DELETE FROM campaigns;

COMMIT;

-- Verify deletion
SELECT 'daily_stats' as table_name, COUNT(*) as remaining_rows FROM daily_stats
UNION ALL
SELECT 'keywords', COUNT(*) FROM keywords
UNION ALL
SELECT 'ad_groups', COUNT(*) FROM ad_groups
UNION ALL
SELECT 'campaigns', COUNT(*) FROM campaigns;

-- Note: This does NOT delete leads data. If you want to clear leads too, uncomment below:
-- DELETE FROM lead_edits;
-- DELETE FROM leads;
