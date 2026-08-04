import { useEffect, useState, useCallback, useMemo } from "react";
import { getLeads, updateLead, deleteLead, createLead, getCampaigns } from "./api";
import { ArrowUpIcon, ArrowDownIcon } from "./icons";

function authHeader() {
  const creds = localStorage.getItem("adtracker_creds");
  return creds ? `Basic ${creds}` : null;
}

const STATUS_OPTIONS = ["Contacted", "Appointment Set", "Site Assessment", "Closed Won", "Closed Lost", "Disqualified"];

// Format date in Pacific Time timezone
function formatPacificDate(dateString) {
  if (!dateString) return "—";
  // The database stores in Pacific timezone, so we need to parse it correctly
  const date = new Date(dateString);
  // Get the date components in Pacific timezone
  const options = { timeZone: 'America/Los_Angeles', year: 'numeric', month: 'numeric', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

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

export default function LeadsView({ keywordFilter, onClearKeywordFilter }) {
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Loading leads...");
  const [filters, setFilters] = useState({ status: "", campaign_id: "", search: "", from: "", to: "" });
  const [sort, setSort] = useState({ key: "created_at", dir: "desc" });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [newLead, setNewLead] = useState({});
  const [editingLead, setEditingLead] = useState({});
  const [bulkUploadFile, setBulkUploadFile] = useState(null);
  const [bulkUploadResults, setBulkUploadResults] = useState(null);
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false);
  const [columnOrder, setColumnOrder] = useState(() => {
    const saved = localStorage.getItem('leads_column_order');
    return saved ? JSON.parse(saved) : ['created_at', 'name', 'keyword', 'campaign', 'attribution', 'status', 'revenue', 'actions', 'conversion_date', 'status_updated_at', 'gclid', 'disqualified_reason'];
  });
  const [draggedColumn, setDraggedColumn] = useState(null);

  // Save column order to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('leads_column_order', JSON.stringify(columnOrder));
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

  // Column configuration for rendering
  const columnConfig = {
    created_at: {
      header: <SortHeader id="created_at" label="Received" sort={sort} setSort={setSort} />,
      cell: (lead) => <td>{formatPacificDate(lead.created_at)}</td>,
      draggable: true
    },
    name: {
      header: <SortHeader id="name" label="Lead" sort={sort} setSort={setSort} />,
      cell: (lead) => (
        <td>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="avatar">{initials(lead.name, lead.email)}</div>
            <div>
              <div>{lead.name || "—"}</div>
              <div style={{ color: "var(--text-muted)", fontSize: 12 }}>{lead.email}</div>
            </div>
          </div>
        </td>
      ),
      draggable: true
    },
    keyword: {
      header: <SortHeader id="keyword" label="Keyword" sort={sort} setSort={setSort} />,
      cell: (lead) => <td>{lead.keyword_text || lead.raw_keyword_text || "—"}</td>,
      draggable: true
    },
    campaign: {
      header: <SortHeader id="campaign" label="Campaign" sort={sort} setSort={setSort} />,
      cell: (lead) => <td>{lead.campaign_name || "—"}</td>,
      draggable: true
    },
    attribution: {
      header: <th>Attribution</th>,
      cell: (lead) => <td><span className={`badge ${lead.match_status}`}>{formatMatchLabel(lead.match_status)}</span></td>,
      draggable: true
    },
    status: {
      header: <SortHeader id="status" label="Status" sort={sort} setSort={setSort} />,
      cell: (lead) => <td>{lead.status || "—"}</td>,
      draggable: true
    },
    revenue: {
      header: <th>Revenue</th>,
      cell: (lead) => (
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
      ),
      draggable: true
    },
    actions: {
      header: <th>Actions</th>,
      cell: (lead) => (
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
      ),
      draggable: false
    },
    conversion_date: {
      header: <SortHeader id="conversion_date" label="Conversion Date" sort={sort} setSort={setSort} />,
      cell: (lead) => <td>{formatPacificDate(lead.conversion_date)}</td>,
      draggable: true
    },
    status_updated_at: {
      header: <th>Status Updated</th>,
      cell: (lead) => <td>{formatPacificDate(lead.status_updated_at)}</td>,
      draggable: true
    },
    gclid: {
      header: <th>Click ID</th>,
      cell: (lead) => <td style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{lead.gclid || "—"}</td>,
      draggable: true
    },
    disqualified_reason: {
      header: <th>Disqualified/Closed Lost Reason</th>,
      cell: (lead) => <td>{lead.disqualified_reason || "—"}</td>,
      draggable: true
    }
  };

  // combine manual filters with a keyword drill-down passed in from another tab
  const effectiveFilters = useMemo(
    () => (keywordFilter?.id ? { ...filters, keyword_id: keywordFilter.id } : filters),
    [filters, keywordFilter?.id]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const loadingMessages = [
      "Loading leads... 📋",
      "Fetching your prospects... 🔍",
      "Gathering leads... 🤝",
      "Loading the squad... 👥",
      "Retrieving leads... 📥"
    ];
    setLoadingMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
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
    const toLocalDateString = (dateStr) => {
      if (!dateStr) return "";
      // Convert Pacific timezone date to local timezone for date input
      const date = new Date(dateStr);
      // Use local timezone to format as YYYY-MM-DD for date input
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setEditingLead({
      id: lead.id,
      first_name: lead.first_name || "",
      last_name: lead.last_name || "",
      email: lead.email || "",
      status: lead.status || "Contacted",
      revenue: lead.revenue || "",
      campaign_id: lead.campaign_id || "",
      raw_keyword_text: lead.raw_keyword_text || "",
      gclid: lead.gclid || "",
      disqualified_reason: lead.disqualified_reason || "",
      conversion_date: toLocalDateString(lead.conversion_date) || "",
      status_updated_at: toLocalDateString(lead.status_updated_at) || ""
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
        campaign_id: editingLead.campaign_id || null,
        gclid: editingLead.gclid || null,
        disqualified_reason: editingLead.disqualified_reason || null,
        email: editingLead.email || null,
        first_name: editingLead.first_name || null,
        last_name: editingLead.last_name || null,
        conversion_date: editingLead.conversion_date || null,
        status_updated_at: editingLead.status_updated_at && editingLead.status_updated_at.trim() !== "" 
          ? editingLead.status_updated_at 
          : null
      };
      
      // Handle raw_keyword_text - send empty string to trigger clear, otherwise use value or null
      if (editingLead.raw_keyword_text === '') {
        updateData.raw_keyword_text = '';
      } else {
        updateData.raw_keyword_text = editingLead.raw_keyword_text || null;
      }
      
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
        gclid: newLead.gclid || null,
        disqualified_reason: newLead.disqualified_reason || null,
        conversion_date: newLead.conversion_date || null,
        status_updated_at: newLead.status_updated_at || null
      };
      await createLead(createData);
      setShowCreateModal(false);
      setNewLead({});
      load();
    } catch (error) {
      alert("Failed to create lead: " + error.message);
    }
  }

  async function handleBulkUpload(e) {
    e.preventDefault();
    if (!bulkUploadFile) {
      alert("Please select a file to upload");
      return;
    }

    setBulkUploadLoading(true);
    setBulkUploadResults(null);

    try {
      const formData = new FormData();
      formData.append('file', bulkUploadFile);

      const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:3002").replace(/\/$/, '');
      const headers = {};
      const auth = authHeader();
      if (auth) {
        headers['Authorization'] = auth;
      }

      const response = await fetch(`${API_BASE}/api/leads/bulk-update`, {
        method: 'POST',
        headers,
        body: formData
      });

      const result = await response.json();
      setBulkUploadResults(result);

      if (result.success) {
        load(); // Refresh leads after successful update
      }
    } catch (error) {
      alert("Failed to upload file: " + error.message);
      setBulkUploadResults({ success: false, error: error.message });
    } finally {
      setBulkUploadLoading(false);
    }
  }

  return (
    <div>
      <div className="filters">
        <input
          placeholder="Search name or email"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          style={{ appearance: 'none', WebkitAppearance: 'none', backgroundImage: 'none', paddingRight: '14px' }}
        />
        <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.campaign_id} onChange={(e) => setFilters((f) => ({ ...f, campaign_id: e.target.value }))}>
          <option value="">All campaigns</option>
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input 
          type="date" 
          value={filters.from} 
          onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} 
        />
        <input 
          type="date" 
          value={filters.to} 
          onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} 
        />
        <span className="spacer" />
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>+ Add Lead</button>
        <button className="btn btn-sm" onClick={() => setShowBulkUploadModal(true)}>📤 Bulk Update</button>
        {keywordFilter?.id && (
          <span className="badge matched" style={{ cursor: "pointer" }} onClick={onClearKeywordFilter} title="Click to clear">
            Keyword: {keywordFilter.text} ✕
          </span>
        )}
        <span style={{ fontSize: 12, color: "var(--text-faint)", minWidth: "60px", display: "inline-block", textAlign: "right" }}>
          {loading ? "—" : `${sortedLeads.length} lead${sortedLeads.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {loading ? (
        <div className="loading">{loadingMessage}</div>
      ) : leads.length === 0 ? (
        <div className="empty-state">No leads match these filters yet. 📭</div>
      ) : (
        <div className="table-wrap fade-in">
          <table>
            <thead>
              <tr>
                {columnOrder.map((columnId) => {
                  const config = columnConfig[columnId];
                  if (!config) return null;
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
              {sortedLeads.map((lead) => (
                <tr key={lead.id} className={lead.match_status}>
                  {columnOrder.map((columnId) => {
                    const config = columnConfig[columnId];
                    if (!config) return null;
                    return config.cell(lead);
                  })}
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
                  value={newLead.status || "Contacted"}
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
                <label>Disqualified/Closed Lost Reason</label>
                <input
                  type="text"
                  value={newLead.disqualified_reason || ""}
                  onChange={(e) => setNewLead({ ...newLead, disqualified_reason: e.target.value })}
                  placeholder="Reason for disqualification or closed lost"
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
                  value={newLead.created_at || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })}
                  onChange={(e) => setNewLead({ ...newLead, created_at: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Conversion Date</label>
                <input
                  type="date"
                  value={newLead.conversion_date || ""}
                  onChange={(e) => setNewLead({ ...newLead, conversion_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Status Updated Date</label>
                <input
                  type="date"
                  value={newLead.status_updated_at || ""}
                  onChange={(e) => setNewLead({ ...newLead, status_updated_at: e.target.value || null })}
                  placeholder="Leave blank to auto-set on status change"
                />
                <small style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                  Leave blank to auto-set to current time when status changes
                </small>
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
                <label>Disqualified/Closed Lost Reason</label>
                <input
                  type="text"
                  value={editingLead.disqualified_reason || ""}
                  onChange={(e) => setEditingLead({ ...editingLead, disqualified_reason: e.target.value })}
                  placeholder="Reason for disqualification or closed lost"
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
                <label>Conversion Date</label>
                <input
                  type="date"
                  value={editingLead.conversion_date || ""}
                  onChange={(e) => setEditingLead({ ...editingLead, conversion_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Status Updated Date</label>
                <input
                  type="date"
                  value={editingLead.status_updated_at || ""}
                  onChange={(e) => setEditingLead({ ...editingLead, status_updated_at: e.target.value || null })}
                  placeholder="Leave blank to auto-set on status change"
                />
                <small style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                  Leave blank to auto-set to current time when status changes
                </small>
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

      {showBulkUploadModal && (
        <div className="modal-overlay" onClick={() => setShowBulkUploadModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <h2>Bulk Status Update</h2>
            <p>Upload an Excel file to update lead statuses, conversion dates, and disqualified reasons.</p>
            
            <form onSubmit={handleBulkUpload}>
              <div className="form-group">
                <label>Select File (.xlsx, .xls, .csv)</label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setBulkUploadFile(e.target.files[0])}
                  required
                />
                <small style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                  File should contain columns: Email, Lead Status, Converted, Converted Date, Disqualified Reason
                </small>
              </div>

              {bulkUploadResults && (
                <div style={{ 
                  padding: "12px", 
                  borderRadius: "4px", 
                  backgroundColor: bulkUploadResults.success ? "var(--success-soft)" : "var(--error-soft)",
                  marginBottom: "16px"
                }}>
                  {bulkUploadResults.success ? (
                    <div>
                      <strong>✓ Upload Successful</strong>
                      <div style={{ marginTop: "8px" }}>
                        <div>Updated: {bulkUploadResults.updated} leads</div>
                        <div>Not found: {bulkUploadResults.notFound} leads</div>
                        {bulkUploadResults.errors > 0 && (
                          <div style={{ color: "var(--error)" }}>
                            Errors: {bulkUploadResults.errors}
                          </div>
                        )}
                      </div>
                      {bulkUploadResults.updatedDetails && bulkUploadResults.updatedDetails.length > 0 && (
                        <div style={{ marginTop: "12px" }}>
                          <strong>Changes made:</strong>
                          <div style={{ 
                            maxHeight: "200px", 
                            overflowY: "auto", 
                            marginTop: "8px",
                            fontSize: "12px",
                            backgroundColor: "white",
                            padding: "8px",
                            borderRadius: "4px"
                          }}>
                            {bulkUploadResults.updatedDetails.map((detail, idx) => (
                              <div key={idx} style={{ marginBottom: "8px", paddingBottom: "8px", borderBottom: "1px solid #eee" }}>
                                <div style={{ fontWeight: "bold" }}>{detail.name} ({detail.email})</div>
                                {Object.keys(detail.changes).length > 0 ? (
                                  <div style={{ marginLeft: "12px" }}>
                                    {Object.entries(detail.changes).map(([field, change]) => (
                                      <div key={field}>
                                        {field}: {change.from || '(empty)'} → {change.to || '(empty)'}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{ marginLeft: "12px", color: "var(--text-muted)" }}>No changes</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: "var(--error)" }}>
                      <strong>✗ Upload Failed</strong>
                      <div>{bulkUploadResults.error || "Unknown error"}</div>
                    </div>
                  )}
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => {
                  setShowBulkUploadModal(false);
                  setBulkUploadFile(null);
                  setBulkUploadResults(null);
                }}>Cancel</button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={bulkUploadLoading}
                >
                  {bulkUploadLoading ? "Processing..." : "Upload & Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
