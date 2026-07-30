const pool = require('./db');

async function checkGclidMappings() {
  try {
    console.log('Checking gclid_mappings table structure...');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'gclid_mappings'
      ORDER BY ordinal_position
    `);
    
    console.log('gclid_mappings table structure:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check sample data
    const sample = await pool.query(`
      SELECT * FROM gclid_mappings LIMIT 5
    `);
    
    console.log('\nSample gclid_mappings data:');
    sample.rows.forEach(row => {
      console.log(row);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkGclidMappings();
