import { useEffect, useState, useCallback } from "react";
import { getLeads, getPerformance, getCampaigns } from "./api";

export default function RevenueView() {
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState(null);
  const [period, setPeriod] = useState(7); // days

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - period);

      const [leads, performance] = await Promise.all([
        getLeads({ 
          from: fromDate.toISOString().split('T')[0], 
          to: toDate.toISOString().split('T')[0] 
        }),
        getPerformance({ 
          from: fromDate.toISOString().split('T')[0], 
          to: toDate.toISOString().split('T')[0],
          group_by: 'campaign'
        })
      ]);

      // Calculate revenue metrics
      const totalRevenue = leads.reduce((sum, lead) => sum + (Number(lead.revenue) || 0), 0);
      const totalCost = performance.reduce((sum, row) => sum + (row.cost || 0), 0);
      const totalLeads = leads.length;
      const wonLeads = leads.filter(l => l.status === 'won').length;
      const totalConversions = performance.reduce((sum, row) => sum + (row.conversions || 0), 0);

      setRevenueData({
        totalRevenue,
        totalCost,
        totalLeads,
        wonLeads,
        totalConversions,
        roi: totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0,
        conversionRate: totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0,
        costPerLead: totalLeads > 0 ? totalCost / totalLeads : 0,
        revenuePerLead: totalLeads > 0 ? totalRevenue / totalLeads : 0,
        profit: totalRevenue - totalCost
      });
    } catch (error) {
      console.error("Failed to load revenue data:", error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="loading">Loading revenue data…</div>;
  }

  if (!revenueData) {
    return <div className="empty-state">No revenue data available</div>;
  }

  return (
    <div>
      <div className="filters">
        <select value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="summary-row">
        <div className="stat-card">
          <div className="label">Total Revenue</div>
          <div className="value-row">
            <div className="value">${revenueData.totalRevenue.toLocaleString()}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Total Cost</div>
          <div className="value-row">
            <div className="value">${revenueData.totalCost.toLocaleString()}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Profit</div>
          <div className="value-row">
            <div className="value" style={{ color: revenueData.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              ${revenueData.profit.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="label">ROI</div>
          <div className="value-row">
            <div className="value" style={{ color: revenueData.roi >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {revenueData.roi.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      <div className="summary-row">
        <div className="stat-card">
          <div className="label">Total Leads</div>
          <div className="value-row">
            <div className="value">{revenueData.totalLeads}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Won Leads</div>
          <div className="value-row">
            <div className="value">{revenueData.wonLeads}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Conversion Rate</div>
          <div className="value-row">
            <div className="value">{revenueData.conversionRate.toFixed(1)}%</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Cost Per Lead</div>
          <div className="value-row">
            <div className="value">${revenueData.costPerLead.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="summary-row">
        <div className="stat-card">
          <div className="label">Revenue Per Lead</div>
          <div className="value-row">
            <div className="value">${revenueData.revenuePerLead.toFixed(2)}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Google Conversions</div>
          <div className="value-row">
            <div className="value">{revenueData.totalConversions}</div>
          </div>
        </div>
      </div>

      <div className="section-heading">
        <h3>How to Update Revenue</h3>
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
          To update revenue for individual leads, go to the <strong>Leads</strong> tab and edit the Revenue field for each lead. 
          The ROI and conversion metrics will automatically recalculate based on the revenue you enter.
        </p>
      </div>
    </div>
  );
}
