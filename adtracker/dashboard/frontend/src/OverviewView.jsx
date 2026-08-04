import { useEffect, useState, useCallback } from "react";
import { getOverview, getPerformance, getCampaigns } from "./api";
import TrendChart from "./TrendChart";
import StatCard from "./StatCard";
import InsightsPanel from "./InsightsPanel";
import RecentActivity from "./RecentActivity";

function fmtMoney(n) { return n === null || n === undefined ? "—" : `£${Math.round(Number(n)).toLocaleString()}`; }
function fmtPercent(n) { return n === null || n === undefined ? "—" : `${n.toFixed(1)}%`; }
function fmtChange(current, previous) {
  if (previous === 0 || previous === null || previous === undefined) return "—";
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? "▲" : "▼";
  return `${sign} ${Math.abs(change).toFixed(0)}%`;
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

const SEVERITY_LABEL = { high: "High", medium: "Medium", low: "Low" };

const METRIC_OPTIONS = [
  { key: "revenue", label: "Revenue", color: "var(--success)" },
  { key: "cost", label: "Spend", color: "#ec4899" },
  { key: "leads", label: "Leads", color: "#2563eb" },
  { key: "impressions", label: "Impressions", color: "#eab308" },
  { key: "clicks", label: "Clicks", color: "#06b6d4" },
];

export default function OverviewView({ onSelectKeyword }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState({ from: todayMinus(7), to: todayMinus(0) });
  const [chartMetrics, setChartMetrics] = useState(["revenue", "leads"]);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [datePreset, setDatePreset] = useState("7");

  const handleDatePresetChange = (days) => {
    setDatePreset(days);
    setRange({ from: todayMinus(parseInt(days)), to: todayMinus(0) });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...range };
      if (selectedCampaign) {
        params.campaign_id = selectedCampaign;
      }
      const overview = await getOverview(params);
      setData(overview);
    } catch (error) {
      console.error('Failed to load overview:', error);
    } finally {
      setLoading(false);
    }
  }, [range, selectedCampaign]);

  useEffect(() => {
    async function loadCampaigns() {
      try {
        const campaignsData = await getCampaigns();
        setCampaigns(campaignsData);
      } catch (error) {
        console.error('Failed to load campaigns:', error);
      }
    }
    loadCampaigns();
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!data && loading) return <div className="loading">Loading overview… 🚀</div>;
  if (!data) return <div className="loading">Failed to load overview 😢</div>;

  const { current, previous, trend, alerts, rejection_insight, period } = data;

  function toggleMetric(key) {
    setChartMetrics((prev) => {
      if (prev.includes(key)) return prev.length > 1 ? prev.filter((k) => k !== key) : prev;
      return [...prev, key];
    });
  }

  // Find best day for revenue
  const bestDay = trend.length > 0 ? trend.reduce((best, day) =>
    (day.revenue || 0) > (best.revenue || 0) ? day : best, trend[0]) : null;
  const bestDayName = bestDay ? new Date(bestDay.date).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/Los_Angeles' }) : '—';

  return (
    <div>
      <div className="filters" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select 
            value={datePreset} 
            onChange={(e) => handleDatePresetChange(e.target.value)}
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <input 
            type="date" 
            value={range.from} 
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} 
          />
          <input 
            type="date" 
            value={range.to} 
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} 
          />
        </div>
        <select 
          value={selectedCampaign} 
          onChange={(e) => setSelectedCampaign(e.target.value)}
          style={{ marginLeft: 'auto' }}
        >
          <option value="">All campaigns</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </select>
      </div>

      {loading && <div className="loading">Loading overview…</div>}

      {!loading && (
        <>
          <div className="summary-row fade-in">
            <StatCard
              label="Revenue"
              value={fmtMoney(current.revenue)}
              subtitle={fmtChange(current.revenue, previous.revenue)}
              trendColor={current.revenue >= previous.revenue ? "var(--success)" : "var(--danger)"}
            />
            <StatCard
              label="Profit"
              value={fmtMoney(current.profit)}
              subtitle={fmtChange(current.profit, previous.profit)}
              trendColor={current.profit >= previous.profit ? "var(--success)" : "var(--danger)"}
            />
            <StatCard
              label="ROI"
              value={fmtPercent(current.roi)}
              subtitle={fmtChange(current.roi, previous.roi)}
              trendColor={current.roi >= previous.roi ? "var(--success)" : "var(--danger)"}
            />
            <StatCard
              label="Leads"
              value={current.total_leads}
              subtitle={fmtChange(current.total_leads, previous.total_leads)}
              trendColor={current.total_leads >= previous.total_leads ? "var(--success)" : "var(--danger)"}
            />
            <StatCard
              label="Spend"
              value={fmtMoney(current.cost)}
              subtitle={fmtChange(current.cost, previous.cost)}
              trendColor={current.cost <= previous.cost ? "var(--success)" : "var(--danger)"}
            />
          </div>

          <div className="summary-row fade-in">
            <StatCard
              label="Impressions"
              value={current.impressions.toLocaleString()}
              subtitle={fmtChange(current.impressions, previous.impressions)}
              extra=""
              trendColor={current.impressions >= previous.impressions ? "var(--success)" : "var(--danger)"}
            />
            <StatCard
              label="Clicks"
              value={current.clicks.toLocaleString()}
              subtitle={fmtChange(current.clicks, previous.clicks)}
              extra=""
              trendColor={current.clicks >= previous.clicks ? "var(--success)" : "var(--danger)"}
            />
            <StatCard
              label="CTR"
              value={fmtPercent(current.ctr)}
              subtitle={fmtChange(current.ctr, previous.ctr)}
              extra=""
              trendColor={current.ctr >= previous.ctr ? "var(--success)" : "var(--danger)"}
            />
            <StatCard
              label="Avg CPC"
              value={fmtMoney(current.avg_cpc)}
              subtitle={fmtChange(current.avg_cpc, previous.avg_cpc)}
              extra=""
              trendColor={current.avg_cpc <= previous.avg_cpc ? "var(--success)" : "var(--danger)"}
            />
            <StatCard
              label="Cost / Conversion"
              value={fmtMoney(current.cost_per_conversion)}
              subtitle={fmtChange(current.cost_per_conversion, previous.cost_per_conversion)}
              extra=""
              trendColor={current.cost_per_conversion <= previous.cost_per_conversion ? "var(--success)" : "var(--danger)"}
            />
          </div>

          <div className="section-heading fade-in">
            <h3>Insights</h3>
            <span className="sub">generated from this period's data</span>
          </div>
          <div className="fade-in">
            <InsightsPanel
              current={current}
              previous={previous}
              alerts={alerts}
              rejectionInsight={rejection_insight}
            />
          </div>

          {trend.length > 0 && (
            <>
              <div className="section-heading fade-in">
                <h3>Performance trend</h3>
                <div className="pill-group">
                  {METRIC_OPTIONS.map((m) => (
                    <button
                      key={m.key}
                      className={`btn ${chartMetrics.includes(m.key) ? "active" : ""}`}
                      onClick={() => toggleMetric(m.key)}
                      style={chartMetrics.includes(m.key) ? { color: m.color } : undefined}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="table-wrap fade-in" style={{ padding: 16, marginBottom: 24 }}>
                <TrendChart
                  data={trend}
                  series={METRIC_OPTIONS.filter((m) => chartMetrics.includes(m.key))}
                />
              </div>
            </>
          )}

          {alerts.length > 0 && (
            <>
              <div className="section-heading fade-in"><h3>Needs attention</h3></div>
              <div className="table-wrap fade-in" style={{ marginBottom: 24 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Keyword</th>
                      <th>Campaign</th>
                      <th>Issue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((a, i) => (
                      <tr key={i}>
                        <td><span className={`badge ${a.severity === "high" ? "lost" : "new"}`}>{SEVERITY_LABEL[a.severity]}</span></td>
                        <td
                          style={{ cursor: onSelectKeyword ? "pointer" : "default", textDecoration: onSelectKeyword ? "underline" : "none" }}
                          onClick={() => onSelectKeyword?.(a.keyword_id, a.keyword_text)}
                        >
                          {a.keyword_text}
                        </td>
                        <td>{a.campaign_name}</td>
                        <td>{a.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="section-heading fade-in"><h3>Recent activity</h3></div>
          <div className="fade-in">
            <RecentActivity onSelectKeyword={onSelectKeyword} />
          </div>

          {rejection_insight.breakdown.length > 0 && (
            <>
              <div className="section-heading fade-in"><h3>Lead quality: why leads get rejected</h3></div>
              <div className="summary-row fade-in">
                {rejection_insight.breakdown.map((r) => (
                  <div className="stat-card" key={r.reason}>
                    <div className="label">{r.reason}</div>
                    <div className="value-row"><div className="value">{r.count}</div></div>
                  </div>
                ))}
              </div>

              {rejection_insight.by_keyword.length > 0 && (
                <div className="table-wrap fade-in" style={{ marginBottom: 24 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Keyword</th>
                        <th>Campaign</th>
                        <th className="num">Sold</th>
                        <th className="num">Rejected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rejection_insight.by_keyword.map((r, i) => (
                        <tr key={i}>
                          <td>{r.keyword_text}</td>
                          <td>{r.campaign_name}</td>
                          <td className="num">{r.sold_count}</td>
                          <td className="num">{r.rejected_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
