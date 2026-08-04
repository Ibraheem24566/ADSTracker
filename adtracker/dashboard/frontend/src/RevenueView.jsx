import { useEffect, useState, useCallback, useRef } from "react";
import { getLeads, getPerformance, getCampaigns } from "./api";

function StatusTooltip({ leads, position, onMouseEnter, onMouseLeave }) {
  if (!leads || leads.length === 0) return null;

  const displayLeads = leads.slice(0, 5);
  const remainingCount = leads.length - 5;

  // Format date in Pacific Time
  function formatPacificDate(dateString) {
    if (!dateString) return "—";
    const date = new Date(dateString);
    const options = { timeZone: 'America/Los_Angeles', year: 'numeric', month: 'numeric', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }

  return (
    <div
      className="status-tooltip"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'fixed',
        top: position.top - 8,
        left: position.left,
        transform: 'translateY(-100%)',
        zIndex: 1000,
        minWidth: '280px',
        maxWidth: '350px'
      }}
    >
      <div style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        padding: '12px',
        fontSize: '13px'
      }}>
        {displayLeads.map((lead, index) => (
          <div key={index} style={{
            padding: '8px 0',
            borderBottom: index < displayLeads.length - 1 ? '1px solid var(--border)' : 'none'
          }}>
            <div style={{ fontWeight: 500, color: 'var(--text)', marginBottom: '2px' }}>{lead.name || 'Unknown'}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>{lead.email || 'No email'}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Received: {formatPacificDate(lead.created_at)}</div>
          </div>
        ))}
        {remainingCount > 0 && (
          <div style={{
            paddingTop: '8px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            fontStyle: 'italic'
          }}>
            and {remainingCount} more lead{remainingCount > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RevenueView({ onSelectStatus }) {
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState(null);
  const [range, setRange] = useState({ from: todayMinus(7), to: todayMinus(0) });
  const [hoveredStatus, setHoveredStatus] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0, height: 0 });
  const hoverTimeoutRef = useRef(null);

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [leads, performance] = await Promise.all([
        getLeads({ 
          from: range.from, 
          to: range.to 
        }),
        getPerformance({ 
          from: range.from, 
          to: range.to,
          group_by: 'campaign'
        })
      ]);

      // Calculate revenue metrics
      const totalRevenue = leads.reduce((sum, lead) => sum + (Number(lead.revenue) || 0), 0);
      const totalCost = performance.reduce((sum, row) => sum + (row.cost || 0), 0);
      const totalLeads = leads.length;
      const wonLeads = leads.filter(l => l.status === 'Closed Won').length;
      const totalConversions = performance.reduce((sum, row) => sum + (row.conversions || 0), 0);

      // Calculate status counts
      const statusCounts = {
        Contacted: leads.filter(l => l.status === 'Contacted').length,
        "Appointment Set": leads.filter(l => l.status === 'Appointment Set').length,
        "Site Assessment": leads.filter(l => l.status === 'Site Assessment').length,
        "Closed Won": leads.filter(l => l.status === 'Closed Won').length,
        "Closed Lost": leads.filter(l => l.status === 'Closed Lost').length,
        Disqualified: leads.filter(l => l.status === 'Disqualified').length
      };

      setRevenueData({
        totalRevenue,
        totalCost,
        totalLeads,
        wonLeads,
        totalConversions,
        statusCounts,
        leads,
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
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const handleStatusHover = (status, event) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (!revenueData?.leads) return;
    const statusLeads = revenueData.leads
      .filter(l => l.status === status)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setHoveredStatus(statusLeads);
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      top: rect.top,
      left: rect.left,
      height: rect.height
    });
  };

  const handleStatusLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredStatus(null);
    }, 200);
  };

  const handleTooltipEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleTooltipLeave = () => {
    setHoveredStatus(null);
  };

  return (
    <div style={{ position: 'relative' }}>
      {hoveredStatus && <StatusTooltip leads={hoveredStatus} position={tooltipPosition} onMouseEnter={handleTooltipEnter} onMouseLeave={handleTooltipLeave} />}
      <div className="filters">
        <input
          type="date"
          value={range.from}
          onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
        />
        <span style={{ color: "var(--text-muted)" }}>to</span>
        <input
          type="date"
          value={range.to}
          onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
        />
      </div>

      {loading ? (
        <div className="loading">Loading revenue data…</div>
      ) : !revenueData ? (
        <div className="empty-state">No revenue data available</div>
      ) : (
        <>
          <div className="summary-row fade-in">
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

          <div className="summary-row fade-in">
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

          <div className="summary-row fade-in">
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

          <div className="section-heading fade-in">
            <h3>Status Breakdown</h3>
          </div>
          <div className="summary-row fade-in">
            <div
              className="stat-card"
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => handleStatusHover('Contacted', e)}
              onMouseLeave={handleStatusLeave}
              onClick={() => onSelectStatus && onSelectStatus('Contacted')}
            >
              <div className="label">Contacted</div>
              <div className="value-row">
                <div className="value">{revenueData.statusCounts.Contacted}</div>
                <div className="change" style={{ color: "var(--text-muted)" }}>
                  {revenueData.totalLeads > 0 ? ((revenueData.statusCounts.Contacted / revenueData.totalLeads) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
            <div
              className="stat-card"
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => handleStatusHover('Appointment Set', e)}
              onMouseLeave={handleStatusLeave}
              onClick={() => onSelectStatus && onSelectStatus('Appointment Set')}
            >
              <div className="label">Appointment Set</div>
              <div className="value-row">
                <div className="value">{revenueData.statusCounts["Appointment Set"]}</div>
                <div className="change" style={{ color: "var(--text-muted)" }}>
                  {revenueData.totalLeads > 0 ? ((revenueData.statusCounts["Appointment Set"] / revenueData.totalLeads) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
            <div
              className="stat-card"
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => handleStatusHover('Site Assessment', e)}
              onMouseLeave={handleStatusLeave}
              onClick={() => onSelectStatus && onSelectStatus('Site Assessment')}
            >
              <div className="label">Site Assessment</div>
              <div className="value-row">
                <div className="value">{revenueData.statusCounts["Site Assessment"]}</div>
                <div className="change" style={{ color: "var(--text-muted)" }}>
                  {revenueData.totalLeads > 0 ? ((revenueData.statusCounts["Site Assessment"] / revenueData.totalLeads) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
            <div
              className="stat-card"
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => handleStatusHover('Disqualified', e)}
              onMouseLeave={handleStatusLeave}
              onClick={() => onSelectStatus && onSelectStatus('Disqualified')}
            >
              <div className="label">Rejected Leads</div>
              <div className="value-row">
                <div className="value" style={{ color: "var(--danger)" }}>{revenueData.statusCounts.Disqualified}</div>
                <div className="change" style={{ color: "var(--text-muted)" }}>
                  {revenueData.totalLeads > 0 ? ((revenueData.statusCounts.Disqualified / revenueData.totalLeads) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
            <div
              className="stat-card"
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => handleStatusHover('Closed Lost', e)}
              onMouseLeave={handleStatusLeave}
              onClick={() => onSelectStatus && onSelectStatus('Closed Lost')}
            >
              <div className="label">Closed Lost</div>
              <div className="value-row">
                <div className="value" style={{ color: "var(--danger)" }}>{revenueData.statusCounts["Closed Lost"]}</div>
                <div className="change" style={{ color: "var(--text-muted)" }}>
                  {revenueData.totalLeads > 0 ? ((revenueData.statusCounts["Closed Lost"] / revenueData.totalLeads) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
          </div>

          <div className="section-heading fade-in">
            <h3>How to Update Revenue</h3>
          </div>
          <div className="fade-in" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
              To update revenue for individual leads, go to the <strong>Leads</strong> tab and edit the Revenue field for each lead. 
              The ROI and conversion metrics will automatically recalculate based on the revenue you enter.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
