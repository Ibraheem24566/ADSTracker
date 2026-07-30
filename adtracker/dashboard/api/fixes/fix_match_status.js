const pool = require('./db');

async function fixMatchStatus() {
  try {
    console.log('Fixing match_status based on actual daily_stats availability...');
    
    // Get all leads
    const leadsResult = await pool.query(`
      SELECT id, email, created_at, keyword_id, campaign_id, ad_group_id, match_status
      FROM leads
      WHERE created_at IS NOT NULL
    `);
    
    console.log(`Processing ${leadsResult.rows.length} leads...`);
    
    let fixed = 0;
    
    for (const lead of leadsResult.rows) {
      const leadDate = new Date(lead.created_at).toISOString().split('T')[0];
      
      // Check if there are stats for this lead's date with its current keyword_id
      const statsResult = await pool.query(
        `SELECT COUNT(*) as count
         FROM daily_stats ds
         WHERE ds.date = $1 AND ds.keyword_id = $2`,
        [leadDate, lead.keyword_id]
      );
      
      const hasStats = parseInt(statsResult.rows[0].count) > 0;
      
      // Update match_status based on actual stats availability
      let newMatchStatus;
      if (hasStats && lead.keyword_id && lead.campaign_id && lead.gclid) {
        newMatchStatus = 'matched';
      } else if (lead.keyword_id || lead.campaign_id || lead.gclid) {
        newMatchStatus = 'no_tracking_data';
      } else {
        newMatchStatus = 'no_match';
      }
      
      if (newMatchStatus !== lead.match_status) {
        await pool.query(
          'UPDATE leads SET match_status = $1 WHERE id = $2',
          [newMatchStatus, lead.id]
        );
        console.log(`Fixed ${lead.email} (ID: ${lead.id}): ${lead.match_status} -> ${newMatchStatus} (stats on ${leadDate}: ${hasStats})`);
        fixed++;
      }
    }
    
    console.log(`\nFixed ${fixed} leads`);
    
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
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixMatchStatus();
