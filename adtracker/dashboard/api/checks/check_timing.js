const pool = require('./db');

async function checkTiming() {
  try {
    console.log('Checking lead creation dates vs log data...');
    
    // Get leads that were updated with their creation dates
    const result = await pool.query(`
      SELECT 
        l.id,
        l.email,
        l.created_at,
        l.keyword_id,
        l.campaign_id,
        l.gclid,
        k.text as keyword_text
      FROM leads l
      LEFT JOIN keywords k ON l.keyword_id = k.id
      WHERE l.keyword_id IS NOT NULL
      ORDER BY l.created_at DESC
      LIMIT 20
    `);
    
    console.log('Leads with tracking data and creation dates:');
    result.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`  Email: ${row.email}`);
      console.log(`  Created: ${row.created_at}`);
      console.log(`  Keyword: ${row.keyword_text}`);
      console.log(`  Campaign ID: ${row.campaign_id}`);
      console.log(`  GCLID: ${row.gclid}`);
      console.log('---');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTiming();
