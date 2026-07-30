const pool = require('./db');

async function checkAllStatsDates() {
  try {
    console.log('Checking all daily_stats dates...');
    
    const result = await pool.query(`
      SELECT 
        date,
        TO_CHAR(date, 'YYYY-MM-DD') as formatted_date,
        COUNT(*) as count
      FROM daily_stats
      WHERE date >= '2026-04-01'
      GROUP BY date, TO_CHAR(date, 'YYYY-MM-DD')
      ORDER BY date ASC
    `);
    
    console.log('All daily_stats dates from April 1st:');
    result.rows.forEach(row => {
      console.log(`  ${row.formatted_date}: ${row.count} entries`);
    });
    
    // Check if there are any dates that seem off
    const dateStrings = result.rows.map(r => r.formatted_date);
    console.log(`\nTotal unique dates: ${dateStrings.length}`);
    console.log(`Date range: ${dateStrings[0]} to ${dateStrings[dateStrings.length - 1]}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAllStatsDates();
