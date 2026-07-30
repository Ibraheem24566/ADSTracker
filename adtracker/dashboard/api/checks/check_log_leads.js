const pool = require('./db');

async function checkLogLeads() {
  try {
    console.log('Checking leads from the logs provided...');
    
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
    
    console.log(`Total leads in logs: ${logEmails.length}`);
    
    // Check how many of these are in the database
    const result = await pool.query(
      `SELECT email, id, created_at, keyword_id, campaign_id, raw_keyword_text
       FROM leads
       WHERE email = ANY($1)`,
      [logEmails]
    );
    
    console.log(`Leads found in database: ${result.rows.length}`);
    
    // Check which ones are missing
    const foundEmails = result.rows.map(r => r.email.toLowerCase());
    const missingEmails = logEmails.filter(email => !foundEmails.includes(email.toLowerCase()));
    
    if (missingEmails.length > 0) {
      console.log(`\nMissing from database (${missingEmails.length}):`);
      missingEmails.forEach(email => console.log(`  ${email}`));
    }
    
    // Check attribution status of found leads
    const withAttribution = result.rows.filter(r => r.keyword_id !== null);
    const withoutAttribution = result.rows.filter(r => r.keyword_id === null);
    
    console.log(`\nAttribution status:`);
    console.log(`  With keyword attribution: ${withAttribution.length}`);
    console.log(`  Without keyword attribution: ${withoutAttribution.length}`);
    
    if (withoutAttribution.length > 0) {
      console.log('\nLeads without attribution:');
      withoutAttribution.forEach(lead => {
        console.log(`  ${lead.email} - Created: ${lead.created_at}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkLogLeads();
