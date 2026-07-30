const pool = require('./db');

async function verifyRemovedLeads() {
  try {
    console.log('Verifying the 10 leads had attribution removed...');
    
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
        `SELECT id, email, keyword_id, campaign_id, ad_group_id, match_status
         FROM leads
         WHERE LOWER(email) = LOWER($1)`,
        [email]
      );
      
      console.log(`\n${email}:`);
      if (result.rows.length > 0) {
        const lead = result.rows[0];
        console.log(`  Keyword ID: ${lead.keyword_id}`);
        console.log(`  Campaign ID: ${lead.campaign_id}`);
        console.log(`  Ad Group ID: ${lead.ad_group_id}`);
        console.log(`  Match Status: ${lead.match_status}`);
        
        if (lead.keyword_id === null && lead.campaign_id === null && lead.ad_group_id === null) {
          console.log(`  ✅ Attribution removed`);
        } else {
          console.log(`  ❌ Attribution still present`);
        }
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifyRemovedLeads();
