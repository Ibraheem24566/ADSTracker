const pool = require('./db');

async function checkStatsDatesDetail() {
  try {
    console.log('Checking daily_stats dates in detail...');
    
    const result = await pool.query(`
      SELECT 
        id,
        date,
        TO_CHAR(date, 'YYYY-MM-DD') as formatted_date,
        date::text as raw_text,
        synced_at
      FROM daily_stats
      WHERE date >= '2026-07-20'
      ORDER BY date DESC
      LIMIT 10
    `);
    
    console.log('Daily stats date details:');
    result.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`  Raw date: ${row.raw_text}`);
      console.log(`  Formatted: ${row.formatted_date}`);
      console.log(`  Synced at: ${row.synced_at}`);
      console.log('---');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStatsDatesDetail();
