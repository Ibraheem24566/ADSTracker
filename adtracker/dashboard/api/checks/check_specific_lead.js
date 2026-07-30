const pool = require('./db');

async function checkSpecificLead() {
  try {
    const result = await pool.query(`
      SELECT 
        l.id,
        l.email,
        l.created_at,
        l.keyword_id,
        l.campaign_id,
        l.ad_group_id,
        l.gclid,
        l.raw_keyword_text,
        l.match_status,
        k.text as keyword_text,
        c.name as campaign_name
      FROM leads l
      LEFT JOIN keywords k ON k.id = l.keyword_id
      LEFT JOIN campaigns c ON c.id = l.campaign_id
      WHERE l.email = 'pamelasjulian@gmail.com'
    `);
    
    console.log('Lead data for pamelasjulian@gmail.com:');
    console.log(JSON.stringify(result.rows[0], null, 2));
    
    // Check if there are stats for this lead's date
    const leadDate = new Date(result.rows[0].created_at).toISOString().split('T')[0];
    console.log(`\nLead creation date: ${leadDate}`);
    
    const statsResult = await pool.query(
      `SELECT ds.date, ds.keyword_id, ds.campaign_id, ds.ad_group_id, k.text as keyword_text
       FROM daily_stats ds
       JOIN keywords k ON k.id = ds.keyword_id
       WHERE ds.date = $1
       LIMIT 5`,
      [leadDate]
    );
    
    console.log(`\nStats available for ${leadDate}:`);
    console.log(`Found ${statsResult.rows.length} entries`);
    statsResult.rows.forEach(row => {
      console.log(`  - ${row.keyword_text} (ID: ${row.keyword_id})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSpecificLead();
