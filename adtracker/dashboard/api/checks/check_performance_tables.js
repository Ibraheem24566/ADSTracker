const pool = require('./db');

async function checkPerformanceTables() {
  try {
    console.log('Checking ad_performance table structure...');
    const adPerfResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'ad_performance'
      ORDER BY ordinal_position
    `);
    
    console.log('ad_performance table structure:');
    adPerfResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    console.log('\nChecking daily_stats table structure...');
    const dailyStatsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'daily_stats'
      ORDER BY ordinal_position
    `);
    
    console.log('daily_stats table structure:');
    dailyStatsResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check sample data from ad_performance
    console.log('\nSample ad_performance data:');
    const adPerfSample = await pool.query(`
      SELECT * FROM ad_performance LIMIT 3
    `);
    adPerfSample.rows.forEach(row => {
      console.log(row);
    });
    
    // Check sample data from daily_stats
    console.log('\nSample daily_stats data:');
    const dailyStatsSample = await pool.query(`
      SELECT * FROM daily_stats LIMIT 3
    `);
    dailyStatsSample.rows.forEach(row => {
      console.log(row);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPerformanceTables();
