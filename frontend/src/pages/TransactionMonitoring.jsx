import { useEffect, useMemo, useState } from "react";
import PageLayout from "../components/layout/PageLayout";
import { useOperationalData } from "../hooks/useOperationalData";
import { exportToCSV } from "../utils/exportCSV";

function RiskBadge({ risk }) {
  const colors = { High: { bg: "#450a0a", color: "#f87171" }, Medium: { bg: "#431407", color: "#fb923c" }, Low: { bg: "#052e16", color: "#4ade80" } };
  const c = colors[risk] || colors.Low;
  return <span style={{ background: c.bg, color: c.color, padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}>{risk}</span>;
}

function StatusBadge({ status }) {
  const colors = { Flagged: { bg: "#450a0a", color: "#f87171" }, "Under Review": { bg: "#431407", color: "#fb923c" }, Clear: { bg: "#052e16", color: "#4ade80" }, COMPLETED: { bg: "#052e16", color: "#4ade80" }, FLAGGED: { bg: "#450a0a", color: "#f87171" }, PENDING: { bg: "#1e293b", color: "#94a3b8" } };
  const c = colors[status] || colors.Clear;
  return <span style={{ background: c.bg, color: c.color, padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}>{status}</span>;
}

function KYCBadge({ status, isPep }) {
  if (!status) return <span style={{ color: "#64748b", fontSize: "12px" }}>No KYC</span>;
  const colors = {
    verified: { bg: "#052e16", color: "#4ade80" },
    pending:  { bg: "#431407", color: "#fb923c" },
    rejected: { bg: "#450a0a", color: "#f87171" },
  };
  const c = colors[status] || colors.pending;
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
      <span style={{ background: c.bg, color: c.color, padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}>{label}</span>
      {isPep && <span style={{ background: "#450a0a", color: "#f87171", padding: "3px 6px", borderRadius: "20px", fontSize: "11px", fontWeight: "600" }}>PEP⚠️</span>}
    </span>
  );
}

function CreateTransactionModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ transaction_type: "DEBIT", amount: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api"}/transactions/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      const data = await response.json();
      if (response.ok) {
        setResult(data);
        onSuccess();
      } else {
        setError(JSON.stringify(data));
      }
    } catch (err) {
      setError("Failed to connect to backend");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: "#0f172a", border: "1px solid #334155", borderRadius: "8px",
    color: "white", padding: "10px 14px", fontSize: "14px", outline: "none", width: "100%", boxSizing: "border-box",
  };

  const isFraud = Boolean(result?.fraud_reason) || result?.status === "FAILED";

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "16px", padding: "32px", width: "460px", maxWidth: "90vw" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ color: "white", margin: 0, fontSize: "18px" }}>Create Transaction</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "20px", cursor: "pointer" }}>✕</button>
        </div>

        {!result ? (
          <>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ color: "#94a3b8", fontSize: "13px", display: "block", marginBottom: "6px" }}>Transaction Type</label>
              <select style={inputStyle} value={form.transaction_type} onChange={(e) => setForm({ ...form, transaction_type: e.target.value })}>
                <option value="DEBIT">DEBIT (Withdrawal)</option>
                <option value="CREDIT">CREDIT (Deposit)</option>
              </select>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ color: "#94a3b8", fontSize: "13px", display: "block", marginBottom: "6px" }}>Amount (PKR)</label>
              <input style={inputStyle} type="number" placeholder="e.g. 50000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              <div style={{ color: "#64748b", fontSize: "12px", marginTop: "4px" }}>⚠️ Amount over 500,000 will be flagged as fraud</div>
            </div>
            <div style={{ marginBottom: "24px" }}>
              <label style={{ color: "#94a3b8", fontSize: "13px", display: "block", marginBottom: "6px" }}>Description</label>
              <input style={inputStyle} type="text" placeholder="e.g. Salary payment" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            {error && (
              <div style={{ color: "#f87171", background: "#450a0a", border: "1px solid #7f1d1d", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "13px" }}>{error}</div>
            )}
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={onClose} style={{ flex: 1, background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", padding: "12px", color: "#94a3b8", fontSize: "14px", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSubmit} disabled={loading || !form.amount || !form.description} style={{ flex: 2, background: loading ? "#1e3a5f" : "#2563eb", border: "none", borderRadius: "8px", padding: "12px", color: "white", fontSize: "14px", fontWeight: "600", cursor: loading ? "wait" : "pointer" }}>
                {loading ? "Processing..." : "Submit Transaction"}
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>{isFraud ? "🚨" : "✅"}</div>
            <div style={{ color: isFraud ? "#f87171" : "#4ade80", fontSize: "20px", fontWeight: "700", marginBottom: "8px" }}>
              {isFraud ? "FRAUD DETECTED!" : "Transaction Successful!"}
            </div>
            {result.fraud_reason && (
              <div style={{ color: "#fb923c", background: "#431407", border: "1px solid #9a3412", borderRadius: "8px", padding: "10px", marginBottom: "16px", fontSize: "13px" }}>
                🔍 Fraud Reason: {result.fraud_reason}
              </div>
            )}
            <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>Reference: <span style={{ color: "#38bdf8" }}>{result.reference}</span></div>
            <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "24px" }}>Amount: <span style={{ color: "white" }}>PKR {parseFloat(result.amount).toLocaleString()}</span></div>
            <button onClick={onClose} style={{ background: "#2563eb", border: "none", borderRadius: "8px", padding: "12px 32px", color: "white", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

function TransactionMonitoring() {
  const { transactions, loading, error, source, lastUpdated, refresh } = useOperationalData();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterRisk, setFilterRisk] = useState("All");
  const [selected, setSelected] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, refresh]);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const matchSearch = !search ||
        tx.id?.toLowerCase().includes(search.toLowerCase()) ||
        tx.account?.toLowerCase().includes(search.toLowerCase()) ||
        tx.kyc_name?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "All" || tx.status === filterStatus;
      const matchRisk = filterRisk === "All" || tx.risk === filterRisk;
      return matchSearch && matchStatus && matchRisk;
    });
  }, [transactions, search, filterStatus, filterRisk]);

  const inputStyle = {
    background: "#1e293b", border: "1px solid #334155", borderRadius: "8px",
    color: "white", padding: "10px 14px", fontSize: "13px", outline: "none",
  };

  return (
    <PageLayout title="Transaction Monitoring">
      {showModal && (
        <CreateTransactionModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setTimeout(refresh, 500); }}
        />
      )}

      {/* Stat Cards */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "Total",        value: transactions.length,                                                                      color: "#38bdf8" },
          { label: "Flagged",      value: transactions.filter((t) => t.status === "Flagged" || t.status === "FLAGGED").length,      color: "#f87171" },
          { label: "Under Review", value: transactions.filter((t) => t.status === "Under Review").length,                           color: "#fb923c" },
          { label: "Clear",        value: transactions.filter((t) => t.status === "Clear" || t.status === "COMPLETED").length,      color: "#4ade80" },
        ].map((card) => (
          <div key={card.label} style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "16px 20px" }}>
            <div style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "6px" }}>{card.label}</div>
            <div style={{ color: card.color, fontSize: "26px", fontWeight: "700" }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "14px", flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ ...inputStyle, flex: 1, minWidth: "220px", boxSizing: "border-box" }} placeholder="Search by ID, account or name..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select style={inputStyle} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="All">All Status</option>
          <option value="Clear">Clear</option>
          <option value="Flagged">Flagged</option>
          <option value="Under Review">Under Review</option>
        </select>
        <select style={inputStyle} value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)}>
          <option value="All">All Risk</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
        <button onClick={() => { setSearch(""); setFilterStatus("All"); setFilterRisk("All"); }} style={{ ...inputStyle, cursor: "pointer", color: "#f87171", borderColor: "#f87171" }}>Clear Filters</button>
        <button onClick={() => exportToCSV(filtered, "transactions.csv")} style={{ background: "#16a34a", border: "none", borderRadius: "8px", padding: "10px 16px", color: "white", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>Export CSV</button>
        <button onClick={() => setAutoRefresh((c) => !c)} style={{ background: autoRefresh ? "#1e3a5f" : "#1e293b", border: `1px solid ${autoRefresh ? "#38bdf8" : "#334155"}`, borderRadius: "8px", padding: "10px 14px", color: autoRefresh ? "#38bdf8" : "#94a3b8", fontSize: "13px", cursor: "pointer" }}>{autoRefresh ? "Auto ON" : "Auto OFF"}</button>
        <button onClick={refresh} disabled={loading} style={{ background: "#1e293b", border: "1px solid #38bdf8", borderRadius: "8px", padding: "10px 14px", color: "#38bdf8", fontSize: "13px", cursor: loading ? "wait" : "pointer" }}>{loading ? "Refreshing..." : "Refresh"}</button>
        <button onClick={() => setShowModal(true)} style={{ background: "#2563eb", border: "none", borderRadius: "8px", padding: "10px 18px", color: "white", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>+ New Transaction</button>
      </div>

      <div style={{ color: "#64748b", fontSize: "12px", marginBottom: "12px" }}>
        Source: {source === "live" ? "Backend API" : "Demo fallback"} · Last updated: {lastUpdated.toLocaleTimeString()}
      </div>
      {error && (
        <div style={{ color: "#fbbf24", background: "#422006", border: "1px solid #854d0e", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "13px" }}>
          Backend not reachable yet. Showing demo data until the API responds.
        </div>
      )}

      <div style={{ display: "flex", gap: "20px" }}>
        {/* Table */}
        <div style={{ flex: 2, background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "24px", overflowX: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ color: "white", fontSize: "15px", margin: 0 }}>All Transactions</h3>
            <span style={{ color: "#94a3b8", fontSize: "13px" }}>{filtered.length} records</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155" }}>
                {["ID", "Account", "KYC", "Amount", "Type", "Status", "Risk", "Date"].map((h) => (
                  <th key={h} style={{ color: "#94a3b8", textAlign: "left", padding: "10px 12px", fontWeight: "500" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ color: "#94a3b8", textAlign: "center", padding: "32px" }}>No transactions found</td></tr>
              ) : (
                filtered.map((tx) => (
                  <tr key={tx.id} onClick={() => setSelected(tx)} style={{ borderBottom: "1px solid #0f172a", cursor: "pointer", background: selected?.id === tx.id ? "#0f172a" : "transparent" }}>
                    <td style={{ padding: "12px", color: "#38bdf8", fontWeight: "600" }}>{tx.id}</td>
                    <td style={{ padding: "12px", color: "white" }}>{tx.account}</td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontSize: "12px", color: "#94a3b8" }}>{tx.kyc_name || "—"}</div>
                      <KYCBadge status={tx.kyc_status} isPep={tx.kyc_is_pep} />
                    </td>
                    <td style={{ padding: "12px", color: "white" }}>PKR {tx.amount?.toLocaleString()}</td>
                    <td style={{ padding: "12px", color: "#94a3b8" }}>{tx.type}</td>
                    <td style={{ padding: "12px" }}><StatusBadge status={tx.status} /></td>
                    <td style={{ padding: "12px" }}><RiskBadge risk={tx.risk} /></td>
                    <td style={{ padding: "12px", color: "#94a3b8" }}>{tx.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Detail Panel */}
        <div style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "24px", alignSelf: "flex-start" }}>
          <h3 style={{ color: "white", fontSize: "15px", marginBottom: "20px" }}>Transaction Details</h3>
          {!selected ? (
            <p style={{ color: "#94a3b8", fontSize: "14px" }}>Click a transaction to view details</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {[
                { label: "Transaction ID", value: selected.id,                             color: "#38bdf8" },
                { label: "Account",        value: selected.account },
                { label: "KYC Name",       value: selected.kyc_name || "Not Registered",   color: selected.kyc_name ? "#4ade80" : "#f87171" },
                { label: "Amount",         value: `PKR ${selected.amount?.toLocaleString()}` },
                { label: "Type",           value: selected.type },
                { label: "Date",           value: selected.date },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ borderBottom: "1px solid #334155", paddingBottom: "12px" }}>
                  <div style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "4px" }}>{label}</div>
                  <div style={{ color: color || "white", fontSize: "15px", fontWeight: "500" }}>{value}</div>
                </div>
              ))}
              <div style={{ borderBottom: "1px solid #334155", paddingBottom: "12px" }}>
                <div style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "6px" }}>KYC Status</div>
                <KYCBadge status={selected.kyc_status} isPep={selected.kyc_is_pep} />
              </div>
              <div style={{ borderBottom: "1px solid #334155", paddingBottom: "12px" }}>
                <div style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "6px" }}>Status</div>
                <StatusBadge status={selected.status} />
              </div>
              <div>
                <div style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "6px" }}>Risk Level</div>
                <RiskBadge risk={selected.risk} />
              </div>
              <button onClick={() => exportToCSV([selected], `${selected.id}.csv`)} style={{ background: "#16a34a", border: "none", borderRadius: "8px", padding: "10px", color: "white", fontSize: "13px", fontWeight: "600", cursor: "pointer", marginTop: "8px" }}>
                Export This Transaction
              </button>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

export default TransactionMonitoring;
