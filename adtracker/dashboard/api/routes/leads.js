const express = require("express");
const pool = require("../db");

const router = express.Router();

// Add conversion_date column if it doesn't exist
pool.query(`
  ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS conversion_date TIMESTAMP
`).catch(err => {
  if (err.code !== '42701') { // Ignore if column already exists
    console.error('Failed to add conversion_date column:', err);
  }
});

// Add status_updated_at column if it doesn't exist
pool.query(`
  ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP
`).catch(err => {
  if (err.code !== '42701') { // Ignore if column already exists
    console.error('Failed to add status_updated_at column:', err);
  }
});

// Backfill status_updated_at for existing records that have NULL values
pool.query(`
  UPDATE leads 
  SET status_updated_at = created_at 
  WHERE status_updated_at IS NULL
`).catch(err => {
  console.error('Failed to backfill status_updated_at:', err);
});

const EDITABLE_FIELDS = ["status", "value", "revenue", "campaign_id", "raw_keyword_text", "gclid", "created_at", "conversion_date", "status_updated_at"];

// GET /api/leads?status=&campaign_id=&from=&to=&search=
router.get("/", async (req, res) => {
  const { status, campaign_id, keyword_id, from, to, search } = req.query;
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`l.status = $${params.length}`);
  }
  if (campaign_id) {
    params.push(campaign_id);
    conditions.push(`l.campaign_id = $${params.length}`);
  }
  if (keyword_id) {
    params.push(keyword_id);
    conditions.push(`l.keyword_id = $${params.length}`);
  }
  if (from) {
    params.push(from);
    conditions.push(`DATE(l.created_at) >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`DATE(l.created_at) <= $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(l.name ILIKE $${params.length} OR l.email ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const { rows } = await pool.query(
      `SELECT
         l.id, l.name, l.first_name, l.last_name, l.email, l.gclid, l.raw_keyword_text,
         l.match_status, l.status, l.value, l.revenue, l.source,
         l.sold, l.rejection_reason,
         l.created_at, l.updated_at, l.conversion_date, l.status_updated_at,
         l.campaign_id, c.name AS campaign_name, ag.name AS ad_group_name, k.text AS keyword_text
       FROM leads l
       LEFT JOIN campaigns c ON c.id = l.campaign_id
       LEFT JOIN ad_groups ag ON ag.id = l.ad_group_id
       LEFT JOIN keywords k ON k.id = l.keyword_id
       ${where}
       ORDER BY l.created_at DESC
       LIMIT 500`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error("Failed to fetch leads:", err);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

// PATCH /api/leads/:id  { status?, value?, notes? }
// Only status/value/notes are editable -- everything else (attribution,
// contact info) comes from the sync/webhook and shouldn't be hand-edited.
// Every changed field is logged to lead_edits for audit history.
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const updates = Object.keys(req.body).filter((key) => EDITABLE_FIELDS.includes(key));

  if (updates.length === 0) {
    return res.status(400).json({ error: `No editable fields provided. Allowed: ${EDITABLE_FIELDS.join(", ")}` });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: existingRows } = await client.query("SELECT * FROM leads WHERE id = $1 FOR UPDATE", [id]);
    if (existingRows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Lead not found" });
    }
    const existing = existingRows[0];

    const setClauses = [];
    const params = [];
    for (const field of updates) {
      params.push(req.body[field]);
      setClauses.push(`${field} = $${params.length}`);
    }

    // Auto-set status_updated_at when status changes and field is blank/not provided
    if (updates.includes('status') && !updates.includes('status_updated_at')) {
      params.push(new Date().toISOString());
      setClauses.push(`status_updated_at = $${params.length}`);
    }

    // Perform keyword lookup if relevant fields are being updated
    let resolvedKeywordId = existing.keyword_id;
    const needsKeywordLookup = updates.some(field => 
      ['campaign_id', 'raw_keyword_text', 'created_at', 'conversion_date'].includes(field)
    );
    
    if (needsKeywordLookup) {
      const campaign_id = req.body.campaign_id !== undefined ? req.body.campaign_id : existing.campaign_id;
      const raw_keyword_text = req.body.raw_keyword_text !== undefined ? req.body.raw_keyword_text : existing.raw_keyword_text;
      const created_at = req.body.created_at !== undefined ? req.body.created_at : existing.created_at;
      const conversion_date = req.body.conversion_date !== undefined ? req.body.conversion_date : existing.conversion_date;
      
      if (raw_keyword_text && campaign_id) {
        // Use conversion_date if available, otherwise fall back to created_at
        const lookupDate = conversion_date || created_at;
        if (lookupDate) {
          const leadDate = new Date(lookupDate).toISOString().split('T')[0];
          console.log('Looking up keyword on update:', { leadDate, campaign_id, raw_keyword_text, usingDate: conversion_date ? 'conversion_date' : 'created_at' });
          
          const keywordResult = await client.query(
            `SELECT ds.keyword_id, k.text 
             FROM daily_stats ds
             JOIN keywords k ON ds.keyword_id = k.id
             JOIN ad_groups ag ON k.ad_group_id = ag.id
             WHERE ds.date = $1 
             AND ag.campaign_id = $2
             AND LOWER(k.text) = LOWER($3)
             LIMIT 1`,
            [leadDate, campaign_id, raw_keyword_text]
          );
          console.log('Keyword lookup result on update:', keywordResult.rows);
          
          if (keywordResult.rows.length > 0) {
            resolvedKeywordId = keywordResult.rows[0].keyword_id;
            // Update the keyword_id and match_status in the set clauses
            params.push(resolvedKeywordId);
            setClauses.push(`keyword_id = $${params.length}`);
            setClauses.push(`match_status = 'matched'`);
          } else {
            // If no match found, update match_status accordingly
            setClauses.push(`match_status = CASE WHEN raw_keyword_text IS NOT NULL OR gclid IS NOT NULL THEN 'no_match' ELSE 'no_tracking_data' END`);
          }
        }
      }
    }
    
    params.push(id);

    const { rows: updatedRows } = await client.query(
      `UPDATE leads SET ${setClauses.join(", ")} WHERE id = $${params.length} RETURNING *`,
      params
    );

    for (const field of updates) {
      const oldValue = existing[field];
      const newValue = req.body[field];
      if (String(oldValue) !== String(newValue)) {
        await client.query(
          `INSERT INTO lead_edits (lead_id, field_name, old_value, new_value) VALUES ($1, $2, $3, $4)`,
          [id, field, oldValue === null ? null : String(oldValue), newValue === null ? null : String(newValue)]
        );
      }
    }

    await client.query("COMMIT");
    res.json(updatedRows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to update lead:", err);
    res.status(500).json({ error: "Failed to update lead" });
  } finally {
    client.release();
  }
});

// DELETE /api/leads/:id -- delete a lead
router.delete("/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Delete lead edits first (foreign key)
    await client.query("DELETE FROM lead_edits WHERE lead_id = $1", [req.params.id]);
    
    // Delete the lead
    const { rows } = await client.query("DELETE FROM leads WHERE id = $1 RETURNING *", [req.params.id]);
    
    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Lead not found" });
    }
    
    await client.query("COMMIT");
    res.json({ success: true, deleted_lead: rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to delete lead:", err);
    res.status(500).json({ error: "Failed to delete lead" });
  } finally {
    client.release();
  }
});

// POST /api/leads -- create a lead manually
router.post("/", async (req, res) => {
  const {
    name, first_name, last_name, email,
    full_address, zip_code, lead_source, status,
    value, revenue, gclid, utm_source, utm_medium,
    utm_campaign, utm_term, landing_page, raw_keyword_text,
    web_source_campaign, campaign_id, ad_group_id, keyword_id, created_at, conversion_date
  } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Ensure status_updated_at column exists
    await client.query(`
      ALTER TABLE leads 
      ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP
    `).catch(err => {
      if (err.code !== '42701') {
        console.error('Failed to add status_updated_at column:', err);
      }
    });

    const fullName = [first_name, last_name].filter(Boolean).join(' ') || name || null;

    // Look up keyword_id if raw_keyword_text and campaign_id are provided
    let resolvedKeywordId = keyword_id;
    if (!resolvedKeywordId && raw_keyword_text && campaign_id) {
      // Use conversion_date if available, otherwise fall back to created_at
      const lookupDate = conversion_date || created_at;
      if (lookupDate) {
        const leadDate = new Date(lookupDate).toISOString().split('T')[0];
        console.log('Looking up keyword:', { leadDate, campaign_id, raw_keyword_text, usingDate: conversion_date ? 'conversion_date' : 'created_at' });
        
        const keywordResult = await client.query(
          `SELECT ds.keyword_id, k.text 
           FROM daily_stats ds
           JOIN keywords k ON ds.keyword_id = k.id
           JOIN ad_groups ag ON k.ad_group_id = ag.id
           WHERE ds.date = $1 
           AND ag.campaign_id = $2
           AND LOWER(k.text) = LOWER($3)
           LIMIT 1`,
          [leadDate, campaign_id, raw_keyword_text]
        );
        console.log('Keyword lookup result:', keywordResult.rows);
        
        if (keywordResult.rows.length > 0) {
          resolvedKeywordId = keywordResult.rows[0].keyword_id;
        }
      }
    }

    // Check if status_updated_at column exists in the table
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'leads' AND column_name = 'status_updated_at'
    `);
    const hasStatusUpdatedAt = columnCheck.rows.length > 0;

    let insertQuery, insertValues;
    if (hasStatusUpdatedAt) {
      insertQuery = `INSERT INTO leads (name, first_name, last_name, email, full_address, zip_code,
         gclid, utm_source, utm_medium, utm_campaign, utm_term, landing_page, raw_keyword_text,
         web_source_campaign, campaign_id, ad_group_id, keyword_id, match_status, status, value, revenue, source, created_at, conversion_date, status_updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
       RETURNING *`;
      insertValues = [
        fullName, first_name, last_name, email, full_address, zip_code,
        gclid, utm_source, utm_medium, utm_campaign, utm_term, landing_page, raw_keyword_text,
        web_source_campaign, campaign_id, ad_group_id, resolvedKeywordId,
        (resolvedKeywordId ? 'matched' : (gclid || raw_keyword_text ? 'no_match' : 'no_tracking_data')),
        status || 'Contacted', value, revenue, 'manual', created_at || new Date().toISOString(), conversion_date, new Date().toISOString()
      ];
    } else {
      insertQuery = `INSERT INTO leads (name, first_name, last_name, email, full_address, zip_code,
         gclid, utm_source, utm_medium, utm_campaign, utm_term, landing_page, raw_keyword_text,
         web_source_campaign, campaign_id, ad_group_id, keyword_id, match_status, status, value, revenue, source, created_at, conversion_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
       RETURNING *`;
      insertValues = [
        fullName, first_name, last_name, email, full_address, zip_code,
        gclid, utm_source, utm_medium, utm_campaign, utm_term, landing_page, raw_keyword_text,
        web_source_campaign, campaign_id, ad_group_id, resolvedKeywordId,
        (resolvedKeywordId ? 'matched' : (gclid || raw_keyword_text ? 'no_match' : 'no_tracking_data')),
        status || 'Contacted', value, revenue, 'manual', created_at || new Date().toISOString(), conversion_date
      ];
    }

    const { rows } = await client.query(insertQuery, insertValues);

    await client.query("COMMIT");
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to create lead:", err);
    res.status(500).json({ error: "Failed to create lead: " + err.message });
  } finally {
    client.release();
  }
});

// GET /api/leads/:id/history -- audit trail of manual edits
router.get("/:id/history", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT field_name, old_value, new_value, edited_at FROM lead_edits WHERE lead_id = $1 ORDER BY edited_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Failed to fetch lead history:", err);
    res.status(500).json({ error: "Failed to fetch lead history" });
  }
});

// POST /api/leads/sync-status -- bulk status update from external source (Google Sheets, CRM, etc.)
// Matches leads by email or phone and updates status
router.post("/sync-status", async (req, res) => {
  const { leads } = req.body; // Array of { email, phone, status }

  if (!Array.isArray(leads)) {
    return res.status(400).json({ error: "leads must be an array" });
  }

  const STATUS_MAPPING = {
    "open": "new",
    "appointment set": "contacted",
    "pre-sale qualified": "qualified",
    "proposal": "qualified",
    "site assessment": "qualified",
    "closed won": "won",
    "closed lost": "lost"
  };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let updated = 0;
    let matched = 0;
    const results = [];

    for (const leadData of leads) {
      const { email, phone, status } = leadData;
      
      if (!email && !phone) {
        results.push({ error: "Missing email or phone", data: leadData });
        continue;
      }

      const mappedStatus = STATUS_MAPPING[status.toLowerCase()];
      if (!mappedStatus) {
        results.push({ error: `Unmapped status: ${status}`, data: leadData });
        continue;
      }

      // Match lead by email or phone
      const { rows } = await client.query(
        `SELECT id, status FROM leads 
         WHERE email = $1 OR phone = $2 
         LIMIT 1`,
        [email, phone]
      );

      if (rows.length === 0) {
        results.push({ error: "No matching lead found", data: leadData });
        continue;
      }

      matched++;
      const lead = rows[0];

      // Only update if status changed
      if (lead.status !== mappedStatus) {
        await client.query(
          `UPDATE leads 
           SET status = $1, updated_at = NOW()
           WHERE id = $2`,
          [mappedStatus, lead.id]
        );

        // Log the change to lead_edits
        await client.query(
          `INSERT INTO lead_edits (lead_id, field_name, old_value, new_value)
           VALUES ($1, 'status', $2, $3)`,
          [lead.id, lead.status, mappedStatus]
        );

        updated++;
        results.push({ success: true, lead_id: lead.id, old_status: lead.status, new_status: mappedStatus });
      } else {
        results.push({ success: true, lead_id: lead.id, unchanged: true });
      }
    }

    await client.query("COMMIT");
    res.json({ matched, updated, results });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to sync status:", err);
    res.status(500).json({ error: "Failed to sync status" });
  } finally {
    client.release();
  }
});

// POST /api/leads/sync-crm -- full CRM sync with all fields from Google Sheets
// Only UPDATES existing leads (no creation) - for daily status updates
router.post("/sync-crm", async (req, res) => {
  const { leads } = req.body; // Array of full lead objects from CRM

  if (!Array.isArray(leads)) {
    return res.status(400).json({ error: "leads must be an array" });
  }

  const STATUS_MAPPING = {
    "open": "new",
    "appointment set": "contacted",
    "pre-sale qualified": "qualified",
    "proposal": "qualified",
    "site assessment": "qualified",
    "closed won": "won",
    "closed lost": "lost"
  };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let updated = 0;
    let matched = 0;
    const results = [];

    for (const leadData of leads) {
      const {
        crm_lead_id,
        first_name,
        last_name,
        email,
        phone,
        lead_source,
        last_modified_date,
        status,
        disqualified_reason,
        outbound_calls,
        converted,
        converted_date,
        opportunity_name,
        stage,
        closed_lost_reason,
        full_address,
        zip_code,
        web_source_campaign
      } = leadData;

      if (!email && !phone) {
        results.push({ error: "Missing email or phone", data: leadData });
        continue;
      }

      const mappedStatus = STATUS_MAPPING[status?.toLowerCase()] || "new";

      // Try to match by crm_lead_id first, then email/phone
      let { rows } = await client.query(
        `SELECT id, status FROM leads 
         WHERE crm_lead_id = $1 
         LIMIT 1`,
        [crm_lead_id]
      );

      if (rows.length === 0) {
        // Try email/phone match
        rows = await client.query(
          `SELECT id, status FROM leads 
           WHERE email = $1 OR phone = $2 
           LIMIT 1`,
          [email, phone]
        );
      }

      if (rows.length === 0) {
        results.push({ error: "No matching lead found (use /api/leads/create-from-logs for new leads)", data: leadData });
        continue;
      }

      // Update existing lead
      const lead = rows[0];
      const name = [first_name, last_name].filter(Boolean).join(' ') || lead.name;
      
      await client.query(
        `UPDATE leads 
         SET name = $1, first_name = $2, last_name = $3, email = $4, phone = $5, full_address = $6, zip_code = $7,
            lead_source = $8, stage = $9, opportunity_name = $10, converted = $11, converted_date = $12, 
            outbound_calls = $13, disqualified_reason = $14, closed_lost_reason = $15, 
            web_source_campaign = $16, status = $17, crm_lead_id = $18, updated_at = $19
         WHERE id = $20`,
        [
          name, first_name, last_name, email, phone, full_address, zip_code,
          lead_source, stage, opportunity_name,
          converted === true || converted === 'Yes' || converted === 'TRUE',
          converted_date || null,
          parseInt(outbound_calls) || 0,
          disqualified_reason, closed_lost_reason, web_source_campaign,
          mappedStatus, crm_lead_id, last_modified_date || new Date().toISOString(),
          lead.id
        ]
      );

      // Log status change if different
      if (lead.status !== mappedStatus) {
        await client.query(
          `INSERT INTO lead_edits (lead_id, field_name, old_value, new_value)
           VALUES ($1, 'status', $2, $3)`,
          [lead.id, lead.status, mappedStatus]
        );
      }

      updated++;
      matched++;
      results.push({ success: true, lead_id: lead.id, action: 'updated' });
    }

    await client.query("COMMIT");
    res.json({ matched, updated, results });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to sync CRM data:", err);
    res.status(500).json({ error: "Failed to sync CRM data" });
  } finally {
    client.release();
  }
});

// POST /api/leads/create-from-logs -- Create new lead from logs with keyword attribution
// This is for initial lead creation when a lead first comes in
router.post("/create-from-logs", async (req, res) => {
  const lead = req.body;
  
  const {
    crm_lead_id,
    first_name,
    last_name,
    email,
    phone,
    created_date,
    lead_source,
    gclid,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    landing_page,
    raw_keyword_text,
    web_source_campaign,
    full_address,
    zip_code
  } = lead;

  if (!email && !phone) {
    return res.status(400).json({ error: "Email or phone required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Resolve keyword attribution
    let campaign_id = null, ad_group_id = null, keyword_id = null, match_status = "no_tracking_data";
    
    if (gclid || raw_keyword_text) {
      // Try to match by gclid first
      if (gclid) {
        const { rows } = await client.query(
          `SELECT c.id AS campaign_id, ag.id AS ad_group_id, k.id AS keyword_id
           FROM gclid_mappings gm
           JOIN keywords k ON k.id = gm.keyword_id
           JOIN ad_groups ag ON ag.id = k.ad_group_id
           JOIN campaigns c ON c.id = ag.campaign_id
           WHERE gm.gclid = $1
           ORDER BY gm.created_at DESC
           LIMIT 1`,
          [gclid]
        );
        
        if (rows.length > 0) {
          ({ campaign_id, ad_group_id, keyword_id } = rows[0]);
          match_status = "matched";
        }
      }
      
      // Fallback: try matching by raw_keyword_text if gclid didn't match
      if (!keyword_id && raw_keyword_text) {
        // Try exact match first
        const { rows } = await client.query(
          `SELECT k.id AS keyword_id, ag.id AS ad_group_id, c.id AS campaign_id
           FROM keywords k
           JOIN ad_groups ag ON ag.id = k.ad_group_id
           JOIN campaigns c ON c.id = ag.campaign_id
           WHERE LOWER(k.text) = LOWER($1)
           LIMIT 1`,
          [raw_keyword_text]
        );
        
        if (rows.length > 0) {
          ({ campaign_id, ad_group_id, keyword_id } = rows[0]);
          match_status = "matched";
        } else {
          // Try partial match (contains)
          const { rows: partialRows } = await client.query(
            `SELECT k.id AS keyword_id, ag.id AS ad_group_id, c.id AS campaign_id
             FROM keywords k
             JOIN ad_groups ag ON ag.id = k.ad_group_id
             JOIN campaigns c ON c.id = ag.campaign_id
             WHERE LOWER(k.text) LIKE LOWER($1) OR LOWER($1) LIKE LOWER(k.text)
             LIMIT 1`,
            [raw_keyword_text]
          );
          
          if (partialRows.length > 0) {
            ({ campaign_id, ad_group_id, keyword_id } = partialRows[0]);
            match_status = "matched";
          } else {
            match_status = "no_match";
          }
        }
      }
    }

    const name = [first_name, last_name].filter(Boolean).join(' ') || null;
    
    // Create lead with status 'open' (mapped to 'new')
    const { rows: newLead } = await client.query(
      `INSERT INTO leads (name, first_name, last_name, email, phone, full_address, zip_code,
         gclid, utm_source, utm_medium, utm_campaign, utm_term, landing_page, raw_keyword_text,
         web_source_campaign, campaign_id, ad_group_id, keyword_id, match_status,
         lead_source, status, source, crm_lead_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
       RETURNING id`,
      [
        name, first_name, last_name, email, phone, full_address, zip_code,
        gclid, utm_source, utm_medium, utm_campaign, utm_term, landing_page, raw_keyword_text,
        web_source_campaign, campaign_id, ad_group_id, keyword_id, match_status,
        lead_source, 'new', 'logs', crm_lead_id,
        created_date || new Date().toISOString(),
        new Date().toISOString()
      ]
    );

    await client.query("COMMIT");
    res.json({ 
      success: true, 
      lead_id: newLead[0].id, 
      match_status,
      keyword_id,
      campaign_id,
      message: "Lead created with keyword attribution and status 'open'"
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to create lead from logs:", err);
    res.status(500).json({ error: "Failed to create lead from logs" });
  } finally {
    client.release();
  }
});

module.exports = router;
