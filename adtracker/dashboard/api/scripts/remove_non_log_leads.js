const pool = require('./db');

async function removeNonLogLeads() {
  try {
    console.log('Finding leads not in the provided logs...');
    
    // The emails from the logs
    const logEmails = [
      'pamelasjulian@gmail.com',
      'swizznice@yahoo.com',
      'nirmal.singh012@gmail.com',
      'DevinA@gmail.com',
      'eejsnee@aol.com',
      'garrettbrown@gmail.con',
      'deandgilbert@yahoo.com',
      'jpheale@sbcglobal.net',
      'brianac1958@gmail.com',
      'kennyb456@yahoo.com',
      'richardcurrier4@gmail.com',
      'boston3487@gmail.com',
      'marcopolorivera.39@gmail.com',
      'mricci@gmail.com',
      'iamemilyslaton@gmail.com',
      'crystalwoodbury@gmail.com',
      'wendyphillips@hotmail.com',
      'rsmith@mail.com',
      'johncip787@gmail.com',
      'dinneenbill@gmail.com',
      'bensherman125@gmail.com',
      't.wozniak@gateway.net',
      'lilbit@gmail.com',
      'vkg378@gmail.com',
      'lylelainebacalla@yahoo.com',
      'agberner@hotmail.com',
      'jxc93@outlook.com',
      'mickeyslater@gmail.com',
      'shawn@statelunch.com',
      'michael@damiano.com',
      'yimeng1999@yahoo.com',
      'hidgepodge298@hotmail.com',
      'wkfgary0218@gmail.com',
      'jblacker@gmail.com',
      'Kavian123@yahoo.com',
      'baloo@fuzzyphoto.com',
      'jessmcfess@hotmail.com',
      'sheikhmazhar761@gmail.com',
      'kmushala1@live.com',
      'ejd231@gmail.com',
      'momapef805@badgerhole.com',
      'aliceslaststop@comcast.net',
      'DSTANLEY212@GMAIL.COM',
      'pramdass58@hotmail.com'
    ];
    
    // Get all leads with keyword attribution
    const allLeadsResult = await pool.query(
      `SELECT id, email, created_at, keyword_id, campaign_id, raw_keyword_text
       FROM leads
       WHERE keyword_id IS NOT NULL`
    );
    
    console.log(`Total leads with keyword attribution: ${allLeadsResult.rows.length}`);
    
    // Find leads not in the logs (case-insensitive comparison)
    const nonLogLeads = allLeadsResult.rows.filter(lead => {
      return !logEmails.some(logEmail => logEmail.toLowerCase() === lead.email.toLowerCase());
    });
    
    console.log(`Leads with attribution but not in logs: ${nonLogLeads.length}`);
    
    if (nonLogLeads.length > 0) {
      console.log('\nLeads to remove attribution from:');
      nonLogLeads.forEach(lead => {
        console.log(`  ID: ${lead.id}, Email: ${lead.email}`);
        console.log(`    Created: ${lead.created_at}`);
        console.log(`    Keyword ID: ${lead.keyword_id}, Campaign ID: ${lead.campaign_id}`);
        console.log(`    Raw keyword: ${lead.raw_keyword_text}`);
      });
      
      // Remove attribution from these leads
      console.log('\nRemoving attribution...');
      let updated = 0;
      
      for (const lead of nonLogLeads) {
        await pool.query(
          `UPDATE leads 
           SET keyword_id = NULL, 
               campaign_id = NULL, 
               ad_group_id = NULL,
               match_status = 'no_match'
           WHERE id = $1`,
          [lead.id]
        );
        updated++;
        console.log(`  Updated ${updated}/${nonLogLeads.length}: ${lead.email}`);
      }
      
      console.log(`\nSuccessfully removed attribution from ${updated} leads`);
    } else {
      console.log('\nAll attributed leads are from the provided logs ✅');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

removeNonLogLeads();
