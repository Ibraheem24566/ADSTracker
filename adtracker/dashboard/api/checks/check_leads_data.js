const pool = require('./db');

async function checkLeadsData() {
  try {
    console.log('Checking leads data...');
    
    // Get recent leads with their keyword, campaign, and gclid data
    const result = await pool.query(`
      SELECT 
        l.id,
        l.email,
        l.keyword_id,
        l.campaign_id,
        l.gclid,
        k.text as keyword_text,
        c.name as campaign_name
      FROM leads l
      LEFT JOIN keywords k ON l.keyword_id = k.id
      LEFT JOIN campaigns c ON l.campaign_id = c.id
      ORDER BY l.id DESC
      LIMIT 20
    `);
    
    console.log('Recent leads data:');
    result.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`  Email: ${row.email}`);
      console.log(`  Keyword ID: ${row.keyword_id}`);
      console.log(`  Keyword Text: ${row.keyword_text || 'NULL'}`);
      console.log(`  Campaign ID: ${row.campaign_id}`);
      console.log(`  Campaign Name: ${row.campaign_name || 'NULL'}`);
      console.log(`  GCLID: ${row.gclid || 'NULL'}`);
      console.log('---');
    });
    
    // Count leads with tracking data
    const trackingCount = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(keyword_id) as with_keyword,
        COUNT(campaign_id) as with_campaign,
        COUNT(gclid) as with_gclid
      FROM leads
    `);
    
    console.log('\nTracking data summary:');
    console.log(`Total leads: ${trackingCount.rows[0].total}`);
    console.log(`With keyword_id: ${trackingCount.rows[0].with_keyword}`);
    console.log(`With campaign_id: ${trackingCount.rows[0].with_campaign}`);
    console.log(`With gclid: ${trackingCount.rows[0].with_gclid}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkLeadsData();
