const pool = require('./db');

async function fixMatchStatusCorrect() {
  try {
    console.log('Fixing match_status based on keyword matching logic...');
    
    // Update match_status based on keyword attribution (not daily_stats)
    // This matches the logic in create-from-logs endpoint
    
    // Leads with complete attribution (keyword_id, campaign_id, ad_group_id)
    const matched = await pool.query(`
      UPDATE leads 
      SET match_status = 'matched'
      WHERE keyword_id IS NOT NULL 
        AND campaign_id IS NOT NULL 
        AND ad_group_id IS NOT NULL
        AND (match_status IS NULL OR match_status != 'matched')
    `);
    console.log(`Updated ${matched.rowCount} leads to 'matched'`);
    
    // Leads with partial attribution
    const partial = await pool.query(`
      UPDATE leads 
      SET match_status = 'no_tracking_data'
      WHERE (keyword_id IS NULL OR campaign_id IS NULL OR ad_group_id IS NULL)
        AND (keyword_id IS NOT NULL OR campaign_id IS NOT NULL OR ad_group_id IS NOT NULL OR gclid IS NOT NULL)
        AND (match_status IS NULL OR match_status = 'no_match')
    `);
    console.log(`Updated ${partial.rowCount} leads to 'no_tracking_data'`);
    
    // Leads with no attribution
    const none = await pool.query(`
      UPDATE leads 
      SET match_status = 'no_match'
      WHERE keyword_id IS NULL 
        AND campaign_id IS NULL 
        AND ad_group_id IS NULL
        AND gclid IS NULL
        AND (match_status IS NULL OR match_status != 'no_match')
    `);
    console.log(`Updated ${none.rowCount} leads to 'no_match'`);
    
    // Show summary
    const summaryResult = await pool.query(`
      SELECT match_status, COUNT(*) as count
      FROM leads
      GROUP BY match_status
    `);
    
    console.log('\nMatch status summary:');
    summaryResult.rows.forEach(row => {
      console.log(`${row.match_status}: ${row.count}`);
    });
    
    // Show some examples
    const examples = await pool.query(`
      SELECT 
        l.email, l.match_status, l.keyword_id, l.campaign_id, l.ad_group_id, l.gclid,
        k.text as keyword_text
      FROM leads l
      LEFT JOIN keywords k ON k.id = l.keyword_id
      ORDER BY l.created_at DESC
      LIMIT 10
    `);
    
    console.log('\nRecent leads examples:');
    examples.rows.forEach(row => {
      console.log(`${row.email}: ${row.match_status} - ${row.keyword_text || 'N/A'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixMatchStatusCorrect();
