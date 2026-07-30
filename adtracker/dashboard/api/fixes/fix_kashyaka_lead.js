const pool = require('./db');

async function fixKashyakaLead() {
  try {
    console.log('Fixing kashyaka@gmail.com lead...');
    
    // This lead has keyword_id set but raw_keyword_text is null
    // This is inconsistent - clear the keyword attribution
    await pool.query(
      `UPDATE leads 
       SET keyword_id = NULL,
           match_status = 'no_tracking_data'
       WHERE LOWER(email) = LOWER($1)`,
      ['kashyaka@gmail.com']
    );
    
    console.log('Fixed - cleared keyword_id and set match_status to no_tracking_data');
    
    // Verify the fix
    const result = await pool.query(
      `SELECT keyword_id, raw_keyword_text, match_status FROM leads WHERE LOWER(email) = LOWER($1)`,
      ['kashyaka@gmail.com']
    );
    
    console.log('\nAfter fix:');
    console.log(`  keyword_id: ${result.rows[0].keyword_id}`);
    console.log(`  raw_keyword_text: ${result.rows[0].raw_keyword_text}`);
    console.log(`  match_status: ${result.rows[0].match_status}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixKashyakaLead();
