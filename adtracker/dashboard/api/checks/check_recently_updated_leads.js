const pool = require('./db');

async function checkRecentlyUpdatedLeads() {
  try {
    console.log('Checking recently updated leads that had attribution removed...');
    
    const removedEmails = [
      'uriperry1@gmail.com',
      'danbaker2252@gmail.com',
      'jhevid@gmail.com',
      'kashyaka@gmail.com',
      'esteigler@comcast.net',
      'bwilson@gmail.com',
      'miodekj@yahoo.com',
      'bleekbaby87@aol.com',
      'kelly@oldportdesign.com',
      'alyssa.wakelin@gmail.com'
    ];
    
    for (const email of removedEmails) {
      const result = await pool.query(
        `SELECT id, email, created_at, keyword_id, campaign_id, ad_group_id, raw_keyword_text, gclid, status_updated_at
         FROM leads
         WHERE LOWER(email) = LOWER($1)`,
        [email]
      );
      
      if (result.rows.length > 0) {
        const lead = result.rows[0];
        console.log(`\n${email}:`);
        console.log(`  ID: ${lead.id}`);
        console.log(`  Created: ${lead.created_at}`);
        console.log(`  Keyword ID: ${lead.keyword_id}`);
        console.log(`  Campaign ID: ${lead.campaign_id}`);
        console.log(`  Raw keyword: ${lead.raw_keyword_text}`);
        console.log(`  GCLID: ${lead.gclid}`);
        console.log(`  Status updated: ${lead.status_updated_at}`);
        
        // Check if this lead could be matched
        if (lead.raw_keyword_text || lead.gclid) {
          const leadDate = new Date(lead.created_at).toISOString().split('T')[0];
          
          // Try to find matching stats
          let statsResult;
          
          if (lead.raw_keyword_text) {
            statsResult = await pool.query(
              `SELECT ds.keyword_id, ds.campaign_id, ds.ad_group_id, k.text as keyword_text
               FROM daily_stats ds
               JOIN keywords k ON k.id = ds.keyword_id
               WHERE ds.date = $1 AND LOWER(k.text) = LOWER($2)
               LIMIT 1`,
              [leadDate, lead.raw_keyword_text]
            );
          }
          
          if (statsResult && statsResult.rows.length > 0) {
            console.log(`  ✅ Could match with keyword: ${statsResult.rows[0].keyword_text} (ID: ${statsResult.rows[0].keyword_id})`);
          } else {
            console.log(`  ❌ No matching stats found for date: ${leadDate}`);
          }
        }
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkRecentlyUpdatedLeads();
