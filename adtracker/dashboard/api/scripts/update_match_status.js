const pool = require('./db');

async function updateMatchStatus() {
  try {
    console.log('Updating match_status for leads...');
    
    // Update leads with complete tracking data (keyword_id, campaign_id, gclid)
    const completeMatch = await pool.query(`
      UPDATE leads 
      SET match_status = 'matched'
      WHERE keyword_id IS NOT NULL 
        AND campaign_id IS NOT NULL 
        AND gclid IS NOT NULL
        AND (match_status IS NULL OR match_status != 'matched')
    `);
    console.log(`Updated ${completeMatch.rowCount} leads to 'matched'`);
    
    // Update leads with partial tracking data
    const partialMatch = await pool.query(`
      UPDATE leads 
      SET match_status = 'no_tracking_data'
      WHERE (keyword_id IS NULL OR campaign_id IS NULL OR gclid IS NULL)
        AND (keyword_id IS NOT NULL OR campaign_id IS NOT NULL OR gclid IS NOT NULL)
        AND (match_status IS NULL OR match_status = 'no_match')
    `);
    console.log(`Updated ${partialMatch.rowCount} leads to 'no_tracking_data'`);
    
    // Update leads with no tracking data
    const noMatch = await pool.query(`
      UPDATE leads 
      SET match_status = 'no_match'
      WHERE keyword_id IS NULL 
        AND campaign_id IS NULL 
        AND gclid IS NULL
        AND (match_status IS NULL OR match_status != 'no_match')
    `);
    console.log(`Updated ${noMatch.rowCount} leads to 'no_match'`);
    
    // Check the results
    const result = await pool.query(`
      SELECT match_status, COUNT(*) as count
      FROM leads
      GROUP BY match_status
    `);
    
    console.log('\nMatch status summary:');
    result.rows.forEach(row => {
      console.log(`${row.match_status}: ${row.count}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateMatchStatus();
