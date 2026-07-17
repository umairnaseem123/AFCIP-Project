import { useEffect, useState, useCallback } from "react";
import PageLayout from "../components/layout/PageLayout";
import { useTheme } from "../context/ThemeContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

function StatusBadge({ status }) {
  const colors = {
    Submitted: { bg: "#052e16", color: "#4ade80" },
    Filed: { bg: "#052e16", color: "#4ade80" },
    Draft: { bg: "#1e293b", color: "#94a3b8" },
    Pending: { bg: "#431407", color: "#fb923c" },
  };
  const c = colors[status] || colors.Draft;
  return (
    <span style={{ background: c.bg, color: c.color, padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}>
      {status}
    </span>
  );
}

async function authedFetch(path, options = {}) {
  const token = localStorage.getItem("accessToken");
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

function ComplianceCenter() {
  const theme = useTheme();
  const [tab, setTab] = useState("sar");
  const [sarReports, setSarReports] = useState([]);
  const [ctrReports, setCtrReports] = useState([]);
  const [structuring, setStructuring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionId, setActionId] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sar, ctr, struct] = await Promise.all([
        authedFetch("/sar/").catch(() => []),
        authedFetch("/ctr/").catch(() => []),
        authedFetch("/structuring-alerts/").catch(() => []),
      ]);
      setSarReports(Array.isArray(sar) ? sar : sar.results || []);
      setCtrReports(Array.isArray(ctr) ? ctr : ctr.results || []);
      setStructuring(Array.isArray(struct) ? struct : struct.results || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const submitSar = async (id) => {
    setActionId(id);
    try {
      await authedFetch(`/sar/${id}/submit/`, { method: "POST" });
      await fetchAll();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionId(null);
    }
  };

  const fileCtr = async (id) => {
    setActionId(id);
    try {
      await authedFetch(`/ctr/${id}/file/`, { method: "POST" });
      await fetchAll();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionId(null);
    }
  };

  const tabBtn = (key, label) => (
    <button
      onClick={() => setTab(key)}
      style={{
        background: tab === key ? "#1e3a5f" : "transparent",
        border: `1px solid ${tab === key ? "#38bdf8" : theme.border}`,
        borderRadius: "8px",
        padding: "8px 16px",
        color: tab === key ? "#38bdf8" : theme.subtext,
        fontSize: "13px",
        fontWeight: "600",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <PageLayout title="Compliance Center">
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
        {[
          { label: "SAR Reports", value: sarReports.length, color: "#38bdf8" },
          { label: "CTR Reports", value: ctrReports.length, color: "#fb923c" },
          { label: "Structuring Alerts", value: structuring.length, color: "#f87171" },
          { label: "Pending Submission", value: sarReports.filter((s) => s.status !== "Submitted").length, color: "#fbbf24" },
        ].map((card) => (
          <div key={card.label} style={{ flex: "1 1 130px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "12px", padding: "16px 20px" }}>
            <div style={{ color: theme.subtext, fontSize: "13px", marginBottom: "6px" }}>{card.label}</div>
            <div style={{ color: card.color, fontSize: "26px", fontWeight: "700" }}>{card.value}</div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ color: "#fbbf24", background: "#422006", border: "1px solid #854d0e", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "13px" }}>
          Some compliance data could not load: {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
        {tabBtn("sar", "SAR Reports")}
        {tabBtn("ctr", "CTR Reports")}
        {tabBtn("structuring", "Structuring Alerts")}
        <button onClick={fetchAll} disabled={loading} style={{ marginLeft: "auto", background: theme.surface, border: "1px solid #38bdf8", borderRadius: "8px", padding: "8px 16px", color: "#38bdf8", fontSize: "13px", cursor: loading ? "wait" : "pointer" }}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "12px", padding: "24px", overflowX: "auto" }}>
        {tab === "sar" && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                {["Reference", "Account", "Reason", "Status", "Action"].map((h) => (
                  <th key={h} style={{ color: theme.subtext, textAlign: "left", padding: "10px 12px", fontWeight: "500" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sarReports.length === 0 ? (
                <tr><td colSpan={5} style={{ color: theme.subtext, textAlign: "center", padding: "32px" }}>No SAR reports found</td></tr>
              ) : (
                sarReports.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #0f172a" }}>
                    <td style={{ padding: "12px", color: "#38bdf8", fontWeight: "600" }}>{r.reference_number || `SAR-${r.id}`}</td>
                    <td style={{ padding: "12px", color: "white" }}>{r.account || r.user || "—"}</td>
                    <td style={{ padding: "12px", color: theme.subtext }}>{r.reason || "—"}</td>
                    <td style={{ padding: "12px" }}><StatusBadge status={r.status || "Draft"} /></td>
                    <td style={{ padding: "12px" }}>
                      {r.status !== "Submitted" && (
                        <button onClick={() => submitSar(r.id)} disabled={actionId === r.id} style={{ background: "#2563eb", border: "none", borderRadius: "6px", padding: "6px 12px", color: "white", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                          {actionId === r.id ? "Submitting..." : "Submit"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {tab === "ctr" && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                {["Reference", "Account", "Amount", "Status", "Action"].map((h) => (
                  <th key={h} style={{ color: theme.subtext, textAlign: "left", padding: "10px 12px", fontWeight: "500" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ctrReports.length === 0 ? (
                <tr><td colSpan={5} style={{ color: theme.subtext, textAlign: "center", padding: "32px" }}>No CTR reports found</td></tr>
              ) : (
                ctrReports.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #0f172a" }}>
                    <td style={{ padding: "12px", color: "#38bdf8", fontWeight: "600" }}>{r.reference_number || `CTR-${r.id}`}</td>
                    <td style={{ padding: "12px", color: "white" }}>{r.account || r.user || "—"}</td>
                    <td style={{ padding: "12px", color: "white" }}>PKR {Number(r.amount || 0).toLocaleString()}</td>
                    <td style={{ padding: "12px" }}><StatusBadge status={r.status || "Pending"} /></td>
                    <td style={{ padding: "12px" }}>
                      {r.status !== "Filed" && (
                        <button onClick={() => fileCtr(r.id)} disabled={actionId === r.id} style={{ background: "#2563eb", border: "none", borderRadius: "6px", padding: "6px 12px", color: "white", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                          {actionId === r.id ? "Filing..." : "File CTR"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {tab === "structuring" && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                {["Account", "Pattern", "Transaction Count", "Total Amount", "Detected"].map((h) => (
                  <th key={h} style={{ color: theme.subtext, textAlign: "left", padding: "10px 12px", fontWeight: "500" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {structuring.length === 0 ? (
                <tr><td colSpan={5} style={{ color: theme.subtext, textAlign: "center", padding: "32px" }}>No structuring alerts found</td></tr>
              ) : (
                structuring.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid #0f172a" }}>
                    <td style={{ padding: "12px", color: "white" }}>{s.account || s.user || "—"}</td>
                    <td style={{ padding: "12px", color: "#f87171" }}>{s.pattern || "Smurfing"}</td>
                    <td style={{ padding: "12px", color: theme.subtext }}>{s.transaction_count ?? "—"}</td>
                    <td style={{ padding: "12px", color: "white" }}>PKR {Number(s.total_amount || 0).toLocaleString()}</td>
                    <td style={{ padding: "12px", color: theme.subtext }}>{s.created_at ? new Date(s.created_at).toLocaleString() : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </PageLayout>
  );
}

export default ComplianceCenter;
