const pool = require('./db');

async function checkActualDates() {
  try {
    // Check the actual date values stored in the database
    const result = await pool.query(`
      SELECT 
        date,
        TO_CHAR(date, 'YYYY-MM-DD') as formatted_date,
        date::text as raw_date,
        date::timestamp with time zone as timestamp
      FROM daily_stats
      WHERE date >= '2026-07-20'
      ORDER BY date ASC
      LIMIT 10
    `);
    
    console.log('Actual database dates:');
    result.rows.forEach(row => {
      console.log(`Raw date: ${row.raw_date}`);
      console.log(`Formatted: ${row.formatted_date}`);
      console.log(`Timestamp: ${row.timestamp}`);
      console.log('---');
    });
    
    // Check if there's a pattern - are they stored as UTC but should be local?
    console.log('\nChecking if dates need adjustment:');
    const checkResult = await pool.query(`
      SELECT 
        date,
        date::date as date_only,
        date::date + INTERVAL '1 day' as next_day
      FROM daily_stats
      WHERE date >= '2026-07-20'
      LIMIT 5
    `);
    
    checkResult.rows.forEach(row => {
      console.log(`Stored: ${row.date}, Date only: ${row.date_only}, Next day: ${row.next_day}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkActualDates();
