const pool = require('./db');

async function testToChar() {
  try {
    const result = await pool.query(`
      SELECT 
        date,
        TO_CHAR(date, 'YYYY-MM-DD') as formatted_date,
        pg_typeof(TO_CHAR(date, 'YYYY-MM-DD')) as type
      FROM daily_stats
      WHERE date >= '2026-07-20'
      LIMIT 3
    `);
    
    console.log('TO_CHAR results:');
    result.rows.forEach(row => {
      console.log(`Raw date: ${row.date}`);
      console.log(`Formatted: ${row.formatted_date}`);
      console.log(`Type: ${row.type}`);
      console.log('---');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testToChar();
