import { useEffect, useState, useCallback, useMemo } from "react";
import { getLeads, updateLead, deleteLead, createLead, getCampaigns } from "./api";
import { ArrowUpIcon, ArrowDownIcon } from "./icons";

const STATUS_OPTIONS = ["new", "contacted", "qualified", "won", "lost"];

function formatMatchLabel(status) {
  return { matched: "Matched", no_match: "No match", no_tracking_data: "No tracking data", manual: "Manual" }[status] || status;
}

function initials(name, email) {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

const SORTERS = {
  name: (l) => (l.name || l.email || "").toLowerCase(),
  keyword: (l) => (l.keyword_text || l.raw_keyword_text || "").toLowerCase(),
  campaign: (l) => (l.campaign_name || "").toLowerCase(),
  status: (l) => l.status,
  created_at: (l) => new Date(l.created_at).getTime(),
};

function SortHeader({ id, label, sort, setSort, className }) {
  const active = sort.key === id;
  return (
    <th
      className={`sortable ${className || ""} ${active ? "active" : ""}`}
      onClick={() => setSort((s) => (s.key === id ? { key: id, dir: s.dir === "asc" ? "desc" : "asc" } : { key: id, dir: "asc" }))}
    >
      {label}
      <span className="arrow">
        {active ? (sort.dir === "asc" ? <ArrowUpIcon width={10} height={10} strokeWidth={3} /> : <ArrowDownIcon width={10} height={10} strokeWidth={3} />) : "↕"}
      </span>
    </th>
  );
}

export default function LeadsView({ keywordFilter, onClearKeywordFilter }) {
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "", campaign_id: "", search: "" });
  const [sort, setSort] = useState({ key: "created_at", dir: "desc" });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [newLead, setNewLead] = useState({});
  const [editingLead, setEditingLead] = useState({});

  // combine manual filters with a keyword drill-down passed in from another tab
  const effectiveFilters = useMemo(
    () => (keywordFilter?.id ? { ...filters, keyword_id: keywordFilter.id } : filters),
    [filters, keywordFilter?.id]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [leadRows, campaignRows] = await Promise.all([getLeads(effectiveFilters), getCampaigns()]);
      // Convert revenue to number for all leads
      const leadsWithNumbers = leadRows.map(lead => {
        let revenueNum = null;
        if (lead.revenue !== null && lead.revenue !== undefined && lead.revenue !== '') {
          const parsed = Number(lead.revenue);
          if (!isNaN(parsed)) {
            revenueNum = parsed;
          }
        }
        return {
          ...lead,
          revenue: revenueNum
        };
      });
      setLeads(leadsWithNumbers);
      setCampaigns(campaignRows);
    } finally {
      setLoading(false);
    }
  }, [effectiveFilters]);

  useEffect(() => { load(); }, [load]);

  const sortedLeads = useMemo(() => {
    const getter = SORTERS[sort.key] || SORTERS.created_at;
    const copy = [...leads];
    copy.sort((a, b) => {
      const av = getter(a), bv = getter(b);
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [leads, sort]);

  function setLocalField(id, field, value) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  }

  async function commitField(id, field, value) {
    if (field === "status") {
      if (!confirm(`Are you sure you want to change status to "${value}"?`)) {
        load(); // Revert if cancelled
        return;
      }
    }
    if (field === "revenue") {
      // Convert empty string to null, otherwise convert to number
      const numValue = Number(value);
      if (value === "" || isNaN(numValue)) {
        value = null;
      } else {
        value = numValue;
      }
      if (!confirm(`Are you sure you want to set revenue to "${value}"?`)) {
        load(); // Revert if cancelled
        return;
      }
    }
    try {
      const updated = await updateLead(id, { [field]: value });
      // Convert revenue to number if present in response
      if (updated.revenue !== undefined && updated.revenue !== null && updated.revenue !== '') {
        updated.revenue = Number(updated.revenue);
      } else {
        updated.revenue = null;
      }
      // Update local state with the returned data instead of reloading
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...updated } : l)));
    } catch (error) {
      alert("Failed to update lead: " + error.message);
      load(); // Revert on error
    }
  }

  async function handleDelete(id) {
    setLeadToDelete(id);
    setShowDeleteConfirm(true);
  }

  async function confirmDelete() {
    if (!leadToDelete) return;
    try {
      await deleteLead(leadToDelete);
      setShowDeleteConfirm(false);
      setLeadToDelete(null);
      load();
    } catch (error) {
      alert("Failed to delete lead: " + error.message);
    }
  }

  function openEditModal(lead) {
    setEditingLead({
      id: lead.id,
      first_name: lead.first_name || "",
      last_name: lead.last_name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      status: lead.status || "new",
      revenue: lead.revenue || "",
      notes: lead.notes || "",
      campaign_id: lead.campaign_id || "",
      raw_keyword_text: lead.raw_keyword_text || "",
      gclid: lead.gclid || "",
      created_at: lead.created_at ? lead.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setShowEditModal(true);
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!editingLead.id) return;
    try {
      const updateData = {
        status: editingLead.status,
        revenue: editingLead.revenue,
        notes: editingLead.notes,
        campaign_id: editingLead.campaign_id || null,
        raw_keyword_text: editingLead.raw_keyword_text || null,
        gclid: editingLead.gclid || null,
        created_at: editingLead.created_at
      };
      await updateLead(editingLead.id, updateData);
      setShowEditModal(false);
      setEditingLead({});
      load();
    } catch (error) {
      alert("Failed to update lead: " + error.message);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newLead.email && !newLead.phone) {
      alert("Email or phone is required");
      return;
    }
    try {
      const createData = {
        ...newLead,
        campaign_id: newLead.campaign_id || null,
        raw_keyword_text: newLead.raw_keyword_text || null,
        gclid: newLead.gclid || null
      };
      await createLead(createData);
      setShowCreateModal(false);
      setNewLead({});
      load();
    } catch (error) {
      alert("Failed to create lead: " + error.message);
    }
  }

  return (
    <div>
      <div className="filters">
        <input
          placeholder="Search name or email"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
        <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.campaign_id} onChange={(e) => setFilters((f) => ({ ...f, campaign_id: e.target.value }))}>
          <option value="">All campaigns</option>
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="spacer" />
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>+ Add Lead</button>
        {keywordFilter?.id && (
          <span className="badge matched" style={{ cursor: "pointer" }} onClick={onClearKeywordFilter} title="Click to clear">
            Keyword: {keywordFilter.text} ✕
          </span>
        )}
        {!loading && <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{sortedLeads.length} lead{sortedLeads.length === 1 ? "" : "s"}</span>}
      </div>

      {loading ? (
        <div className="loading">Loading leads…</div>
      ) : leads.length === 0 ? (
        <div className="empty-state">No leads match these filters yet.</div>
      ) : (
        <div className="table-wrap fade-in">
          <table>
            <thead>
              <tr>
                <SortHeader id="name" label="Lead" sort={sort} setSort={setSort} />
                <SortHeader id="keyword" label="Keyword" sort={sort} setSort={setSort} />
                <SortHeader id="campaign" label="Campaign" sort={sort} setSort={setSort} />
                <th>Attribution</th>
                <SortHeader id="status" label="Status" sort={sort} setSort={setSort} />
                <th>Notes</th>
                <th>Revenue</th>
                <th>Actions</th>
                <SortHeader id="created_at" label="Received" sort={sort} setSort={setSort} />
                <th>Click ID</th>
              </tr>
            </thead>
            <tbody>
              {sortedLeads.map((lead) => (
                <tr key={lead.id} className={lead.match_status}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="avatar">{initials(lead.name, lead.email)}</div>
                      <div>
                        <div>{lead.name || "—"}</div>
                        <div style={{ color: "var(--text-muted)", fontSize: 12 }}>{lead.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{lead.keyword_text || lead.raw_keyword_text || "—"}</td>
                  <td>{lead.campaign_name || "—"}</td>
                  <td><span className={`badge ${lead.match_status}`}>{formatMatchLabel(lead.match_status)}</span></td>
                  <td>
                    <select
                      className="inline-edit"
                      value={lead.status}
                      onChange={(e) => {
                        setLocalField(lead.id, "status", e.target.value);
                        commitField(lead.id, "status", e.target.value);
                      }}
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <input
                      className="inline-edit"
                      value={lead.notes ?? ""}
                      placeholder="Add a note…"
                      onChange={(e) => setLocalField(lead.id, "notes", e.target.value)}
                      onBlur={(e) => commitField(lead.id, "notes", e.target.value)}
                    />
                  </td>
                  <td className="num" style={{ minWidth: 100 }}>
                    <input
                      className="inline-edit value"
                      type="number"
                      step="0.01"
                      value={lead.revenue === null || lead.revenue === undefined ? "" : lead.revenue}
                      placeholder="0"
                      onChange={(e) => setLocalField(lead.id, "revenue", e.target.value)}
                      onBlur={(e) => commitField(lead.id, "revenue", e.target.value)}
                      style={{ width: "100%", minWidth: 80 }}
                    />
                  </td>
                  <td>
                    <button 
                      className="btn btn-sm" 
                      onClick={() => openEditModal(lead)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-danger btn-sm" 
                      style={{ marginLeft: 6 }}
                      onClick={() => handleDelete(lead.id)}
                    >
                      Delete
                    </button>
                  </td>
                  <td>{new Date(lead.created_at).toLocaleDateString()}</td>
                  <td style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)", maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis" }} title={lead.gclid || ""}>{lead.gclid || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Lead</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={newLead.first_name || ""}
                  onChange={(e) => setNewLead({ ...newLead, first_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={newLead.last_name || ""}
                  onChange={(e) => setNewLead({ ...newLead, last_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  required
                  value={newLead.email || ""}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={newLead.phone || ""}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Campaign</label>
                <select
                  value={newLead.campaign_id || ""}
                  onChange={(e) => setNewLead({ ...newLead, campaign_id: e.target.value })}
                >
                  <option value="">Select campaign...</option>
                  {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Keyword</label>
                <input
                  type="text"
                  value={newLead.raw_keyword_text || ""}
                  onChange={(e) => setNewLead({ ...newLead, raw_keyword_text: e.target.value })}
                  placeholder="Search keyword"
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={newLead.status || "new"}
                  onChange={(e) => setNewLead({ ...newLead, status: e.target.value })}
                >
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Revenue</label>
                <input
                  type="number"
                  step="0.01"
                  value={newLead.revenue || ""}
                  onChange={(e) => setNewLead({ ...newLead, revenue: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input
                  type="text"
                  value={newLead.notes || ""}
                  onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Click ID (GCLID)</label>
                <input
                  type="text"
                  value={newLead.gclid || ""}
                  onChange={(e) => setNewLead({ ...newLead, gclid: e.target.value })}
                  placeholder="Google Click Identifier"
                />
              </div>
              <div className="form-group">
                <label>Created Date</label>
                <input
                  type="date"
                  value={newLead.created_at || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setNewLead({ ...newLead, created_at: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Lead</h2>
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={editingLead.first_name || ""}
                  onChange={(e) => setEditingLead({ ...editingLead, first_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={editingLead.last_name || ""}
                  onChange={(e) => setEditingLead({ ...editingLead, last_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={editingLead.email || ""}
                  onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={editingLead.phone || ""}
                  onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Campaign</label>
                <select
                  value={editingLead.campaign_id || ""}
                  onChange={(e) => setEditingLead({ ...editingLead, campaign_id: e.target.value })}
                >
                  <option value="">Select campaign...</option>
                  {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Keyword</label>
                <input
                  type="text"
                  value={editingLead.raw_keyword_text || ""}
                  onChange={(e) => setEditingLead({ ...editingLead, raw_keyword_text: e.target.value })}
                  placeholder="Search keyword"
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={editingLead.status || "new"}
                  onChange={(e) => setEditingLead({ ...editingLead, status: e.target.value })}
                >
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Revenue</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingLead.revenue || ""}
                  onChange={(e) => setEditingLead({ ...editingLead, revenue: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input
                  type="text"
                  value={editingLead.notes || ""}
                  onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Click ID (GCLID)</label>
                <input
                  type="text"
                  value={editingLead.gclid || ""}
                  onChange={(e) => setEditingLead({ ...editingLead, gclid: e.target.value })}
                  placeholder="Google Click Identifier"
                />
              </div>
              <div className="form-group">
                <label>Created Date</label>
                <input
                  type="date"
                  value={editingLead.created_at || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setEditingLead({ ...editingLead, created_at: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h2>Confirm Delete</h2>
            <p>Are you sure you want to delete this lead? This action cannot be undone.</p>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
