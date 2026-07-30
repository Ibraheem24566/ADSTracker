const http = require('http');

// API configuration
const API_URL = 'localhost';
const API_PORT = 3002;
const AUTH = 'Basic ' + Buffer.from('admin:admin123').toString('base64');

// Lead data from the user (JSON log format)
const leadData = [
  {
    "campaign_id":"49dd58a1-2f1c-414f-949d-b676ac4dc3e9",
    "publisher_id":"84d70df9-91af-406d-ba3d-c70383a20886",
    "first_name":"Raymond",
    "last_name":"T mattison",
    "address":"na",
    "city":"Cambridge",
    "state":"NY",
    "zip_code":"12816",
    "email":"lyrus455@gmail.com",
    "phone":"5184156540",
    "roof_shade":"full sun",
    "electric_bill":"$351 - $500",
    "credit":"good",
    "ip_address":"68.152.78.77",
    "timestamp":"2026-07-29T15:20:46+00:00",
    "trusted_form_token":"na",
    "source_id":"google",
    "S1":"23694433100",
    "S2":"199862459511",
    "S3":"810874015867",
    "S4":"solar installation quote"
  },
  {
    "campaign_id":"49dd58a1-2f1c-414f-949d-b676ac4dc3e9",
    "publisher_id":"84d70df9-91af-406d-ba3d-c70383a20886",
    "first_name":"Pamela",
    "last_name":"Julian",
    "address":"na",
    "city":"Brookline",
    "state":"MA",
    "zip_code":"02445",
    "email":"pamelasjulian@gmail.com",
    "phone":"6176943797",
    "roof_shade":"full sun",
    "electric_bill":"$151 - $250",
    "credit":"good",
    "ip_address":"73.249.163.59",
    "timestamp":"2026-07-29T16:24:10+00:00",
    "trusted_form_token":"na",
    "source_id":"google",
    "S1":"23694433100",
    "S2":"199862459511",
    "S3":"810874015867",
    "S4":"solar installation quote"
  }
];

// Convert JSON log lead to API format
function convertToApiFormat(lead) {
  // Parse timestamp to YYYY-MM-DD
  function parseTimestamp(timestamp) {
    if (!timestamp) return null;
    return timestamp.split('T')[0];
  }

  // Construct GCLID from S1, S2, S3
  const gclid = lead.S1 && lead.S2 && lead.S3 ? `${lead.S1}-${lead.S2}-${lead.S3}` : null;

  // Construct full address
  const fullAddress = lead.address && lead.city && lead.state 
    ? `${lead.address}, ${lead.city}, ${lead.state}, ${lead.zip_code}` 
    : `${lead.city || ''}, ${lead.state || ''} ${lead.zip_code || ''}`;

  return {
    first_name: lead.first_name || '',
    last_name: lead.last_name || '',
    email: lead.email || '',
    status: 'Contacted',
    created_at: parseTimestamp(lead.timestamp) || new Date().toISOString().split('T')[0],
    conversion_date: null,
    full_address: fullAddress,
    zip_code: lead.zip_code || '',
    lead_source: lead.source_id || 'google',
    gclid: gclid,
    raw_keyword_text: lead.S4 || null,
    disqualified_reason: null,
    revenue: null
  };
}

// Make HTTP request
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Fetch existing leads to check for duplicates
async function fetchExistingEmails() {
  const options = {
    hostname: API_URL,
    port: API_PORT,
    path: '/api/leads',
    method: 'GET',
    headers: {
      'Authorization': AUTH,
      'Content-Type': 'application/json'
    }
  };

  const response = await makeRequest(options);
  if (response.statusCode !== 200) {
    console.error('Failed to fetch existing leads:', response.body);
    return [];
  }

  return response.body.map(lead => lead.email.toLowerCase());
}

// Create a lead
async function createLead(leadData) {
  const options = {
    hostname: API_URL,
    port: API_PORT,
    path: '/api/leads',
    method: 'POST',
    headers: {
      'Authorization': AUTH,
      'Content-Type': 'application/json'
    }
  };

  const response = await makeRequest(options, leadData);
  return response;
}

// Main function
async function main() {
  console.log('Processing lead data...');
  const parsedLeads = leadData; // Already parsed as JSON array
  console.log(`Found ${parsedLeads.length} leads to process`);

  console.log('Fetching existing leads to check for duplicates...');
  const existingEmails = await fetchExistingEmails();
  console.log(`Found ${existingEmails.length} existing leads in dashboard`);

  const newLeads = parsedLeads.filter(lead => {
    const email = lead.email ? lead.email.toLowerCase() : '';
    return email && !existingEmails.includes(email);
  });

  console.log(`Found ${newLeads.length} new leads to import (skipping ${parsedLeads.length - newLeads.length} duplicates)`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < newLeads.length; i++) {
    const parsedLead = newLeads[i];
    const apiLead = convertToApiFormat(parsedLead);
    
    console.log(`Importing lead ${i + 1}/${newLeads.length}: ${apiLead.email}...`);
    
    try {
      const response = await createLead(apiLead);
      if (response.statusCode === 201) {
        console.log(`  ✓ Success`);
        successCount++;
      } else {
        console.log(`  ✗ Failed: ${response.statusCode}`, response.body);
        errorCount++;
      }
    } catch (error) {
      console.log(`  ✗ Error: ${error.message}`);
      errorCount++;
    }

    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\nImport complete: ${successCount} succeeded, ${errorCount} failed`);
}

main().catch(console.error);
