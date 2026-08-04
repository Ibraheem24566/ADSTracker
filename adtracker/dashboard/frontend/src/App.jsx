import { useState, useEffect } from "react";
import LoginScreen from "./LoginScreen";
import OverviewView from "./OverviewView";
import LeadsView from "./LeadsView";
import PerformanceView from "./PerformanceView";
import RevenueView from "./RevenueView";
import ThemeToggle from "./ThemeToggle";
import { hasCredentials, clearCredentials, getCampaigns } from "./api";

function HelpModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Quick Help</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <h3>Tab Overview</h3>
          <ul>
            <li><strong>Dashboard:</strong> High-level metrics and trends</li>
            <li><strong>Leads:</strong> Manage and track individual leads</li>
            <li><strong>Detailed Stats:</strong> Performance by keyword, campaign, or ad group</li>
            <li><strong>Sales:</strong> Revenue and conversion tracking</li>
          </ul>
          <h3>Metric Definitions</h3>
          <ul>
            <li><strong>Revenue:</strong> Total revenue generated from converted leads</li>
            <li><strong>Profit:</strong> Revenue minus ad spend</li>
            <li><strong>ROI:</strong> Return on Investment: (Profit / Cost) × 100</li>
            <li><strong>Leads:</strong> Total number of leads generated</li>
            <li><strong>Spend:</strong> Total amount spent on advertising</li>
            <li><strong>Impressions:</strong> Number of times your ads were shown</li>
            <li><strong>Clicks:</strong> Number of times people clicked your ads</li>
            <li><strong>CTR:</strong> Click-Through Rate: (Clicks / Impressions) × 100</li>
            <li><strong>Avg CPC:</strong> Average Cost Per Click: (Cost / Clicks)</li>
            <li><strong>Cost / Conversion:</strong> Average cost to get one conversion</li>
            <li><strong>Conversions:</strong> Number of Google Ads conversions</li>
            <li><strong>Click → Conv. Rate:</strong> Conversion Rate: (Conversions / Clicks) × 100</li>
            <li><strong>Cost / Lead:</strong> Average cost to get one lead: (Cost / Lead Count)</li>
            <li><strong>Impr. Share:</strong> How often your ad shows vs. total opportunities</li>
            <li><strong>Quality Score:</strong> Google's rating of your ad quality (1-10 scale)</li>
          </ul>
          <h3>Tips</h3>
          <ul>
            <li>Click on keywords in Dashboard or Detailed Stats to filter leads</li>
            <li>Use date filters to analyze specific time periods</li>
            <li>Use the date preset dropdown for quick time range selection</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function getInitialTheme() {
  const saved = localStorage.getItem("adtracker_theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tab, setTab] = useState("overview");
  const [keywordFilter, setKeywordFilter] = useState(null); // { id, text } | null
  const [theme, setTheme] = useState(getInitialTheme);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("adtracker_theme", theme);
  }, [theme]);

  useEffect(() => {
    async function validateCredentials() {
      if (hasCredentials()) {
        try {
          await getCampaigns();
          setAuthed(true);
        } catch {
          clearCredentials();
        }
      }
      setValidating(false);
    }
    validateCredentials();
  }, []);

  if (validating) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--bg)" }}>
      <div className="neu-spinner"></div>
    </div>;
  }

  if (!authed) {
    return <LoginScreen onSuccess={() => setAuthed(true)} />;
  }

  // Clicking a keyword in Overview or Performance jumps to Leads, filtered.
  function handleSelectKeyword(id, text) {
    setKeywordFilter({ id, text });
    setTab("leads");
  }

  return (
    <div className="app">
      <div className="header">
        <div className="header-left">
          <div className="header-mark">AT</div>
          <h1>Ad Tracker</h1>
        </div>
        <div className="header-right">
          <button className="help-button" onClick={() => setShowHelp(true)} title="Help">
            ?
          </button>
          <ThemeToggle theme={theme} onToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} />
          <span className="account" onClick={() => { clearCredentials(); setAuthed(false); }} title="Sign out">
            sign out
          </span>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "overview" ? "active" : ""}`} onClick={() => setTab("overview")}>Dashboard</button>
        <button className={`tab ${tab === "leads" ? "active" : ""}`} onClick={() => setTab("leads")}>Leads</button>
        <button className={`tab ${tab === "performance" ? "active" : ""}`} onClick={() => setTab("performance")}>Detailed Stats</button>
        <button className={`tab ${tab === "revenue" ? "active" : ""}`} onClick={() => setTab("revenue")}>Sales</button>
      </div>

      {tab === "overview" && (
        <OverviewView onSelectKeyword={handleSelectKeyword} />
      )}
      {tab === "leads" && (
        <LeadsView keywordFilter={keywordFilter} onClearKeywordFilter={() => setKeywordFilter(null)} />
      )}
      {tab === "performance" && (
        <PerformanceView onSelectKeyword={handleSelectKeyword} />
      )}
      {tab === "revenue" && (
        <RevenueView />
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
