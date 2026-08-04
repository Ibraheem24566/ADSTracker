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
          <h3>Common Metrics</h3>
          <ul>
            <li><strong>CTR:</strong> Click-Through Rate - how often people click your ad</li>
            <li><strong>CPC:</strong> Cost Per Click - average cost per ad click</li>
            <li><strong>Impressions:</strong> Number of times your ad was shown</li>
            <li><strong>Quality Score:</strong> Google's rating of ad quality (1-10)</li>
          </ul>
          <h3>Tips</h3>
          <ul>
            <li>Hover over any metric to see an explanation</li>
            <li>Click on keywords in Dashboard or Detailed Stats to filter leads</li>
            <li>Use date filters to analyze specific time periods</li>
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
