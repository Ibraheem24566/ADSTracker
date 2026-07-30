const pool = require('./db');

async function checkKeywords() {
  try {
    console.log('Checking keywords in database...');
    
    // Get all keywords
    const result = await pool.query('SELECT id, text FROM keywords ORDER BY text');
    
    console.log('All keywords in database:');
    result.rows.forEach(row => {
      console.log(`- ${row.text} (ID: ${row.id})`);
    });
    
    // Check for venture-related keywords
    const ventureKeywords = result.rows.filter(row => 
      row.text.toLowerCase().includes('venture')
    );
    
    console.log('\nVenture-related keywords:');
    ventureKeywords.forEach(row => {
      console.log(`- ${row.text} (ID: ${row.id})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkKeywords();
