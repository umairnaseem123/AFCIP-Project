import { useEffect, useState, useCallback } from "react";
import PageLayout from "../components/layout/PageLayout";
import { useTheme } from "../context/ThemeContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

function StatusBadge({ status }) {
  const colors = {
    verified:  { bg: "#052e16", color: "#4ade80" },
    pending:   { bg: "#431407", color: "#fb923c" },
    rejected:  { bg: "#450a0a", color: "#f87171" },
  };
  const c = colors[status] || colors.pending;
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : "Pending";
  return (
    <span style={{ background: c.bg, color: c.color, padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}>
      {label}
    </span>
  );
}

function FlagPill({ flagged, label }) {
  return (
    <span style={{ color: flagged ? "#f87171" : "#4ade80", fontSize: "13px", fontWeight: "600" }}>
      {flagged ? `${label} ⚠️` : "Clear"}
    </span>
  );
}

function KYCManagement() {
  const theme = useTheme();
  const [profiles, setProfiles]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [selected, setSelected]   = useState(null);
  const [actionId, setActionId]   = useState(null);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE}/kyc/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.results || [];
      setProfiles(list);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const runAction = async (id, action, body = {}) => {
    setActionId(`${id}-${action}`);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE}/kyc/${id}/${action}/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Action failed (${res.status})`);
      const updated = await res.json();
      // Update profile in list and selected
      setProfiles(prev => prev.map(p => p.id === id ? updated : p));
      setSelected(updated);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionId(null);
    }
  };

  const stats = [
    { label: "Total Profiles", value: profiles.length,                                    color: "#38bdf8" },
    { label: "Verified",       value: profiles.filter(p => p.status === "verified").length, color: "#4ade80" },
    { label: "Pending",        value: profiles.filter(p => p.status === "pending").length,  color: "#fb923c" },
    { label: "PEP Flagged",    value: profiles.filter(p => p.is_pep).length,               color: "#f87171" },
  ];

  return (
    <PageLayout title="KYC Management">
      {/* Stat Cards */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
        {stats.map(card => (
          <div key={card.label} style={{ flex: "1 1 120px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "12px", padding: "16px 20px" }}>
            <div style={{ color: theme.subtext, fontSize: "13px", marginBottom: "6px" }}>{card.label}</div>
            <div style={{ color: card.color, fontSize: "26px", fontWeight: "700" }}>{card.value}</div>
          </div>
        ))}
        <button
          onClick={fetchProfiles}
          disabled={loading}
          style={{ background: theme.surface, border: "1px solid #38bdf8", borderRadius: "8px", padding: "10px 16px", color: "#38bdf8", fontSize: "13px", cursor: loading ? "wait" : "pointer", alignSelf: "flex-start" }}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{ color: "#fbbf24", background: "#422006", border: "1px solid #854d0e", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "13px" }}>
          Could not load KYC profiles: {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        {/* Profiles Table */}
        <div style={{ flex: 2, minWidth: "320px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "12px", padding: "24px", overflowX: "auto" }}>
          <h3 style={{ color: theme.text, fontSize: "15px", marginBottom: "16px" }}>Customer Profiles</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                {["Customer", "CNIC", "Status", "PEP", "Sanctions"].map(h => (
                  <th key={h} style={{ color: theme.subtext, textAlign: "left", padding: "10px 12px", fontWeight: "500" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ color: theme.subtext, textAlign: "center", padding: "32px" }}>Loading...</td></tr>
              ) : profiles.length === 0 ? (
                <tr><td colSpan={5} style={{ color: theme.subtext, textAlign: "center", padding: "32px" }}>No KYC profiles found</td></tr>
              ) : (
                profiles.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => setSelected(p)}
                    style={{ borderBottom: `1px solid ${theme.border}`, cursor: "pointer", background: selected?.id === p.id ? "#0f172a" : "transparent" }}
                  >
                    <td style={{ padding: "12px", color: "#38bdf8", fontWeight: "600" }}>{p.full_name || p.customer_name || `Customer #${p.id}`}</td>
                    <td style={{ padding: "12px", color: theme.subtext }}>{p.cnic || "—"}</td>
                    <td style={{ padding: "12px" }}><StatusBadge status={p.status} /></td>
                    <td style={{ padding: "12px" }}><FlagPill flagged={p.is_pep} label="PEP" /></td>
                    <td style={{ padding: "12px" }}><FlagPill flagged={p.is_sanctioned} label="Sanctioned" /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Profile Detail Panel */}
        <div style={{ flex: 1, minWidth: "280px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "12px", padding: "24px", alignSelf: "flex-start" }}>
          <h3 style={{ color: theme.text, fontSize: "15px", marginBottom: "20px" }}>Profile Details</h3>
          {!selected ? (
            <p style={{ color: theme.subtext, fontSize: "14px" }}>Click a profile to view details</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                { label: "Customer",       value: selected.full_name || selected.customer_name || `Customer #${selected.id}`, color: "#38bdf8" },
                { label: "Email",          value: selected.email || "—" },
                { label: "CNIC",           value: selected.cnic || "—" },
                { label: "Phone",          value: selected.phone_number || "—" },
                { label: "Address",        value: selected.address || "—" },
                { label: "Nationality",    value: selected.nationality || "—" },
                { label: "Risk Level",     value: selected.risk_level || "—" },
                { label: "Verified At",    value: selected.verified_at ? new Date(selected.verified_at).toLocaleString() : "—" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ borderBottom: `1px solid ${theme.border}`, paddingBottom: "12px" }}>
                  <div style={{ color: theme.subtext, fontSize: "12px", marginBottom: "4px" }}>{label}</div>
                  <div style={{ color: color || theme.text, fontSize: "14px", fontWeight: "500" }}>{value}</div>
                </div>
              ))}

              {/* Status */}
              <div style={{ borderBottom: `1px solid ${theme.border}`, paddingBottom: "12px" }}>
                <div style={{ color: theme.subtext, fontSize: "12px", marginBottom: "6px" }}>Status</div>
                <StatusBadge status={selected.status} />
              </div>

              {/* Action Buttons */}
              <button
                onClick={() => runAction(selected.id, "verify")}
                disabled={!!actionId || selected.status === "verified"}
                style={{ background: "#166534", border: "none", borderRadius: "8px", padding: "10px", color: "white", fontSize: "13px", fontWeight: "600", cursor: selected.status === "verified" ? "not-allowed" : "pointer", opacity: selected.status === "verified" ? 0.5 : 1 }}
              >
                {actionId === `${selected.id}-verify` ? "Verifying..." : "✅ Verify"}
              </button>

              <button
                onClick={() => runAction(selected.id, "reject")}
                disabled={!!actionId || selected.status === "rejected"}
                style={{ background: "#450a0a", border: "none", borderRadius: "8px", padding: "10px", color: "#f87171", fontSize: "13px", fontWeight: "600", cursor: selected.status === "rejected" ? "not-allowed" : "pointer", opacity: selected.status === "rejected" ? 0.5 : 1 }}
              >
                {actionId === `${selected.id}-reject` ? "Rejecting..." : "❌ Reject"}
              </button>

              <button
                onClick={() => runAction(selected.id, "flag-pep")}
                disabled={!!actionId}
                style={{ background: "#1e293b", border: "1px solid #f87171", borderRadius: "8px", padding: "10px", color: "#f87171", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
              >
                {actionId === `${selected.id}-flag-pep` ? "Updating..." : selected.is_pep ? "🚩 Remove PEP Flag" : "🚩 Flag as PEP"}
              </button>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

export default KYCManagement;
