import { useEffect, useState, useCallback, useMemo } from "react";
import PageLayout from "../components/layout/PageLayout";
import { useTheme } from "../context/ThemeContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

function ActionBadge({ action }) {
  const colors = {
    create: { bg: "#052e16", color: "#4ade80" },
    update: { bg: "#431407", color: "#fb923c" },
    delete: { bg: "#450a0a", color: "#f87171" },
    login: { bg: "#0c1f33", color: "#38bdf8" },
  };
  const c = colors[(action || "").toLowerCase()] || { bg: "#1e293b", color: "#94a3b8" };
  return (
    <span style={{ background: c.bg, color: c.color, padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", textTransform: "capitalize" }}>
      {action || "—"}
    </span>
  );
}

function AuditTrail() {
  const theme = useTheme();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("All");
  const [selected, setSelected] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE}/audit-logs/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : data.results || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filtered = useMemo(() => logs.filter((log) => {
    const query = search.toLowerCase();
    const matchSearch =
      (log.resource || "").toLowerCase().includes(query) ||
      (log.user || log.user_name || "").toLowerCase().includes(query) ||
      (log.description || "").toLowerCase().includes(query);
    const matchAction = filterAction === "All" || (log.action || "").toLowerCase() === filterAction.toLowerCase();
    return matchSearch && matchAction;
  }), [logs, search, filterAction]);

  const inputStyle = {
    background: "#0f172a", border: "1px solid #334155", borderRadius: "8px",
    color: "white", padding: "10px 14px", fontSize: "14px", outline: "none",
  };

  return (
    <PageLayout title="Audit Trail">
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
        {[
          { label: "Total Logs", value: logs.length, color: "#38bdf8" },
          { label: "Creates", value: logs.filter((l) => (l.action || "").toLowerCase() === "create").length, color: "#4ade80" },
          { label: "Updates", value: logs.filter((l) => (l.action || "").toLowerCase() === "update").length, color: "#fb923c" },
          { label: "Deletes", value: logs.filter((l) => (l.action || "").toLowerCase() === "delete").length, color: "#f87171" },
        ].map((card) => (
          <div key={card.label} style={{ flex: "1 1 120px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "12px", padding: "16px 20px" }}>
            <div style={{ color: theme.subtext, fontSize: "13px", marginBottom: "6px" }}>{card.label}</div>
            <div style={{ color: card.color, fontSize: "26px", fontWeight: "700" }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ ...inputStyle, flex: 1, minWidth: "220px", boxSizing: "border-box" }} placeholder="Search by resource, user, or description..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select style={inputStyle} value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
          <option value="All">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="login">Login</option>
        </select>
        <button onClick={() => { setSearch(""); setFilterAction("All"); }} style={{ ...inputStyle, cursor: "pointer", color: "#f87171", borderColor: "#f87171" }}>Clear Filters</button>
        <button onClick={fetchLogs} disabled={loading} style={{ background: "#1e293b", border: "1px solid #38bdf8", borderRadius: "8px", padding: "10px 14px", color: "#38bdf8", fontSize: "13px", cursor: loading ? "wait" : "pointer" }}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div style={{ color: "#fbbf24", background: "#422006", border: "1px solid #854d0e", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "13px" }}>
          Backend not reachable yet: {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        <div style={{ flex: 2, minWidth: "320px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "12px", padding: "24px", overflowX: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ color: theme.text, fontSize: "15px", margin: 0 }}>Activity Log</h3>
            <span style={{ color: theme.subtext, fontSize: "13px" }}>{filtered.length} records</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                {["User", "Action", "Resource", "IP Address", "Time"].map((h) => (
                  <th key={h} style={{ color: theme.subtext, textAlign: "left", padding: "10px 12px", fontWeight: "500" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ color: theme.subtext, textAlign: "center", padding: "32px" }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ color: theme.subtext, textAlign: "center", padding: "32px" }}>No audit logs found</td></tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} onClick={() => setSelected(log)} style={{ borderBottom: "1px solid #0f172a", cursor: "pointer", background: selected?.id === log.id ? "#0f172a" : "transparent" }}>
                    <td style={{ padding: "12px", color: "#38bdf8", fontWeight: "600" }}>{log.user || log.user_name || "System"}</td>
                    <td style={{ padding: "12px" }}><ActionBadge action={log.action} /></td>
                    <td style={{ padding: "12px", color: "white" }}>{log.resource || "—"}</td>
                    <td style={{ padding: "12px", color: theme.subtext }}>{log.ip_address || "—"}</td>
                    <td style={{ padding: "12px", color: theme.subtext }}>{log.created_at ? new Date(log.created_at).toLocaleString() : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ flex: 1, minWidth: "280px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "12px", padding: "24px", alignSelf: "flex-start" }}>
          <h3 style={{ color: theme.text, fontSize: "15px", marginBottom: "20px" }}>Log Details</h3>
          {!selected ? (
            <p style={{ color: theme.subtext, fontSize: "14px" }}>Click a log entry to view details</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                { label: "User", value: selected.user || selected.user_name || "System", color: "#38bdf8" },
                { label: "Resource", value: selected.resource || "—" },
                { label: "IP Address", value: selected.ip_address || "—" },
                { label: "Time", value: selected.created_at ? new Date(selected.created_at).toLocaleString() : "—" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ borderBottom: `1px solid ${theme.border}`, paddingBottom: "12px" }}>
                  <div style={{ color: theme.subtext, fontSize: "12px", marginBottom: "4px" }}>{label}</div>
                  <div style={{ color: color || theme.text, fontSize: "15px", fontWeight: "500" }}>{value}</div>
                </div>
              ))}
              <div style={{ borderBottom: `1px solid ${theme.border}`, paddingBottom: "12px" }}>
                <div style={{ color: theme.subtext, fontSize: "12px", marginBottom: "6px" }}>Action</div>
                <ActionBadge action={selected.action} />
              </div>
              {selected.description && (
                <div>
                  <div style={{ color: theme.subtext, fontSize: "12px", marginBottom: "6px" }}>Description</div>
                  <div style={{ color: theme.text, fontSize: "13px" }}>{selected.description}</div>
                </div>
              )}
              {(selected.old_value || selected.new_value) && (
                <div>
                  <div style={{ color: theme.subtext, fontSize: "12px", marginBottom: "6px" }}>Change</div>
                  <div style={{ color: "#f87171", fontSize: "12px" }}>Old: {JSON.stringify(selected.old_value)}</div>
                  <div style={{ color: "#4ade80", fontSize: "12px" }}>New: {JSON.stringify(selected.new_value)}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

export default AuditTrail;
