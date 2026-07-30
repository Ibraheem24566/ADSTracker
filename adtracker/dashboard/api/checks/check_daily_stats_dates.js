const pool = require('./db');

async function checkDailyStatsDates() {
  try {
    console.log('Checking daily_stats dates...');
    
    const result = await pool.query(`
      SELECT date, COUNT(*) as count
      FROM daily_stats
      WHERE date >= '2026-07-20'
      GROUP BY date
      ORDER BY date DESC
    `);
    
    console.log('Daily stats dates from July 20 onwards:');
    result.rows.forEach(row => {
      console.log(`  ${row.date}: ${row.count} entries`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDailyStatsDates();
