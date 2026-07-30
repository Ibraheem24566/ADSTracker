const pool = require('./db');

async function testKeywordClear() {
  try {
    console.log('Testing keyword clear on a lead...');
    
    // Pick one of the leads that had attribution removed
    const testEmail = 'uriperry1@gmail.com';
    
    // Get current state
    const before = await pool.query(
      `SELECT id, email, raw_keyword_text, keyword_id, campaign_id, ad_group_id, match_status
       FROM leads
       WHERE LOWER(email) = LOWER($1)`,
      [testEmail]
    );
    
    console.log('Before update:');
    console.log(`  raw_keyword_text: ${before.rows[0].raw_keyword_text}`);
    console.log(`  keyword_id: ${before.rows[0].keyword_id}`);
    console.log(`  campaign_id: ${before.rows[0].campaign_id}`);
    console.log(`  ad_group_id: ${before.rows[0].ad_group_id}`);
    console.log(`  match_status: ${before.rows[0].match_status}`);
    
    // Simulate what the API would do - clear raw_keyword_text
    await pool.query(
      `UPDATE leads 
       SET raw_keyword_text = NULL,
           keyword_id = NULL,
           campaign_id = NULL,
           ad_group_id = NULL,
           match_status = 'no_tracking_data'
       WHERE id = $1`,
      [before.rows[0].id]
    );
    
    // Get state after
    const after = await pool.query(
      `SELECT id, email, raw_keyword_text, keyword_id, campaign_id, ad_group_id, match_status
       FROM leads
       WHERE id = $1`,
      [before.rows[0].id]
    );
    
    console.log('\nAfter update:');
    console.log(`  raw_keyword_text: ${after.rows[0].raw_keyword_text}`);
    console.log(`  keyword_id: ${after.rows[0].keyword_id}`);
    console.log(`  campaign_id: ${after.rows[0].campaign_id}`);
    console.log(`  ad_group_id: ${after.rows[0].ad_group_id}`);
    console.log(`  match_status: ${after.rows[0].match_status}`);
    
    // Check what the API would return
    const apiResult = await pool.query(
      `SELECT
         l.id, l.name, l.email, l.raw_keyword_text,
         l.match_status, l.status, l.value, l.revenue,
         l.campaign_id, c.name AS campaign_name, ag.name AS ad_group_name, k.text AS keyword_text
       FROM leads l
       LEFT JOIN campaigns c ON c.id = l.campaign_id
       LEFT JOIN ad_groups ag ON ag.id = l.ad_group_id
       LEFT JOIN keywords k ON k.id = l.keyword_id
       WHERE l.id = $1`,
      [after.rows[0].id]
    );
    
    console.log('\nWhat API would return:');
    console.log(`  raw_keyword_text: ${apiResult.rows[0].raw_keyword_text}`);
    console.log(`  keyword_text (from join): ${apiResult.rows[0].keyword_text}`);
    console.log(`  campaign_name: ${apiResult.rows[0].campaign_name}`);
    console.log(`  ad_group_name: ${apiResult.rows[0].ad_group_name}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testKeywordClear();
