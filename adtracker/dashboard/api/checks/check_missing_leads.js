const pool = require('./db');

async function checkMissingLeads() {
  try {
    console.log('Checking the 3 "missing" leads...');
    
    const missingEmails = [
      'DevinA@gmail.com',
      'Kavian123@yahoo.com',
      'DSTANLEY212@GMAIL.COM'
    ];
    
    for (const email of missingEmails) {
      const result = await pool.query(
        `SELECT id, email, created_at, keyword_id, campaign_id, raw_keyword_text
         FROM leads
         WHERE LOWER(email) = LOWER($1)`,
        [email]
      );
      
      console.log(`\n${email}:`);
      if (result.rows.length > 0) {
        result.rows.forEach(lead => {
          console.log(`  Found - ID: ${lead.id}, Email: "${lead.email}"`);
          console.log(`  Created: ${lead.created_at}`);
          console.log(`  Keyword ID: ${lead.keyword_id}, Campaign ID: ${lead.campaign_id}`);
          console.log(`  Raw keyword: ${lead.raw_keyword_text}`);
        });
      } else {
        console.log(`  Not found in database`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkMissingLeads();
