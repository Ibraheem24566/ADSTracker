const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.mxsheezbjhgznqvcvsem:WwDPZKF8AS%23bNzM@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

const logsDir = '/Users/ibraheem/Downloads/adtracker 4/lead-logs';

// Convert UTC timestamp to Pacific timezone
function convertUtcToPacific(utcString) {
  const utcDate = new Date(utcString);
  const pacificDate = new Date(utcDate.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  return pacificDate.toISOString();
}

// Parse log file and extract lead data
function parseLogFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const leads = [];

  for (const line of lines) {
    if (line.includes('POSTING LEAD:')) {
      try {
        const match = line.match(/\[([^\]]+)\] POSTING LEAD: (.+)/);
        if (match) {
          const timestamp = match[1];
          const jsonData = JSON.parse(match[2]);
          if (jsonData.email && jsonData.timestamp) {
            leads.push({
              email: jsonData.email,
              utcTimestamp: jsonData.timestamp,
              logTimestamp: timestamp
            });
          }
        }
      } catch (e) {
        console.error('Error parsing line:', line, e);
      }
    }
  }

  return leads;
}

// Process all log files
async function processLogFiles() {
  const files = fs.readdirSync(logsDir).filter(f => f.startsWith('lead_') && f.endsWith('.log'));
  const allLeads = [];

  for (const file of files) {
    const filePath = path.join(logsDir, file);
    const leads = parseLogFile(filePath);
    allLeads.push(...leads);
    console.log(`Processed ${file}: found ${leads.length} leads`);
  }

  console.log(`Total leads found in logs: ${allLeads.length}`);

  // Update database
  let updated = 0;
  for (const lead of allLeads) {
    try {
      const pacificTime = convertUtcToPacific(lead.utcTimestamp);
      const result = await pool.query(
        'UPDATE leads SET created_at = $1, updated_at = $1 WHERE email = $2',
        [pacificTime, lead.email]
      );
      if (result.rowCount > 0) {
        updated++;
        console.log(`Updated ${lead.email}: ${lead.utcTimestamp} -> ${pacificTime}`);
      }
    } catch (e) {
      console.error(`Error updating ${lead.email}:`, e);
    }
  }

  console.log(`Total leads updated: ${updated}`);
  await pool.end();
}

processLogFiles().catch(console.error);
