const pool = require('./db');

async function clearRawKeywords() {
  try {
    console.log('Clearing raw_keyword_text from the 10 non-log leads...');
    
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
    
    let updated = 0;
    
    for (const email of removedEmails) {
      const result = await pool.query(
        `UPDATE leads 
         SET raw_keyword_text = NULL
         WHERE LOWER(email) = LOWER($1)
         RETURNING id, email, raw_keyword_text`,
        [email]
      );
      
      if (result.rows.length > 0) {
        updated++;
        console.log(`  Cleared raw_keyword_text for: ${email}`);
      }
    }
    
    console.log(`\nSuccessfully cleared raw_keyword_text from ${updated} leads`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

clearRawKeywords();
