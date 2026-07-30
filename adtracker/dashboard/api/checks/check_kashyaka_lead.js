const pool = require('./db');

async function checkKashyakaLead() {
  try {
    console.log('Checking kashyaka@gmail.com lead...');
    
    const result = await pool.query(
      `SELECT * FROM leads WHERE LOWER(email) = LOWER($1)`,
      ['kashyaka@gmail.com']
    );
    
    if (result.rows.length > 0) {
      const lead = result.rows[0];
      console.log('\nLead details:');
      console.log(`  ID: ${lead.id}`);
      console.log(`  Email: ${lead.email}`);
      console.log(`  Name: ${lead.name}`);
      console.log(`  Status: ${lead.status}`);
      console.log(`  Revenue: ${lead.revenue}`);
      console.log(`  Created: ${lead.created_at}`);
      console.log(`  Conversion Date: ${lead.conversion_date}`);
      console.log(`  Status Updated: ${lead.status_updated_at}`);
      console.log(`  Raw Keyword: ${lead.raw_keyword_text}`);
      console.log(`  Keyword ID: ${lead.keyword_id}`);
      console.log(`  Campaign ID: ${lead.campaign_id}`);
      console.log(`  Ad Group ID: ${lead.ad_group_id}`);
      console.log(`  GCLID: ${lead.gclid}`);
      console.log(`  Match Status: ${lead.match_status}`);
      console.log(`  Disqualified Reason: ${lead.disqualified_reason}`);
    } else {
      console.log('Lead not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkKashyakaLead();
