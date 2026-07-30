const pool = require('./db');

async function checkMatchingMethod() {
  try {
    console.log('Checking how leads were matched to keywords...');
    
    // Get all leads with keyword_id and check if they have raw_keyword_text or gclid
    const leadsResult = await pool.query(`
      SELECT id, email, created_at, keyword_id, campaign_id, ad_group_id, raw_keyword_text, gclid
      FROM leads
      WHERE keyword_id IS NOT NULL
      ORDER BY created_at DESC
    `);
    
    console.log(`Found ${leadsResult.rows.length} leads with keyword attribution`);
    
    const withRawKeyword = leadsResult.rows.filter(l => l.raw_keyword_text);
    const withGclid = leadsResult.rows.filter(l => l.gclid);
    const withNeither = leadsResult.rows.filter(l => !l.raw_keyword_text && !l.gclid);
    
    console.log(`\nBreakdown by available data:`);
    console.log(`  With raw_keyword_text: ${withRawKeyword.length}`);
    console.log(`  With gclid: ${withGclid.length}`);
    console.log(`  With neither (likely fallback match): ${withNeither.length}`);
    
    if (withNeither.length > 0) {
      console.log('\nLeads matched via fallback (no raw_keyword_text or gclid):');
      withNeither.forEach(lead => {
        console.log(`  ID: ${lead.id}, Email: ${lead.email}`);
        console.log(`    Created: ${lead.created_at}`);
        console.log(`    Keyword ID: ${lead.keyword_id}, Campaign ID: ${lead.campaign_id}`);
        console.log('---');
      });
    }
    
    // Check if any leads have raw_keyword_text that doesn't match their attributed keyword
    const mismatchedText = [];
    for (const lead of leadsResult.rows) {
      if (lead.raw_keyword_text) {
        const keywordResult = await pool.query(
          `SELECT text FROM keywords WHERE id = $1`,
          [lead.keyword_id]
        );
        
        if (keywordResult.rows.length > 0) {
          const keywordText = keywordResult.rows[0].text;
          if (keywordText.toLowerCase() !== lead.raw_keyword_text.toLowerCase()) {
            mismatchedText.push({
              id: lead.id,
              email: lead.email,
              raw_keyword: lead.raw_keyword_text,
              attributed_keyword: keywordText
            });
          }
        }
      }
    }
    
    if (mismatchedText.length > 0) {
      console.log('\nLeads where raw_keyword_text differs from attributed keyword:');
      mismatchedText.forEach(lead => {
        console.log(`  ID: ${lead.id}, Email: ${lead.email}`);
        console.log(`    Raw keyword from lead: "${lead.raw_keyword}"`);
        console.log(`    Attributed keyword: "${lead.attributed_keyword}"`);
        console.log('---');
      });
    } else {
      console.log('\nAll leads with raw_keyword_text match their attributed keywords ✅');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkMatchingMethod();
