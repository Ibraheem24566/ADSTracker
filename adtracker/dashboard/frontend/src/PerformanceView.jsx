import { useEffect, useState, useCallback, useMemo } from "react";
import { getPerformance, getCampaigns } from "./api";
import { ArrowUpIcon, ArrowDownIcon } from "./icons";

const METRIC_EXPLANATIONS = {
  impressions: "Number of times your ads were shown",
  clicks: "Number of times people clicked your ads",
  ctr: "Click-Through Rate: (Clicks / Impressions) × 100",
  cost: "Total amount spent on this item",
  avg_cpc: "Average Cost Per Click: (Cost / Clicks)",
  conversions: "Number of Google Ads conversions",
  click_to_conversion_rate: "Conversion Rate: (Conversions / Clicks) × 100",
  lead_count: "Number of leads generated from this item",
  cost_per_lead: "Average cost to get one lead: (Cost / Lead Count)",
  avg_impression_share: "How often your ad shows vs. total opportunities",
  avg_quality_score: "Google's rating of your ad quality (1-10 scale)"
};

function MetricTooltip({ metric, children }) {
  const [show, setShow] = useState(false);
  return (
    <div 
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '8px',
          padding: '8px 12px',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          fontSize: '12px',
          color: 'var(--text)',
          whiteSpace: 'nowrap',
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          maxWidth: '300px',
          whiteSpace: 'normal'
        }}>
          {METRIC_EXPLANATIONS[metric]}
        </div>
      )}
    </div>
  );
}

function todayMinus(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toLocaleDateString('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function fmtMoney(n) { return `$${Number(n).toFixed(2)}`; }
function fmtPct(n) { return `${(Number(n) * 100).toFixed(1)}%`; }

const GROUP_OPTIONS = [
  { key: "keyword", label: "By keyword" },
  { key: "ad_group", label: "By ad group" },
  { key: "campaign", label: "By campaign" },
  { key: "date", label: "By date" },
];

function SortHeader({ id, label, sort, setSort, className }) {
  const active = sort.key === id;
  return (
    <th
      className={`sortable ${className || ""} ${active ? "active" : ""}`}
      onClick={() => setSort((s) => (s.key === id ? { key: id, dir: s.dir === "asc" ? "desc" : "asc" } : { key: id, dir: id === "cost" ? "desc" : "asc" }))}
    >
      {label}
      <span className="arrow">
        {active ? (sort.dir === "asc" ? <ArrowUpIcon width={10} height={10} strokeWidth={3} /> : <ArrowDownIcon width={10} height={10} strokeWidth={3} />) : "↕"}
      </span>
    </th>
  );
}

export default function PerformanceView({ onSelectKeyword }) {
  const [rows, setRows] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState("keyword");
  const [range, setRange] = useState({ from: todayMinus(7), to: todayMinus(0) });
  const [campaignId, setCampaignId] = useState("");
  const [sort, setSort] = useState({ key: "cost", dir: "desc" });
  const [columnOrder, setColumnOrder] = useState(() => {
    const saved = localStorage.getItem('performance_column_order');
    const defaultOrder = ['label', 'campaign', 'campaign_id', 'ad_group_id', 'keyword_id', 'impressions', 'clicks', 'ctr', 'cost', 'avg_cpc', 'conversions', 'click_to_conversion_rate', 'lead_count', 'cost_per_lead', 'avg_impression_share', 'avg_quality_score'];
    if (saved) {
      const parsed = JSON.parse(saved);
      // Add new column if it doesn't exist in saved order
      if (!parsed.includes('click_to_conversion_rate')) {
        const conversionsIndex = parsed.indexOf('conversions');
        if (conversionsIndex !== -1) {
          parsed.splice(conversionsIndex + 1, 0, 'click_to_conversion_rate');
        }
      }
      return parsed;
    }
    return defaultOrder;
  });
  const [draggedColumn, setDraggedColumn] = useState(null);

  // Save column order to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('performance_column_order', JSON.stringify(columnOrder));
  }, [columnOrder]);

  const handleDragStart = (columnId) => {
    setDraggedColumn(columnId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (targetColumnId) => {
    if (draggedColumn === targetColumnId) return;
    
    const newOrder = [...columnOrder];
    const draggedIndex = newOrder.indexOf(draggedColumn);
    const targetIndex = newOrder.indexOf(targetColumnId);
    
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedColumn);
    
    setColumnOrder(newOrder);
    setDraggedColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
  };

  const labelKey = groupBy === "date" ? "date" : groupBy === "campaign" ? "campaign_name" : groupBy === "ad_group" ? "ad_group_name" : "keyword_text";

  // Column configuration for rendering
  const columnConfig = useMemo(() => ({
    label: {
      header: <SortHeader id={labelKey} label={groupBy === "date" ? "Date" : groupBy === "campaign" ? "Campaign" : groupBy === "ad_group" ? "Ad Group" : "Keyword"} sort={sort} setSort={setSort} />,
      cell: (r) => (
        <td
          style={groupBy === "keyword" && onSelectKeyword ? { cursor: "pointer", textDecoration: "underline" } : undefined}
          onClick={groupBy === "keyword" ? () => onSelectKeyword?.(r.keyword_id, r.keyword_text) : undefined}
        >
          {groupBy === "date" ? r.date : groupBy === "campaign" ? r.campaign_name : groupBy === "ad_group" ? r.ad_group_name : r.keyword_text}
        </td>
      ),
      draggable: true,
      visible: true
    },
    campaign: {
      header: <th>Campaign</th>,
      cell: (r) => <td>{r.campaign_name}</td>,
      draggable: true,
      visible: groupBy === "keyword" || groupBy === "ad_group"
    },
    campaign_id: {
      header: <th style={{ fontSize: 11, color: "var(--text-muted)" }}>Campaign ID</th>,
      cell: (r) => <td style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.campaign_id}</td>,
      draggable: true,
      visible: groupBy !== "campaign"
    },
    ad_group_id: {
      header: <th style={{ fontSize: 11, color: "var(--text-muted)" }}>Ad Group ID</th>,
      cell: (r) => <td style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.ad_group_id}</td>,
      draggable: true,
      visible: groupBy === "keyword"
    },
    keyword_id: {
      header: <th style={{ fontSize: 11, color: "var(--text-muted)" }}>Keyword ID</th>,
      cell: (r) => <td style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.keyword_id}</td>,
      draggable: true,
      visible: groupBy === "keyword"
    },
    impressions: {
      header: <MetricTooltip metric="impressions"><SortHeader id="impressions" label="Impr." sort={sort} setSort={setSort} className="num" /></MetricTooltip>,
      cell: (r) => <td className="num">{r.impressions.toLocaleString()}</td>,
      draggable: true,
      visible: true
    },
    clicks: {
      header: <MetricTooltip metric="clicks"><SortHeader id="clicks" label="Clicks" sort={sort} setSort={setSort} className="num" /></MetricTooltip>,
      cell: (r) => <td className="num">{r.clicks.toLocaleString()}</td>,
      draggable: true,
      visible: true
    },
    ctr: {
      header: <MetricTooltip metric="ctr"><SortHeader id="ctr" label="CTR" sort={sort} setSort={setSort} className="num" /></MetricTooltip>,
      cell: (r) => <td className="num">{fmtPct(r.ctr)}</td>,
      draggable: true,
      visible: true
    },
    cost: {
      header: <MetricTooltip metric="cost"><SortHeader id="cost" label="Cost" sort={sort} setSort={setSort} className="num" /></MetricTooltip>,
      cell: (r) => <td className="num">{fmtMoney(r.cost)}</td>,
      draggable: true,
      visible: true
    },
    avg_cpc: {
      header: <MetricTooltip metric="avg_cpc"><SortHeader id="avg_cpc" label="Avg CPC" sort={sort} setSort={setSort} className="num" /></MetricTooltip>,
      cell: (r) => <td className="num">{fmtMoney(r.avg_cpc)}</td>,
      draggable: true,
      visible: true
    },
    conversions: {
      header: <MetricTooltip metric="conversions"><SortHeader id="conversions" label="Conversions" sort={sort} setSort={setSort} className="num" /></MetricTooltip>,
      cell: (r) => <td className="num">{r.conversions.toFixed(1)}</td>,
      draggable: true,
      visible: true
    },
    click_to_conversion_rate: {
      header: <MetricTooltip metric="click_to_conversion_rate"><SortHeader id="click_to_conversion_rate" label="Click → Conv. Rate" sort={sort} setSort={setSort} className="num" /></MetricTooltip>,
      cell: (r) => <td className="num">{fmtPct(r.click_to_conversion_rate)}</td>,
      draggable: true,
      visible: true
    },
    lead_count: {
      header: <MetricTooltip metric="lead_count"><SortHeader id="lead_count" label="Leads" sort={sort} setSort={setSort} className="num" /></MetricTooltip>,
      cell: (r) => <td className="num">{r.lead_count}</td>,
      draggable: true,
      visible: true
    },
    cost_per_lead: {
      header: <MetricTooltip metric="cost_per_lead"><SortHeader id="cost_per_lead" label="Cost / Lead" sort={sort} setSort={setSort} className="num" /></MetricTooltip>,
      cell: (r) => <td className="num">{r.cost_per_lead !== null ? fmtMoney(r.cost_per_lead) : "—"}</td>,
      draggable: true,
      visible: true
    },
    avg_impression_share: {
      header: <MetricTooltip metric="avg_impression_share"><SortHeader id="avg_impression_share" label="Impr. Share" sort={sort} setSort={setSort} className="num" /></MetricTooltip>,
      cell: (r) => <td className="num">{r.avg_impression_share !== null ? `${r.avg_impression_share.toFixed(1)}%` : "—"}</td>,
      draggable: true,
      visible: true
    },
    avg_quality_score: {
      header: <MetricTooltip metric="avg_quality_score"><SortHeader id="avg_quality_score" label="Quality" sort={sort} setSort={setSort} className="num" /></MetricTooltip>,
      cell: (r) => <td className="num">{r.avg_quality_score !== null ? r.avg_quality_score.toFixed(1) : "—"}</td>,
      draggable: true,
      visible: true
    }
  }), [labelKey, groupBy, sort, setSort, onSelectKeyword]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [perfRows, campaignRows] = await Promise.all([
        getPerformance({ ...range, group_by: groupBy, campaign_id: campaignId }),
        getCampaigns(),
      ]);
      setRows(perfRows);
      setCampaigns(campaignRows);
    } finally {
      setLoading(false);
    }
  }, [range, groupBy, campaignId]);

  useEffect(() => { load(); }, [load]);

  const totals = rows.reduce(
    (acc, r) => ({
      impressions: acc.impressions + r.impressions,
      clicks: acc.clicks + r.clicks,
      cost: acc.cost + r.cost,
      conversions: acc.conversions + r.conversions,
      lead_count: acc.lead_count + r.lead_count,
    }),
    { impressions: 0, clicks: 0, cost: 0, conversions: 0, lead_count: 0 }
  );

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let av = a[sort.key], bv = b[sort.key];
      if (sort.key === labelKey && typeof av === "string") { av = av.toLowerCase(); bv = (bv || "").toLowerCase(); }
      av = av ?? -Infinity; bv = bv ?? -Infinity;
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, sort, labelKey]);

  return (
    <div>
      <div className="filters">
        <div className="pill-group">
          {GROUP_OPTIONS.map((g) => (
            <button key={g.key} className={`btn ${groupBy === g.key ? "active" : ""}`} onClick={() => setGroupBy(g.key)}>
              {g.label}
            </button>
          ))}
        </div>
        <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
          <option value="">All campaigns</option>
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        <span style={{ color: "var(--text-muted)" }}>to</span>
        <input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
      </div>

      <div className="summary-row">
        <div className="stat-card"><div className="label">Impressions</div><div className="value-row"><div className="value">{totals.impressions.toLocaleString()}</div></div></div>
        <div className="stat-card"><div className="label">Clicks</div><div className="value-row"><div className="value">{totals.clicks.toLocaleString()}</div></div></div>
        <div className="stat-card"><div className="label">Cost</div><div className="value-row"><div className="value">{fmtMoney(totals.cost)}</div></div></div>
        <div className="stat-card"><div className="label">Conversions</div><div className="value-row"><div className="value">{totals.conversions.toFixed(1)}</div></div></div>
        <div className="stat-card"><div className="label">Leads (matched)</div><div className="value-row"><div className="value">{totals.lead_count}</div></div></div>
      </div>

      {loading ? (
        <div className="loading">Loading performance data… 📊</div>
      ) : rows.length === 0 ? (
        <div className="empty-state">No performance data for this range yet — run the sync script from Part 3. 📭</div>
      ) : (
        <div className="table-wrap fade-in">
          <table>
            <thead>
              <tr>
                {columnOrder.map((columnId) => {
                  const config = columnConfig[columnId];
                  if (!config || !config.visible) return null;
                  return (
                    <th
                      key={columnId}
                      draggable={config.draggable}
                      onDragStart={() => handleDragStart(columnId)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(columnId)}
                      onDragEnd={handleDragEnd}
                      style={{
                        cursor: config.draggable ? 'grab' : 'default',
                        opacity: draggedColumn === columnId ? 0.5 : 1,
                        backgroundColor: draggedColumn === columnId ? '#f0f0f0' : 'inherit'
                      }}
                    >
                      {config.header}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r, i) => (
                <tr key={i}>
                  {columnOrder.map((columnId) => {
                    const config = columnConfig[columnId];
                    if (!config || !config.visible) return null;
                    return config.cell(r);
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
