// Test the parseLocalDate function
const parseLocalDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toISOString().split('T')[0];
};

console.log('Testing parseLocalDate function:');
console.log(`Input: 2026-07-23, Output: ${parseLocalDate('2026-07-23')}`);
console.log(`Input: 2026-07-30, Output: ${parseLocalDate('2026-07-30')}`);
console.log(`Input: 2026-07-28, Output: ${parseLocalDate('2026-07-28')}`);

// Test with the database
const pool = require('./db');

async function testWithDatabase() {
  try {
    const from = parseLocalDate('2026-07-23');
    const to = parseLocalDate('2026-07-30');
    
    console.log(`\nTesting with database using parsed dates:`);
    console.log(`  from: ${from}`);
    console.log(`  to: ${to}`);
    
    const result = await pool.query(`
      SELECT
        TO_CHAR(ds.date::date, 'YYYY-MM-DD') AS date,
        SUM(ds.impressions) AS impressions
      FROM daily_stats ds
      WHERE ds.date::date BETWEEN $1 AND $2
      GROUP BY ds.date::date
      ORDER BY ds.date::date ASC
    `, [from, to]);
    
    console.log('\nQuery results:');
    result.rows.forEach(row => {
      console.log(`  ${row.date}: ${row.impressions} impressions`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testWithDatabase();
