const pool = require('./db');

async function checkDateTimezone() {
  try {
    console.log('Checking daily_stats date values...');
    
    const result = await pool.query(`
      SELECT date, TO_CHAR(date, 'YYYY-MM-DD') as formatted_date, 
             date::text as raw_text
      FROM daily_stats
      WHERE date >= '2026-07-23'
      ORDER BY date DESC
      LIMIT 5
    `);
    
    console.log('Daily stats date values:');
    result.rows.forEach(row => {
      console.log(`  Raw: ${row.raw_text}, Formatted: ${row.formatted_date}`);
    });
    
    // Check database timezone
    const timezoneResult = await pool.query('SHOW timezone');
    console.log(`\nDatabase timezone: ${timezoneResult.rows[0].TimeZone}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDateTimezone();
