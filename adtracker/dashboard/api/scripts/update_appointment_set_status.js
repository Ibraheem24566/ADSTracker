const pool = require('./db');

async function updateAppointmentSetStatus() {
  try {
    console.log('Updating leads with "Appointment Sets" status to "Appointment Set"...');
    
    const result = await pool.query(
      `UPDATE leads 
       SET status = 'Appointment Set'
       WHERE status = 'Appointment Sets'
       RETURNING id, email, status`
    );
    
    console.log(`Updated ${result.rows.length} leads`);
    
    if (result.rows.length > 0) {
      console.log('\nUpdated leads:');
      result.rows.forEach(lead => {
        console.log(`  ID: ${lead.id}, Email: ${lead.email}, Status: ${lead.status}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateAppointmentSetStatus();
