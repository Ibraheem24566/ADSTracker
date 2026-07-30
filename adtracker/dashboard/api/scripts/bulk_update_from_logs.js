const pool = require('./db');

// Log data from user
const logData = [
  {
    email: 'pamelasjulian@gmail.com',
    keyword: 'solar installation quote',
    campaign_id: '23694433100',
    gclid: 'CjwKCAjwyabTBhBFEiwAM3mNUBWOgD7x3kLcf3-icU9rogm-LHVA4LQZVj8U2NEvGmxRaLp0k06Q1xoCHxgQAvD_BwE'
  },
  {
    email: 'swizznice@yahoo.com',
    keyword: 'solar quote',
    campaign_id: '23694433100',
    gclid: 'CjwKCAjwpqHTBhAcEiwAj2AfuqDOQ7h_lg6xOfMNcLv3fPXcPZTSGFXpSBrEKxTobnQ7A5AyFr7OaRoCdQQQAvD_BwE'
  },
  {
    email: 'nirmal.singh012@gmail.com',
    keyword: 'solar panel quote',
    campaign_id: '23694433100',
    gclid: 'CjwKCAjwpqHTBhAcEiwAj2AfusF0O5xCwIzdlUR8Y3iSvfCSnaLkKwKaRS58KWMSx3tH9W5Od4PQFxoCKt4QAvD_BwE'
  },
  {
    email: 'DevinA@gmail.com',
    keyword: 'solar quotes',
    campaign_id: '23694433100',
    gclid: 'CjwKCAjwpqHTBhAcEiwAj2Afuhjt-K1DNLctrRauISM4OrE1DawmEzQ_PmGbebsibbIQCRPjpl5_CxoCm70QAvD_BwE'
  },
  {
    email: 'eejsnee@aol.com',
    keyword: 'solar installation quote',
    campaign_id: '23694433100',
    gclid: 'Cj0KCQjw4JbTBhCoARIsALWUaBsEvK1_VSxT3GXr-9CwoX7uKTB1zAoftPz7U-JHmLrlELGJFNqL36IaAiOOEALw_wcB'
  },
  {
    email: 'garrettbrown@gmail.con',
    keyword: 'solar installation quote',
    campaign_id: '23694433100',
    gclid: 'Cj0KCQjwg5zTBhCLARIsAP2AFU6gecB9fefmGUEYQOrbnVfKFuvGDkq8Aa1yUmKPbwC7n3Cmy-cUpHsaAs_iEALw_wcB'
  },
  {
    email: 'deandgilbert@yahoo.com',
    keyword: 'solar power installers near me',
    campaign_id: '24027046290',
    gclid: 'Cj0KCQjw4JbTBhCoARIsALWUaBu12kp4hwv_CIC1DtJzoV4IPZKZQGh8rQL58_TBH_5NjDy83SgMty4aAlIrEALw_wcB'
  },
  {
    email: 'jpheale@sbcglobal.net',
    keyword: 'solar panel quote',
    campaign_id: '23694433100',
    gclid: 'Cj0KCQjw4JbTBhCoARIsALWUaBu4PTkjIZOvgL07qjMq-4RMRqNbcszIXm2-6xmQiIfrDLzGSCLMJ0kaAofFEALw_wcB'
  },
  {
    email: 'brianac1958@gmail.com',
    keyword: 'venture solar review',
    campaign_id: '23694433100',
    gclid: 'Cj0KCQjw4JbTBhCoARIsALWUaBuqBbT7mH6XF91EV2iMB2kWzlo5iWmdD3CdLWBIXrTXX9idWNxLggAaAt1_EALw_wcB'
  },
  {
    email: 'kennyb456@yahoo.com',
    keyword: 'solar providers near me',
    campaign_id: '24027046290',
    gclid: 'CjwKCAjwvZHTBhAlEiwA1ug5PyS-n8R8pQC6FasEFosYZc6Sbr4A7hPDaVk8KCxfhzysgfFowMvt8xoCv4EQAvD_BwE'
  },
  {
    email: 'richardcurrier4@gmail.com',
    keyword: 'solar companies near me',
    campaign_id: '24027046290',
    gclid: 'CjwKCAjwmozTBhAeEiwAkEGZzoRwyek3Xcd9MxFyTa3WN-eitDsjEmzN1y8GRmPq-dCVyqbfLbRWXxoCaA0QAvD_BwE'
  },
  {
    email: 'boston3487@gmail.com',
    keyword: 'venture solar',
    campaign_id: '23694433100',
    gclid: 'Cj0KCQjw94bTBhDQARIsAN3vv0w9ZT8udNqwtKPkOKFCdAYFLu3ymw4Hnta6Qjvj5I-mOr5QAWKUmzsaAlc8EALw_wcB'
  },
  {
    email: 'marcopolorivera.39@gmail.com',
    keyword: 'solar installation quote',
    campaign_id: '23694433100',
    gclid: 'Cj0KCQjw94bTBhDQARIsAN3vv0wvlaAgkQ1cxLOe03aLW7hGSjQbG_j3uMoBeqeyuEC0hHsCreE6tNYaAiwGEALw_wcB'
  },
  {
    email: 'mricci@gmail.com',
    keyword: 'get a solar quote',
    campaign_id: '23694433100',
    gclid: 'CjwKCAjwpefSBhBvEiwAzyEtZyk10xBSpf0CeOB2dIcbie6scXtTgmvWEjzQ0u376BzP39gMTmfQWBoCAxsQAvD_BwE'
  },
  {
    email: 'iamemilyslaton@gmail.com',
    keyword: 'solar quote',
    campaign_id: '23694433100',
    gclid: 'EAIaIQobChMItIasucTclQMV0YPCCB0LuABIEAAYASAAEgLYbvD_BwE'
  },
  {
    email: 'crystalwoodbury@gmail.com',
    keyword: 'solar installation quote',
    campaign_id: '23694433100',
    gclid: 'CjwKCAjw0o3SBhBVEiwAh28-jccko49mjXO0VxeBIUyJZRqVc-OXK3YR5x_n-pP9NPeLyOxECbez0hoCZcUQAvD_BwE'
  },
  {
    email: 'wendyphillips@hotmail.com',
    keyword: 'solar installation quote',
    campaign_id: '23694433100',
    gclid: 'EAIaIQobChMI1Pbpj6illQMVXorCCB3_9ATiEAAYASAAEgK-UvD_BwE'
  },
  {
    email: 'rsmith@mail.com',
    keyword: 'solar quotes',
    campaign_id: '23694433100',
    gclid: 'CjwKCAjw3ejRBhAdEiwADkqPnytfDdmjZB6MEQqfSM9dH5ISoaWY9Gd57D3X63Z87mPFspLlSQ1qMBoC7ZYQAvD_BwE'
  },
  {
    email: 'johncip787@gmail.com',
    keyword: 'solar panel quote',
    campaign_id: '23694433100',
    gclid: 'EAIaIQobChMIjqGepvKOlQMVBlVHAR1ahxP3EAAYBCAAEgIPUvD_BwE'
  },
  {
    email: 'dinneenbill@gmail.com',
    keyword: 'solar installation quote',
    campaign_id: '23694433100',
    gclid: 'Cj0KCQjwi8nRBhDhARIsAHZf_pbXZLbBxsshMqcT1kEOxU2yklgqg5qfPzAfq3oWR14coNdPiW9KYQoaAhEqEALw_wcB'
  },
  {
    email: 'bensherman125@gmail.com',
    keyword: 'venture solar',
    campaign_id: '23694433100',
    gclid: 'CjwKCAjwxb7RBhA5EiwAQ-AAdBenoFfi5FQYFjCW3UX3diDSb6qyMKN5oWPJq6CguMpGDORczQjzcBoCaIwQAvD_BwE'
  },
  {
    email: 't.wozniak@gateway.net',
    keyword: 'solar installation quote',
    campaign_id: '23694433100',
    gclid: 'CjwKCAjwxb7RBhA5EiwAQ-AAdCUfAgjB47gBodvZxA-HaUoFXy_FZdicQw8VOwkQDQq5dRIz0NPmSBoC_5UQAvD_BwE'
  },
  {
    email: 'lilbit@gmail.com',
    keyword: 'solar installation quote',
    campaign_id: '23694433100',
    gclid: 'Cj0KCQjw3K7RBhDJARIsAKRtP5RIxJ9zid33TDyd--LI2vKhnWZfK1jROjgOa5QWfRHKQ2NoPz6GEW8aAh6LEALw_wcB'
  },
  {
    email: 'vkg378@gmail.com',
    keyword: 'venture solar',
    campaign_id: '23694433100',
    gclid: 'Cj0KCQjwlqTRBhCBARIsANrkrxhHe5Q4LzMar18T90frLJJ-Ju_nL6vrknymFQTEfXj5OYpdFv0aWYcaAuMUEALw_wcB'
  },
  {
    email: 'lylelainebacalla@yahoo.com',
    keyword: 'venture solar',
    campaign_id: '23694433100',
    gclid: 'Cj0KCQjw0JnRBhDJARIsALobnXbqSqzFj2WPhASGxZjvKD_booaVpvN5QOrDPgtGJ03FJ9si-Y4oj8waArCREALw_wcB'
  },
  {
    email: 'agberner@hotmail.com',
    keyword: 'venture solar',
    campaign_id: '23694433100',
    gclid: 'CjwKCAjw8uTQBhAdEiwAVvtJyhCXMreScIVrULTnG8j04IitF15XU_f_JqvCI2sZeLmMY-R8vP2ReBoC4_YQAvD_BwE'
  },
  {
    email: 'jxc93@outlook.com',
    keyword: 'venture solar',
    campaign_id: '23694433100',
    gclid: 'EAIaIQobChMIiK-Nu5PhlAMVJjIIBR1PmT3JEAAYASAAEgJq9fD_BwE'
  },
  {
    email: 'mickeyslater@gmail.com',
    keyword: 'venture solar panels',
    campaign_id: '23694433100',
    gclid: 'CjwKCAjw8uTQBhAdEiwAVvtJyjTsAh6r7eZQT_rcIDZQUs84aKSbprGV7V2ZaAiWOTts8zQ9kqbcQRoCglsQAvD_BwE'
  },
  {
    email: 'shawn@statelunch.com',
    keyword: 'solar panel contractors',
    campaign_id: '23694433100',
    gclid: 'Cj0KCQjww8rQBhDjARIsAE43KPOBa0O2No_jNzEOes8sXsyPRoFTmUwhHn6p2DRPj1i1GhbrYhrLGMMaAi7gEALw_wcB'
  },
  {
    email: 'michael@damiano.com',
    keyword: 'venture solar panels',
    campaign_id: '23694433100',
    gclid: 'Cj0KCQjwoMXQBhDcARIsAH-eEtt9lU4AgqXcztKcClYwZSOJ4R_TflPGZytjyELI6td4p6665iJEdkQaArAeEALw_wcB'
  },
  {
    email: 'yimeng1999@yahoo.com',
    keyword: 'venture solar panels',
    campaign_id: '23694433100',
    gclid: 'Cj0KCQjwlLDQBhDjARIsAPlIefGLMv5njN29ACmYw3J4ssaghVxFE0huQI20voMC3U_jGO0Q_ipNa5QaAhR8EALw_wcB'
  },
  {
    email: 'hidgepodge298@hotmail.com',
    keyword: 'solar panel contractors',
    campaign_id: '23694433100',
    gclid: 'Cj0KCQjwlLDQBhDjARIsAPlIefGUlSoL5KmauAmkYK7rdICDbrULwcSrLdxdsdL1dbLFzqkxIevT98oaAmMVEALw_wcB'
  },
  {
    email: 'wkfgary0218@gmail.com',
    keyword: 'venture solar panels',
    campaign_id: '23694433100',
    gclid: 'CjwKCAjw5ZXQBhBdEiwAI5XVWRv9Vg4dBoT3Ie2-VuhW2XqQ8l6c7wPeWT_JmzDVAOjjTuPWQTCBpBoCdAIQAvD_BwE'
  },
  {
    email: 'jblacker@gmail.com',
    keyword: 'solar installation',
    campaign_id: '23694433100',
    gclid: 'CjwKCAjw5ZXQBhBdEiwAI5XVWbPUYRPRPr9c2mBPa9F9_KUHGvj_tGV2lbHChqOA6jeeuo08zSupyRoClKkQAvD_BwE'
  },
  {
    email: 'Kavian123@yahoo.com',
    keyword: 'venture solar panels',
    campaign_id: '23694433100',
    gclid: 'CjwKCAjwn4vQBhBsEiwAq3hhN8IDMX6pseY7HW4rGVcAwqJcv21giZy3CUVSHZaYB0jNw3AAxs4lyhoCkxoQAvD_BwE'
  },
  {
    email: 'baloo@fuzzyphoto.com',
    keyword: 'venture solar panels',
    campaign_id: '23694433100',
    gclid: 'CjwKCAjwn4vQBhBsEiwAq3hhN6nsNlmqCuKyy9ZOGcaLY8MBx92sMdnly61MfpITeEk5-3-BQKHs5RoCW_IQAvD_BwE'
  },
  {
    email: 'jessmcfess@hotmail.com',
    keyword: 'solar installation',
    campaign_id: '23694433100',
    gclid: 'Cj0KCQjw2YDQBhD_ARIsAE1qeSdZcTIHv6IXpKfleABHgbGVbe7pn8F00F5t7zwQfwVk05QPutiSAKsaAtd8EALw_wcB'
  },
  {
    email: 'sheikhmazhar761@gmail.com',
    keyword: 'venture solar panels',
    campaign_id: '23694433100',
    gclid: 'CjwKCAjwtvvPBhBuEiwAPMijr9GL_s4bweqzLgL1ipVfLOrxRdz3WrBYrC-XyVXszFHxswlznawqRhoCnE4QAvD_BwE'
  },
  {
    email: 'kmushala1@live.com',
    keyword: 'getting solar panels',
    campaign_id: '23694433100',
    gclid: 'EAIaIQobChMIrszY9aSqlAMVb2ZHAR1GWhRlEAAYAyAAEgLWTPD_BwE'
  },
  {
    email: 'ejd231@gmail.com',
    keyword: 'venture solar panels',
    campaign_id: '23694433100',
    gclid: 'Cj0KCQjwk_bPBhDXARIsACiq8R09n7qSjADTIOhM6rFKGX6B_EwF3r04py1Yn5lR591ut7peLU4GODwaAhcsEALw_wcB'
  },
  {
    email: 'momapef805@badgerhole.com',
    keyword: 'solar installation',
    campaign_id: '23694433100',
    gclid: 'Cj0KCQjwk_bPBhDXARIsACiq8R2CQYnHvZv_0UHGYeKotY-SEv-aYCg781EpqyzDd0TuqBkVRAIOlskaAqWsEALw_wcB'
  },
  {
    email: 'aliceslaststop@comcast.net',
    keyword: 'solar installation',
    campaign_id: '23694433100',
    gclid: 'Cj0KCQjw8PDPBhCeARIsAOJwmWVMo-OpylGUaMZN-Zo6ooLePMcznMgvOGyJ9rsspmTskWmbf0HTarYaAlWBEALw_wcB'
  },
  {
    email: 'DSTANLEY212@GMAIL.COM',
    keyword: 'put solar panels on my house',
    campaign_id: '23694433100',
    gclid: 'Cj0KCQjwh-HPBhCIARIsAC0p3cenUwjDPhnTEKRQoispPoNck9BahNb4IZ-5cN-vA4hcTpGtTl-RrRwaAuFHEALw_wcB'
  },
  {
    email: 'pramdass58@hotmail.com',
    keyword: 'venture solar panels',
    campaign_id: '23694433100',
    gclid: null
  }
];

async function bulkUpdateLeads() {
  try {
    console.log('Starting bulk update from logs...');
    
    // Get all unique keywords from logs
    const keywords = [...new Set(logData.map(d => d.keyword).filter(k => k))];
    console.log('Keywords to match:', keywords);
    
    // Get all keywords from database for case-insensitive matching
    const keywordResult = await pool.query('SELECT id, text FROM keywords');
    
    const keywordMap = {};
    keywordResult.rows.forEach(row => {
      keywordMap[row.text.toLowerCase()] = row.id;
    });
    
    console.log('Keyword map:', keywordMap);
    
    // Find unmatched keywords (case-insensitive)
    const unmatchedKeywords = keywords.filter(k => !keywordMap[k.toLowerCase()]);
    if (unmatchedKeywords.length > 0) {
      console.log('Unmatched keywords:', unmatchedKeywords);
    }
    
    // Get all emails from logs
    const emails = logData.map(d => d.email.toLowerCase());
    
    // Get leads from database
    const leadsResult = await pool.query(
      'SELECT id, email, keyword_id, campaign_id, gclid FROM leads WHERE email = ANY($1)',
      [emails]
    );
    
    const leadMap = {};
    leadsResult.rows.forEach(row => {
      leadMap[row.email.toLowerCase()] = row;
    });
    
    console.log('Found leads:', leadsResult.rows.length);
    
    // Find unmatched emails
    const unmatchedEmails = emails.filter(e => !leadMap[e]);
    if (unmatchedEmails.length > 0) {
      console.log('Unmatched emails:', unmatchedEmails);
    }
    
    // Prepare updates
    const updates = [];
    const notFound = [];
    
    for (const log of logData) {
      const emailLower = log.email.toLowerCase();
      const lead = leadMap[emailLower];
      
      if (!lead) {
        notFound.push(log.email);
        continue;
      }
      
      const keywordId = keywordMap[log.keyword.toLowerCase()] || null;
      
      // Only update if something changed
      if (lead.keyword_id !== keywordId || 
          lead.campaign_id !== log.campaign_id || 
          lead.gclid !== log.gclid) {
        updates.push({
          leadId: lead.id,
          keywordId: keywordId,
          campaignId: log.campaign_id,
          gclid: log.gclid,
          email: log.email
        });
      }
    }
    
    console.log('Updates to perform:', updates.length);
    console.log('Leads not found:', notFound.length);
    
    if (notFound.length > 0) {
      console.log('Not found emails:', notFound);
    }
    
    // Perform individual updates (simpler approach to avoid parameter type issues)
    let updated = 0;
    
    for (const update of updates) {
      const setClauses = [];
      const values = [];
      let paramIndex = 1;
      
      if (update.keywordId !== null) {
        setClauses.push(`keyword_id = $${paramIndex}::bigint`);
        values.push(update.keywordId);
        paramIndex++;
      }
      
      if (update.campaignId !== null) {
        setClauses.push(`campaign_id = $${paramIndex}::bigint`);
        values.push(update.campaignId);
        paramIndex++;
      }
      
      if (update.gclid !== null) {
        setClauses.push(`gclid = $${paramIndex}::text`);
        values.push(update.gclid);
        paramIndex++;
      }
      
      if (setClauses.length === 0) {
        continue;
      }
      
      values.push(update.leadId);
      
      const updateQuery = `
        UPDATE leads 
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}::bigint
      `;
      
      await pool.query(updateQuery, values);
      updated++;
      
      console.log(`Updated lead ${update.email} (${update.leadId})`);
    }
    
    console.log('Bulk update completed!');
    console.log(`Total updated: ${updated}`);
    console.log(`Not found: ${notFound.length}`);
    console.log(`Unmatched keywords: ${unmatchedKeywords.length}`);
    
    if (unmatchedKeywords.length > 0) {
      console.log('Unmatched keywords:', unmatchedKeywords);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error during bulk update:', error);
    process.exit(1);
  }
}

bulkUpdateLeads();
