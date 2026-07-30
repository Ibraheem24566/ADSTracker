const pool = require('./db');

async function testPerformanceDates() {
  try {
    console.log('Testing performance API date handling...');
    
    // Test with the dates user mentioned (July 23-30)
    const fromDate = '2026-07-23';
    const toDate = '2026-07-30';
    
    console.log(`Querying for dates: ${fromDate} to ${toDate}`);
    
    const result = await pool.query(`
      SELECT 
        TO_CHAR(ds.date::date, 'YYYY-MM-DD') AS date,
        COUNT(*) as count
      FROM daily_stats ds
      WHERE ds.date::date BETWEEN $1 AND $2
      GROUP BY ds.date::date
      ORDER BY ds.date::date ASC
    `, [fromDate, toDate]);
    
    console.log('Results:');
    result.rows.forEach(row => {
      console.log(`  ${row.date}: ${row.count} entries`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testPerformanceDates();
