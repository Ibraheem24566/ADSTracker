const express = require('express');
const pool = require('./db');

const app = express();
app.use(express.json());

// Simulate the actual API endpoint
app.get('/api/performance', async (req, res) => {
  const { from, to, group_by } = req.query;
  
  const query = `
    SELECT
      TO_CHAR(ds.date, 'YYYY-MM-DD') AS date,
      SUM(ds.impressions) AS impressions
    FROM daily_stats ds
    WHERE ds.date BETWEEN $1 AND $2
    GROUP BY TO_CHAR(ds.date, 'YYYY-MM-DD')
    ORDER BY TO_CHAR(ds.date, 'YYYY-MM-DD') ASC
  `;
  
  const result = await pool.query(query, [from, to]);
  
  console.log('API Response:');
  console.log(JSON.stringify(result.rows, null, 2));
  
  res.json(result.rows);
});

app.listen(3003, () => {
  console.log('Test server running on port 3003');
  console.log('Test with: curl "http://localhost:3003/api/performance?from=2026-07-28&to=2026-07-28&group_by=date"');
});
