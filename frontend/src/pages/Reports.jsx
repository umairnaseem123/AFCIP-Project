import { useState, useMemo } from "react";
import PageLayout from "../components/layout/PageLayout";
import { exportToCSV } from "../utils/exportCSV";
import { useOperationalData } from "../hooks/useOperationalData";

const typeColors = {
  Summary:         { bg: "#1e3a5f", color: "#93c5fd" },
  Activity:        { bg: "#3b1f5e", color: "#c4b5fd" },
  "Risk Analysis": { bg: "#450a0a", color: "#f87171" },
  Analysis:        { bg: "#431407", color: "#fb923c" },
  Audit:           { bg: "#052e16", color: "#4ade80" },
};

const REPORT_TYPES  = ["Summary", "Activity", "Risk Analysis", "Analysis", "Audit"];
const FILTER_TYPES  = ["All", ...REPORT_TYPES];

// ── helpers ───────────────────────────────────────────────────────────────────
function todayStr() {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

function buildReportData(type, transactions, fraudAlerts) {
  switch (type) {
    case "Summary":
      return fraudAlerts.map(a => ({
        id: a.id, account: a.account, type: a.type,
        probability: a.probability, status: a.status, date: a.date,
      }));
    case "Activity":
      return transactions.slice(0, 50).map(tx => ({
        id: tx.id, account: tx.account, amount: tx.amount,
        type: tx.type, status: tx.status, date: tx.date,
      }));
    case "Risk Analysis":
      return transactions.filter(tx => tx.risk === "High").map(tx => ({
        id: tx.id, account: tx.account, amount: tx.amount,
        risk: tx.risk, riskScore: tx.riskScore,
        fraudProbability: tx.fraudProbability, status: tx.status, date: tx.date,
      }));
    case "Analysis":
      return transactions.map(tx => ({
        id: tx.id, account: tx.account, amount: tx.amount,
        type: tx.type, location: tx.location, device: tx.deviceType,
        risk: tx.risk, date: tx.date,
      }));
    case "Audit":
      return transactions.map(tx => ({
        id: tx.id, account: tx.account, amount: tx.amount,
        type: tx.type, status: tx.status, risk: tx.risk,
        riskScore: tx.riskScore, date: tx.date, description: tx.description,
      }));
    default:
      return transactions;
  }
}

function summarizeData(type, data, fraudAlerts, transactions) {
  switch (type) {
    case "Summary":      return { "Total Alerts": data.length, "Open": data.filter(r => r.status === "Open").length, "Resolved": data.filter(r => r.status === "Resolved").length };
    case "Activity":     return { "Transactions": data.length, "Flagged": data.filter(r => r.status === "Flagged").length, "Clear": data.filter(r => r.status === "Clear").length };
    case "Risk Analysis":return { "High Risk Txns": data.length, "Avg Fraud %": data.length ? Math.round(data.reduce((s,r) => s + (r.fraudProbability || 0), 0) / data.length) + "%" : "N/A" };
    case "Analysis":     return { "Total": data.length, "Unique Accounts": new Set(data.map(r => r.account)).size, "Locations": new Set(data.map(r => r.location).filter(Boolean)).size };
    case "Audit":        return { "Records": data.length, "Flagged": data.filter(r => r.status === "Flagged").length, "Under Review": data.filter(r => r.status === "Under Review").length };
    default:             return {};
  }
}

// ── Generate Report Modal ─────────────────────────────────────────────────────
function GenerateModal({ onClose, onGenerate, transactions, fraudAlerts, source }) {
  const [name, setName]   = useState("");
  const [type, setType]   = useState("Summary");
  const [error, setError] = useState("");

  const previewData    = buildReportData(type, transactions, fraudAlerts);
  const previewSummary = summarizeData(type, previewData, fraudAlerts, transactions);

  const handleSubmit = () => {
    if (!name.trim()) { setError("Report name is required."); return; }
    const data = buildReportData(type, transactions, fraudAlerts);
    const newReport = {
      id:            `RPT${String(Date.now()).slice(-4)}`,
      name:          name.trim(),
      type,
      generatedDate: todayStr(),
      author:        "Current User",
      cases:         data.length,
      fileSize:      `${(JSON.stringify(data).length / 1024).toFixed(1)} KB`,
      status:        "Ready",
      data,
      summary:       summarizeData(type, data, fraudAlerts, transactions),
      source,
    };
    onGenerate(newReport);
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:"20px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"16px", padding:"32px", width:"100%", maxWidth:"480px", position:"relative" }}>
        <button onClick={onClose} style={{ position:"absolute", top:"16px", right:"16px", background:"#334155", border:"none", borderRadius:"6px", color:"#94a3b8", fontSize:"18px", cursor:"pointer", width:"32px", height:"32px" }}>×</button>

        <h2 style={{ color:"white", fontSize:"18px", fontWeight:"700", marginBottom:"6px" }}>+ Generate Report</h2>
        <p style={{ color:"#64748b", fontSize:"13px", marginBottom:"24px" }}>
          Data source: <span style={{ color: source === "live" ? "#4ade80" : "#fb923c", fontWeight:"600" }}>{source === "live" ? "🟢 Live API" : "🟡 Demo Data"}</span>
        </p>

        {/* Name */}
        <div style={{ marginBottom:"18px" }}>
          <label style={{ color:"#94a3b8", fontSize:"12px", display:"block", marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.05em" }}>Report Name *</label>
          <input
            value={name}
            onChange={e => { setName(e.target.value); setError(""); }}
            placeholder="e.g. June Risk Summary"
            style={{ width:"100%", background:"#0f172a", border:`1px solid ${error ? "#f87171" : "#334155"}`, borderRadius:"8px", padding:"10px 14px", color:"white", fontSize:"14px", outline:"none", boxSizing:"border-box" }}
          />
          {error && <p style={{ color:"#f87171", fontSize:"12px", marginTop:"4px" }}>{error}</p>}
        </div>

        {/* Type */}
        <div style={{ marginBottom:"20px" }}>
          <label style={{ color:"#94a3b8", fontSize:"12px", display:"block", marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.05em" }}>Report Type</label>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
            {REPORT_TYPES.map(t => (
              <button key={t} onClick={() => setType(t)} style={{
                padding:"6px 14px", borderRadius:"6px", fontSize:"13px", cursor:"pointer",
                background: type === t ? typeColors[t].bg : "#0f172a",
                border:     type === t ? `1px solid ${typeColors[t].color}` : "1px solid #334155",
                color:      type === t ? typeColors[t].color : "#94a3b8",
              }}>{t}</button>
            ))}
          </div>
        </div>

        {/* Live preview counts */}
        <div style={{ background:"#0f172a", borderRadius:"10px", padding:"14px", marginBottom:"24px", border:"1px solid #1e293b" }}>
          <p style={{ color:"#475569", fontSize:"12px", marginBottom:"10px", textTransform:"uppercase", letterSpacing:"0.05em" }}>Data Preview</p>
          {Object.entries(previewSummary).map(([k, v]) => (
            <div key={k} style={{ display:"flex", justifyContent:"space-between", color:"#94a3b8", fontSize:"13px", marginBottom:"6px" }}>
              <span>{k}</span><span style={{ color:"white", fontWeight:"600" }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop:"10px", paddingTop:"10px", borderTop:"1px solid #1e293b", color:"#475569", fontSize:"12px" }}>
            {previewData.length} records will be included
          </div>
        </div>

        <div style={{ display:"flex", gap:"10px" }}>
          <button onClick={onClose} style={{ flex:1, background:"#334155", border:"none", borderRadius:"8px", padding:"12px", color:"white", fontSize:"14px", cursor:"pointer" }}>Cancel</button>
          <button onClick={handleSubmit} style={{ flex:2, background:"#2563eb", border:"none", borderRadius:"8px", padding:"12px", color:"white", fontSize:"14px", cursor:"pointer", fontWeight:"700" }}>⚡ Generate</button>
        </div>
      </div>
    </div>
  );
}

// ── View Report Modal ─────────────────────────────────────────────────────────
function ViewReportModal({ report, onClose, onPrint }) {
  if (!report) return null;
  const tc = typeColors[report.type] || { bg:"#1e293b", color:"#94a3b8" };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:"20px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"16px", padding:"32px", width:"100%", maxWidth:"640px", maxHeight:"82vh", overflowY:"auto", position:"relative" }}>
        <button onClick={onClose} style={{ position:"absolute", top:"16px", right:"16px", background:"#334155", border:"none", borderRadius:"6px", color:"#94a3b8", fontSize:"18px", cursor:"pointer", width:"32px", height:"32px" }}>×</button>

        <div style={{ marginBottom:"20px" }}>
          <span style={{ background:tc.bg, color:tc.color, padding:"3px 12px", borderRadius:"20px", fontSize:"12px", fontWeight:"600" }}>{report.type}</span>
          <h2 style={{ color:"white", fontSize:"20px", fontWeight:"700", marginTop:"12px", marginBottom:"4px" }}>{report.name}</h2>
          <p style={{ color:"#64748b", fontSize:"13px" }}>{report.id} · {report.generatedDate} · {report.author}</p>
        </div>

        {/* Summary */}
        {report.summary && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(120px, 1fr))", gap:"12px", marginBottom:"20px" }}>
            {Object.entries(report.summary).map(([k, v]) => (
              <div key={k} style={{ background:"#0f172a", borderRadius:"8px", padding:"12px", textAlign:"center" }}>
                <div style={{ color:"#64748b", fontSize:"11px", marginBottom:"4px" }}>{k}</div>
                <div style={{ color:tc.color, fontWeight:"700", fontSize:"20px" }}>{v}</div>
              </div>
            ))}
          </div>
        )}

        {/* Data table preview */}
        {report.data && report.data.length > 0 && (
          <div style={{ overflowX:"auto", marginBottom:"16px" }}>
            <p style={{ color:"#475569", fontSize:"12px", marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.05em" }}>
              Preview — first 10 of {report.data.length} records
            </p>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
              <thead>
                <tr style={{ background:"#0f172a" }}>
                  {Object.keys(report.data[0]).map(h => (
                    <th key={h} style={{ color:"#94a3b8", padding:"8px 10px", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.data.slice(0, 10).map((row, i) => (
                  <tr key={i} style={{ borderBottom:"1px solid #1e293b" }}>
                    {Object.values(row).map((val, j) => (
                      <td key={j} style={{ color:"#cbd5e1", padding:"8px 10px", whiteSpace:"nowrap" }}>{String(val ?? "—")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display:"flex", gap:"10px", marginTop:"8px" }}>
          <button onClick={() => onPrint(report)} style={{ flex:1, background:"#334155", border:"none", borderRadius:"8px", padding:"10px", color:"white", fontSize:"14px", cursor:"pointer", fontWeight:"600" }}>🖨️ Print</button>
          <button onClick={onClose} style={{ flex:1, background:"#2563eb", border:"none", borderRadius:"8px", padding:"10px", color:"white", fontSize:"14px", cursor:"pointer", fontWeight:"600" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Print Preview Modal ───────────────────────────────────────────────────────
function PrintModal({ report, onClose }) {
  if (!report) return null;

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=960,height=720");
    const rows    = (report.data || []).slice(0, 50);
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    const tc      = typeColors[report.type] || { color: "#2563eb" };

    const summaryHtml = report.summary
      ? Object.entries(report.summary).map(([k, v]) =>
          `<div class="sum-box"><div class="sum-label">${k}</div><div class="sum-val">${v}</div></div>`
        ).join("")
      : "";

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${report.name}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; color: #1e293b; padding: 40px; }
    .header { border-bottom: 3px solid #1d4ed8; padding-bottom: 16px; margin-bottom: 24px; }
    .badge { background: #dbeafe; color: #1d4ed8; padding: 3px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; display: inline-block; margin-bottom: 10px; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 6px; }
    .meta { color: #64748b; font-size: 13px; }
    .summary { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .sum-box { background: #f1f5f9; border-radius: 8px; padding: 14px 20px; min-width: 120px; }
    .sum-label { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .sum-val { color: #1e3a8a; font-size: 22px; font-weight: 700; }
    .section-title { color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
    thead tr { background: #1e3a8a; color: white; }
    th { padding: 8px 10px; text-align: left; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
    .footer { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 14px; color: #94a3b8; font-size: 11px; display: flex; justify-content: space-between; }
    @media print { body { padding: 20px; } button { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="badge">${report.type}</div>
    <h1>${report.name}</h1>
    <p class="meta">${report.id} &nbsp;·&nbsp; Generated: ${report.generatedDate} &nbsp;·&nbsp; Author: ${report.author} &nbsp;·&nbsp; ${report.cases} records &nbsp;·&nbsp; ${report.fileSize}</p>
  </div>
  ${summaryHtml ? `<div class="summary">${summaryHtml}</div>` : ""}
  ${headers.length > 0 ? `
  <p class="section-title">Showing first 50 of ${report.data.length} records</p>
  <table>
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(row => `<tr>${Object.values(row).map(v => `<td>${String(v ?? "—")}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>` : ""}
  <div class="footer">
    <span>AFCIP Intelligence Platform — Confidential</span>
    <span>Printed: ${new Date().toLocaleString()}</span>
  </div>
  <script>window.onload = () => window.print();<\/script>
</body>
</html>`);
    win.document.close();
  };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:"20px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"16px", padding:"32px", width:"100%", maxWidth:"440px", textAlign:"center", position:"relative" }}>
        <button onClick={onClose} style={{ position:"absolute", top:"16px", right:"16px", background:"#334155", border:"none", borderRadius:"6px", color:"#94a3b8", fontSize:"18px", cursor:"pointer", width:"32px", height:"32px" }}>×</button>

        <div style={{ fontSize:"48px", marginBottom:"16px" }}>🖨️</div>
        <h2 style={{ color:"white", fontSize:"18px", fontWeight:"700", marginBottom:"8px" }}>Print Report</h2>
        <p style={{ color:"#94a3b8", fontSize:"14px", marginBottom:"6px" }}>{report.name}</p>
        <p style={{ color:"#64748b", fontSize:"13px", marginBottom:"24px" }}>
          {report.cases} records · {report.fileSize} · {report.generatedDate}
        </p>

        <div style={{ background:"#0f172a", borderRadius:"10px", padding:"14px", marginBottom:"24px", border:"1px solid #1e293b", textAlign:"left" }}>
          <p style={{ color:"#475569", fontSize:"12px", marginBottom:"10px", textTransform:"uppercase" }}>Print includes</p>
          {["Report header & metadata", "Summary statistics", "First 50 data records", "AFCIP confidential footer"].map(item => (
            <div key={item} style={{ color:"#94a3b8", fontSize:"13px", marginBottom:"6px" }}>✓ {item}</div>
          ))}
        </div>

        <div style={{ display:"flex", gap:"10px" }}>
          <button onClick={onClose} style={{ flex:1, background:"#334155", border:"none", borderRadius:"8px", padding:"12px", color:"white", fontSize:"14px", cursor:"pointer" }}>Cancel</button>
          <button onClick={handlePrint} style={{ flex:2, background:"#2563eb", border:"none", borderRadius:"8px", padding:"12px", color:"white", fontSize:"14px", cursor:"pointer", fontWeight:"700" }}>🖨️ Open Print Dialog</button>
        </div>
      </div>
    </div>
  );
}

// ── Share Modal ───────────────────────────────────────────────────────────────
function ShareModal({ report, onClose }) {
  const [copied,   setCopied]   = useState(false);
  const [notified, setNotified] = useState(false);
  if (!report) return null;
  const shareLink = `https://afcip.internal/reports/${report.id}`;

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:"20px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"16px", padding:"32px", width:"100%", maxWidth:"460px", position:"relative" }}>
        <button onClick={onClose} style={{ position:"absolute", top:"16px", right:"16px", background:"#334155", border:"none", borderRadius:"6px", color:"#94a3b8", fontSize:"18px", cursor:"pointer", width:"32px", height:"32px" }}>×</button>

        <h2 style={{ color:"white", fontSize:"18px", fontWeight:"700", marginBottom:"6px" }}>📤 Share Report</h2>
        <p style={{ color:"#64748b", fontSize:"13px", marginBottom:"24px" }}>{report.name}</p>

        <div style={{ marginBottom:"18px" }}>
          <label style={{ color:"#94a3b8", fontSize:"12px", display:"block", marginBottom:"8px", textTransform:"uppercase" }}>Shareable Link</label>
          <div style={{ display:"flex", gap:"8px" }}>
            <div style={{ flex:1, background:"#0f172a", border:"1px solid #334155", borderRadius:"8px", padding:"10px 14px", color:"#38bdf8", fontSize:"13px", fontFamily:"monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {shareLink}
            </div>
            <button onClick={() => { navigator.clipboard.writeText(shareLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              style={{ background: copied ? "#16a34a" : "#2563eb", border:"none", borderRadius:"8px", padding:"10px 16px", color:"white", fontSize:"13px", cursor:"pointer", fontWeight:"600", minWidth:"80px" }}>
              {copied ? "✅ Copied!" : "📋 Copy"}
            </button>
          </div>
        </div>

        <div style={{ marginBottom:"20px" }}>
          <label style={{ color:"#94a3b8", fontSize:"12px", display:"block", marginBottom:"8px", textTransform:"uppercase" }}>Notify Team Member</label>
          <div style={{ display:"flex", gap:"8px" }}>
            <input type="email" placeholder="colleague@afcip.gov"
              style={{ flex:1, background:"#0f172a", border:"1px solid #334155", borderRadius:"8px", padding:"10px 14px", color:"white", fontSize:"13px", outline:"none" }} />
            <button onClick={() => { setNotified(true); setTimeout(() => setNotified(false), 2000); }}
              style={{ background: notified ? "#16a34a" : "#334155", border:"none", borderRadius:"8px", padding:"10px 16px", color:"white", fontSize:"13px", cursor:"pointer", fontWeight:"600", minWidth:"80px" }}>
              {notified ? "✅ Sent!" : "📨 Send"}
            </button>
          </div>
        </div>

        <div style={{ background:"#0f172a", borderRadius:"8px", padding:"12px", border:"1px solid #1e3a5f", display:"flex", gap:"10px" }}>
          <span>🔒</span>
          <p style={{ color:"#64748b", fontSize:"12px", margin:0, lineHeight:"1.5" }}>Only AFCIP users can view shared reports. Link expires in 7 days.</p>
        </div>
      </div>
    </div>
  );
}

// ── Archive Confirm ───────────────────────────────────────────────────────────
function ArchiveModal({ report, onClose, onConfirm }) {
  if (!report) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:"20px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"16px", padding:"32px", width:"100%", maxWidth:"400px", textAlign:"center" }}>
        <div style={{ fontSize:"48px", marginBottom:"16px" }}>📦</div>
        <h2 style={{ color:"white", fontSize:"18px", fontWeight:"700", marginBottom:"8px" }}>Archive Report?</h2>
        <p style={{ color:"#94a3b8", fontSize:"14px", marginBottom:"8px" }}>{report.name}</p>
        <p style={{ color:"#64748b", fontSize:"13px", marginBottom:"28px", lineHeight:"1.5" }}>
          This report will be moved to the archive. It can be restored at any time.
        </p>
        <div style={{ display:"flex", gap:"12px" }}>
          <button onClick={onClose} style={{ flex:1, background:"#334155", border:"none", borderRadius:"8px", padding:"12px", color:"white", fontSize:"14px", cursor:"pointer", fontWeight:"600" }}>Cancel</button>
          <button onClick={() => { onConfirm(report.id); onClose(); }}
            style={{ flex:1, background:"#c4b5fd", border:"none", borderRadius:"8px", padding:"12px", color:"#1e1b4b", fontSize:"14px", cursor:"pointer", fontWeight:"700" }}>📦 Archive</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
function Reports() {
  const { transactions, fraudAlerts, stats, source, loading } = useOperationalData();

  const [generatedReports, setGeneratedReports] = useState([]);
  const [archivedIds,      setArchivedIds]      = useState([]);
  const [selectedReport,   setSelectedReport]   = useState(null);
  const [filterType,       setFilterType]       = useState("All");
  const [downloaded,       setDownloaded]       = useState(null);
  const [archiveToast,     setArchiveToast]     = useState(false);

  const [showGenerate, setShowGenerate] = useState(false);
  const [viewModal,    setViewModal]    = useState(null);
  const [printModal,   setPrintModal]   = useState(null);
  const [shareModal,   setShareModal]   = useState(null);
  const [archiveModal, setArchiveModal] = useState(null);

  const staticReports = useMemo(() => [
    { id:"RPT001", name:"Monthly Fraud Summary",        type:"Summary",       generatedDate:"2026-06-16", author:"System Admin", cases:fraudAlerts.length,                                  fileSize:"2.4 MB", status:"Ready", data:fraudAlerts,                              summary:{ "Total Alerts": fraudAlerts.length, "Open": fraudAlerts.filter(a=>a.status==="Open").length, "Resolved": fraudAlerts.filter(a=>a.status==="Resolved").length } },
    { id:"RPT002", name:"Case Activity Report",         type:"Activity",      generatedDate:"2026-06-15", author:"John Doe",     cases:transactions.length,                                 fileSize:"1.8 MB", status:"Ready", data:transactions,                             summary:{ "Transactions": transactions.length, "Flagged": transactions.filter(t=>t.status==="Flagged").length, "Clear": transactions.filter(t=>t.status==="Clear").length } },
    { id:"RPT003", name:"Risk Assessment Q2 2026",      type:"Risk Analysis", generatedDate:"2026-06-14", author:"Sarah Smith",  cases:transactions.filter(t=>t.risk==="High").length,      fileSize:"5.2 MB", status:"Ready", data:transactions.filter(t=>t.risk==="High"),  summary:{ "High Risk": transactions.filter(t=>t.risk==="High").length, "Medium Risk": transactions.filter(t=>t.risk==="Medium").length } },
    { id:"RPT004", name:"Transaction Pattern Analysis", type:"Analysis",      generatedDate:"2026-06-13", author:"Mike Johnson", cases:transactions.length,                                 fileSize:"3.1 MB", status:"Ready", data:transactions,                             summary:{ "Total": transactions.length, "Unique Accounts": new Set(transactions.map(t=>t.account)).size } },
    { id:"RPT005", name:"Daily Alert Summary",          type:"Summary",       generatedDate:"2026-06-16", author:"System Admin", cases:fraudAlerts.length,                                  fileSize:"0.9 MB", status:"Ready", data:fraudAlerts,                              summary:{ "Alerts Today": fraudAlerts.length, "Open": fraudAlerts.filter(a=>a.status==="Open").length } },
    { id:"RPT006", name:"Compliance Audit Report",      type:"Audit",         generatedDate:"2026-06-10", author:"Lisa Brown",   cases:transactions.length,                                 fileSize:"7.5 MB", status:"Ready", data:transactions,                             summary:{ "Records": transactions.length, "Flagged": transactions.filter(t=>t.status==="Flagged").length, "Under Review": transactions.filter(t=>t.status==="Under Review").length } },
  ], [transactions, fraudAlerts]);

  const allReports     = useMemo(() => [...staticReports, ...generatedReports], [staticReports, generatedReports]);
  const activeReports  = useMemo(() => allReports.filter(r => !archivedIds.includes(r.id)), [allReports, archivedIds]);
  const filtered       = filterType === "All" ? activeReports : activeReports.filter(r => r.type === filterType);

  const handleDownload = (report) => {
    const data = report.data || transactions;
    if (data && data.length > 0) {
      exportToCSV(data, `${report.id}_${report.type.replace(/\s/g,"_").toLowerCase()}.csv`);
      setDownloaded(report.id);
      setTimeout(() => setDownloaded(null), 2000);
    }
  };

  const handleArchiveConfirm = (id) => {
    setArchivedIds(prev => [...prev, id]);
    if (selectedReport?.id === id) setSelectedReport(null);
    setArchiveToast(true);
    setTimeout(() => setArchiveToast(false), 3000);
  };

  const handlePrint = (report) => {
    setViewModal(null);
    setTimeout(() => setPrintModal(report), 100);
  };

  return (
    <PageLayout title="Reports & Analytics">

      {/* Modals */}
      {showGenerate && (
        <GenerateModal
          onClose={() => setShowGenerate(false)}
          onGenerate={r => { setGeneratedReports(prev => [r, ...prev]); setSelectedReport(r); }}
          transactions={transactions}
          fraudAlerts={fraudAlerts}
          source={source}
        />
      )}
      {viewModal    && <ViewReportModal report={viewModal}    onClose={() => setViewModal(null)}    onPrint={handlePrint} />}
      {printModal   && <PrintModal      report={printModal}   onClose={() => setPrintModal(null)} />}
      {shareModal   && <ShareModal      report={shareModal}   onClose={() => setShareModal(null)} />}
      {archiveModal && <ArchiveModal    report={archiveModal} onClose={() => setArchiveModal(null)} onConfirm={handleArchiveConfirm} />}

      {/* Archive toast */}
      {archiveToast && (
        <div style={{ position:"fixed", bottom:"32px", left:"50%", transform:"translateX(-50%)", background:"#3b1f5e", border:"1px solid #c4b5fd", borderRadius:"10px", padding:"12px 24px", color:"#c4b5fd", fontSize:"14px", fontWeight:"600", zIndex:999, boxShadow:"0 4px 20px rgba(0,0,0,0.5)" }}>
          📦 Report archived successfully
        </div>
      )}

      {/* Stats */}
      <div style={{ display:"flex", gap:"20px", marginBottom:"32px" }}>
        {[
          { label:"Total Reports",   value: allReports.length,                                      color:"#38bdf8", icon:"📄" },
          { label:"Generated Today", value: generatedReports.length,                                color:"#4ade80", icon:"⚡" },
          { label:"Data Source",     value: source === "live" ? "Live" : "Demo",                    color: source === "live" ? "#4ade80" : "#fb923c", icon: source === "live" ? "🟢" : "🟡" },
          { label:"Archived",        value: archivedIds.length,                                     color:"#c4b5fd", icon:"📦" },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{ flex:1, background:"#1e293b", border:"1px solid #334155", borderRadius:"12px", padding:"24px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
              <span style={{ color:"#94a3b8", fontSize:"14px" }}>{label}</span>
              <span style={{ fontSize:"22px" }}>{icon}</span>
            </div>
            <div style={{ color, fontSize:"32px", fontWeight:"700" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filters + Actions */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px", flexWrap:"wrap", gap:"10px" }}>
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
          {FILTER_TYPES.map(type => (
            <button key={type} onClick={() => setFilterType(type)}
              style={{ padding:"6px 16px", borderRadius:"6px", fontSize:"13px", cursor:"pointer", background: filterType === type ? "#2563eb" : "#1e293b", border: filterType === type ? "1px solid #3b82f6" : "1px solid #334155", color: filterType === type ? "white" : "#94a3b8" }}>
              {type}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:"10px" }}>
          <button onClick={() => exportToCSV(transactions, "all_transactions.csv")}
            style={{ background:"#16a34a", border:"none", borderRadius:"8px", padding:"8px 18px", color:"white", fontSize:"14px", cursor:"pointer", fontWeight:"600" }}>
            ⬇️ Export All CSV
          </button>
          <button onClick={() => setShowGenerate(true)}
            style={{ background:"#2563eb", border:"none", borderRadius:"8px", padding:"8px 18px", color:"white", fontSize:"14px", cursor:"pointer", fontWeight:"600" }}>
            + Generate Report
          </button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:"20px" }}>

        {/* Table */}
        <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"12px", overflow:"hidden" }}>
          {loading && (
            <div style={{ padding:"10px 16px", background:"#0f2040", color:"#38bdf8", fontSize:"13px", borderBottom:"1px solid #334155" }}>
              ⏳ Loading live data…
            </div>
          )}
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"14px" }}>
            <thead>
              <tr style={{ borderBottom:"1px solid #334155", background:"#0f172a" }}>
                {["Report Name", "Type", "Date", "Author", "Actions"].map(h => (
                  <th key={h} style={{ color:"#94a3b8", textAlign:"left", padding:"12px 16px", fontWeight:"500" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(report => (
                <tr key={report.id} onClick={() => setSelectedReport(report)}
                  style={{ borderBottom:"1px solid #1e293b", cursor:"pointer", background: selectedReport?.id === report.id ? "#0f2040" : "transparent" }}
                  onMouseEnter={e => { if (selectedReport?.id !== report.id) e.currentTarget.style.background = "#162032"; }}
                  onMouseLeave={e => { if (selectedReport?.id !== report.id) e.currentTarget.style.background = "transparent"; }}>
                  <td style={{ padding:"14px 16px" }}>
                    <div style={{ color:"white", fontWeight:"600" }}>{report.name}</div>
                    <div style={{ color:"#64748b", fontSize:"12px" }}>
                      {report.id}
                      {report.source === "live" && <span style={{ color:"#4ade80", marginLeft:"6px" }}>🟢 live</span>}
                      {report.source === "demo" && <span style={{ color:"#fb923c", marginLeft:"6px" }}>🟡 demo</span>}
                    </div>
                  </td>
                  <td style={{ padding:"14px 16px" }}>
                    <span style={{ background: typeColors[report.type]?.bg, color: typeColors[report.type]?.color, padding:"3px 10px", borderRadius:"20px", fontSize:"12px", fontWeight:"600" }}>{report.type}</span>
                  </td>
                  <td style={{ padding:"14px 16px", color:"#94a3b8" }}>{report.generatedDate}</td>
                  <td style={{ padding:"14px 16px", color:"#94a3b8" }}>{report.author}</td>
                  <td style={{ padding:"14px 16px" }}>
                    <div style={{ display:"flex", gap:"8px" }}>
                      <button onClick={e => { e.stopPropagation(); setViewModal(report); }}  style={{ background:"none", border:"none", cursor:"pointer", fontSize:"16px" }} title="View">👁️</button>
                      <button onClick={e => { e.stopPropagation(); handleDownload(report); }} style={{ background:"none", border:"none", cursor:"pointer", fontSize:"16px" }} title="Download CSV">{downloaded === report.id ? "✅" : "⬇️"}</button>
                      <button onClick={e => { e.stopPropagation(); setPrintModal(report); }}  style={{ background:"none", border:"none", cursor:"pointer", fontSize:"16px" }} title="Print">🖨️</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ padding:"40px", textAlign:"center", color:"#475569" }}>No reports found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Details + Actions Panel */}
        <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
          <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"12px", padding:"24px" }}>
            <h3 style={{ color:"white", fontSize:"15px", marginBottom:"16px" }}>Report Details</h3>
            {!selectedReport ? (
              <p style={{ color:"#94a3b8", fontSize:"14px" }}>Select a report to view details</p>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"14px", fontSize:"14px" }}>
                {[
                  { label:"Report ID",      value: selectedReport.id,     color:"#38bdf8" },
                  { label:"Author",         value: selectedReport.author },
                  { label:"File Size",      value: selectedReport.fileSize },
                  { label:"Cases Included", value: selectedReport.cases },
                  { label:"Status",         value: selectedReport.status, color:"#4ade80" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ borderBottom:"1px solid #334155", paddingBottom:"10px" }}>
                    <div style={{ color:"#94a3b8", fontSize:"12px", marginBottom:"4px" }}>{label}</div>
                    <div style={{ color: color || "white", fontWeight:"600" }}>{value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedReport && (
            <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"12px", padding:"24px" }}>
              <h3 style={{ color:"white", fontSize:"15px", marginBottom:"16px" }}>Actions</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                <button onClick={() => handleDownload(selectedReport)}
                  style={{ background:"#16a34a", border:"none", borderRadius:"8px", padding:"10px", color:"white", fontSize:"14px", cursor:"pointer", fontWeight:"600" }}>
                  {downloaded === selectedReport.id ? "✅ Downloaded!" : "⬇️ Download CSV"}
                </button>
                <button onClick={() => setViewModal(selectedReport)}
                  style={{ background:"#2563eb", border:"none", borderRadius:"8px", padding:"10px", color:"white", fontSize:"14px", cursor:"pointer", fontWeight:"600" }}>
                  👁️ View Report
                </button>
                <button onClick={() => setPrintModal(selectedReport)}
                  style={{ background:"#334155", border:"none", borderRadius:"8px", padding:"10px", color:"white", fontSize:"14px", cursor:"pointer", fontWeight:"600" }}>
                  🖨️ Print Report
                </button>
                <button onClick={() => setShareModal(selectedReport)}
                  style={{ background:"#334155", border:"none", borderRadius:"8px", padding:"10px", color:"white", fontSize:"14px", cursor:"pointer", fontWeight:"600" }}>
                  📤 Share Report
                </button>
                <button onClick={() => setArchiveModal(selectedReport)}
                  style={{ background:"#334155", border:"none", borderRadius:"8px", padding:"10px", color:"#c4b5fd", fontSize:"14px", cursor:"pointer", fontWeight:"600" }}>
                  📦 Archive
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

export default Reports;