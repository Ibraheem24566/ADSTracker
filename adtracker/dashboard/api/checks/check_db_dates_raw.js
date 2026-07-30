const pool = require('./db');

async function checkDbDatesRaw() {
  try {
    console.log('Checking raw database dates without any formatting...');
    
    const result = await pool.query(`
      SELECT 
        date,
        pg_typeof(date) as type
      FROM daily_stats
      WHERE date >= '2026-07-20'
      ORDER BY date DESC
      LIMIT 5
    `);
    
    console.log('Raw database dates:');
    result.rows.forEach(row => {
      console.log(`Date: ${row.date}, Type: ${row.type}`);
    });
    
    // Check what the actual date values are
    const rawCheck = await pool.query(`
      SELECT 
        date::text as raw_text,
        date::date as date_only,
        EXTRACT(DAY FROM date) as day
      FROM daily_stats
      WHERE date >= '2026-07-28'
      LIMIT 3
    `);
    
    console.log('\nDetailed date breakdown:');
    rawCheck.rows.forEach(row => {
      console.log(`Raw text: ${row.raw_text}, Date only: ${row.date_only}, Day: ${row.day}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDbDatesRaw();
