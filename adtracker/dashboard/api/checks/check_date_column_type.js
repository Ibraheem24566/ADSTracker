const pool = require('./db');

async function checkDateColumnType() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'daily_stats' AND column_name = 'date'
    `);
    
    console.log('daily_stats.date column type:');
    console.log(result.rows[0]);
    
    // Check what type the database returns
    const sample = await pool.query(`
      SELECT date, pg_typeof(date) as type
      FROM daily_stats
      LIMIT 1
    `);
    
    console.log('\nSample date value and type:');
    console.log(sample.rows[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDateColumnType();
