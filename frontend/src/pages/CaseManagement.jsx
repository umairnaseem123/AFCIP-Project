import { useState, useEffect, useCallback } from "react";
import PageLayout from "../components/layout/PageLayout";
import { useTheme } from "../context/ThemeContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

function PriorityBadge({ priority }) {
  const colors = {
    High:   { bg: "#450a0a", color: "#f87171" },
    Medium: { bg: "#431407", color: "#fb923c" },
    Low:    { bg: "#052e16", color: "#4ade80" },
  };
  const c = colors[priority] || colors.Low;
  return (
    <span style={{ background: c.bg, color: c.color, padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }) {
  const colors = {
    Open:        { bg: "#450a0a", color: "#f87171" },
    "In Progress": { bg: "#431407", color: "#fb923c" },
    Closed:      { bg: "#052e16", color: "#4ade80" },
  };
  const c = colors[status] || colors.Open;
  return (
    <span style={{ background: c.bg, color: c.color, padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}>
      {status}
    </span>
  );
}

// ── New Case Modal ──────────────────────────────────────────────────────────
function NewCaseModal({ theme, onClose, onCreate }) {
  const [form, setForm] = useState({ title: "", account: "", priority: "Medium", description: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.account.trim()) {
      alert("Title aur Account number required hain");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE}/cases/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title,
          account: form.account,
          priority: form.priority,
          description: form.description,
          status: "Open",
        }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const created = await res.json();
      onCreate(created);
      onClose();
    } catch (err) {
      alert("Case create nahi hua: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", background: theme.bg, border: `1px solid ${theme.border}`,
    borderRadius: "8px", color: theme.text, padding: "10px 12px",
    fontSize: "13px", outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{
        background: theme.surface, border: `1px solid ${theme.border}`,
        borderRadius: "16px", padding: "28px", width: "420px", display: "flex",
        flexDirection: "column", gap: "16px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ color: theme.text, fontSize: "16px", margin: 0 }}>New Case Banao</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: theme.subtext, fontSize: "20px", cursor: "pointer" }}>×</button>
        </div>

        {[
          { label: "Case Title *", key: "title", placeholder: "e.g. Large Fund Movement" },
          { label: "Account Number *", key: "account", placeholder: "e.g. AC-1234" },
        ].map(({ label, key, placeholder }) => (
          <div key={key}>
            <div style={{ color: theme.subtext, fontSize: "12px", marginBottom: "6px" }}>{label}</div>
            <input
              style={inputStyle}
              placeholder={placeholder}
              value={form[key]}
              onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
            />
          </div>
        ))}

        <div>
          <div style={{ color: theme.subtext, fontSize: "12px", marginBottom: "6px" }}>Priority</div>
          <select
            value={form.priority}
            onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
            style={{ ...inputStyle }}
          >
            {["High", "Medium", "Low"].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>

        <div>
          <div style={{ color: theme.subtext, fontSize: "12px", marginBottom: "6px" }}>Description</div>
          <textarea
            style={{ ...inputStyle, resize: "vertical", minHeight: "80px" }}
            placeholder="Case ka brief description..."
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          />
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "10px", borderRadius: "8px", background: theme.bg, border: `1px solid ${theme.border}`, color: theme.subtext, cursor: "pointer", fontSize: "13px" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ flex: 1, padding: "10px", borderRadius: "8px", background: "#2563eb", border: "none", color: "white", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}
          >
            {loading ? "Bana raha hai..." : "✅ Case Banao"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
function CaseManagement() {
  const theme = useTheme();
  const [cases, setCases]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [selected, setSelected]     = useState(null);
  const [notes, setNotes]           = useState([]);
  const [newNote, setNewNote]       = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showModal, setShowModal]   = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  // ── Fetch all cases ──
  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE}/cases/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.results || [];
      setCases(list);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch notes for selected case ──
  const fetchNotes = useCallback(async (caseId) => {
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE}/cases/${caseId}/notes/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotes(Array.isArray(data) ? data : data.results || []);
    } catch {
      setNotes([]);
    }
  }, []);

  useEffect(() => { fetchCases(); }, [fetchCases]);
  useEffect(() => { if (selected) fetchNotes(selected.id); }, [selected, fetchNotes]);

  // ── Update status ──
  const updateStatus = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE}/cases/${id}/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const updated = await res.json();
      setCases(prev => prev.map(c => c.id === id ? updated : c));
      setSelected(updated);
    } catch (err) {
      alert("Status update nahi hua: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Add note ──
  const addNote = async () => {
    if (!newNote.trim() || !selected) return;
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE}/cases/${selected.id}/notes/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote.trim() }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const created = await res.json();
      setNotes(prev => [...prev, created]);
      setNewNote("");
    } catch (err) {
      // Fallback: local only
      setNotes(prev => [...prev, {
        id: Date.now(), case: selected.id,
        author: "Agent (You)", note: newNote.trim(),
        date: new Date().toISOString().split("T")[0],
      }]);
      setNewNote("");
    }
  };

  // ── When new case is created ──
  const handleCaseCreated = (newCase) => {
    setCases(prev => [newCase, ...prev]);
  };

  const filtered = cases.filter(c => filterStatus === "All" || c.status === filterStatus);

  const statCards = [
    { label: "Total Cases", value: cases.length,                                          color: "#38bdf8" },
    { label: "Open",        value: cases.filter(c => c.status === "Open").length,         color: "#f87171" },
    { label: "In Progress", value: cases.filter(c => c.status === "In Progress").length,  color: "#fb923c" },
    { label: "Closed",      value: cases.filter(c => c.status === "Closed").length,       color: "#4ade80" },
  ];

  return (
    <PageLayout title="Case Management">
      {showModal && (
        <NewCaseModal theme={theme} onClose={() => setShowModal(false)} onCreate={handleCaseCreated} />
      )}

      {/* Stats + New Case Button */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "28px", alignItems: "stretch" }}>
        {statCards.map(card => (
          <div key={card.label} style={{ flex: 1, background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "12px", padding: "20px" }}>
            <div style={{ color: theme.subtext, fontSize: "13px", marginBottom: "8px" }}>{card.label}</div>
            <div style={{ color: card.color, fontSize: "28px", fontWeight: "700" }}>{card.value}</div>
          </div>
        ))}
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: "#2563eb", border: "none", borderRadius: "12px",
            padding: "0 24px", color: "white", fontSize: "14px", fontWeight: "700",
            cursor: "pointer", whiteSpace: "nowrap",
          }}
        >
          + New Case
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ color: "#fbbf24", background: "#422006", border: "1px solid #854d0e", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "13px" }}>
          Cases load nahi hue: {error}
        </div>
      )}

      {/* Filter Buttons */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        {["All", "Open", "In Progress", "Closed"].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            padding: "8px 18px", borderRadius: "8px", fontSize: "13px", cursor: "pointer",
            border: filterStatus === s ? "1px solid #38bdf8" : `1px solid ${theme.border}`,
            background: filterStatus === s ? "#1e3a5f" : theme.surface,
            color: filterStatus === s ? "#38bdf8" : theme.subtext,
          }}>{s}</button>
        ))}
      </div>

      <div style={{ display: "flex", gap: "20px" }}>
        {/* Cases List */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
          {loading ? (
            <div style={{ color: theme.subtext, textAlign: "center", padding: "40px" }}>Loading cases...</div>
          ) : filtered.length === 0 ? (
            <div style={{ color: theme.subtext, textAlign: "center", padding: "40px" }}>
              Koi case nahi mila. "+ New Case" se banao!
            </div>
          ) : filtered.map(c => (
            <div key={c.id} onClick={() => setSelected(c)} style={{
              background: theme.surface,
              border: selected?.id === c.id ? "1px solid #38bdf8" : `1px solid ${theme.border}`,
              borderRadius: "12px", padding: "18px", cursor: "pointer", transition: "all 0.2s",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ color: "#38bdf8", fontSize: "13px", fontWeight: "600" }}>{c.case_id || c.id}</span>
                <StatusBadge status={c.status} />
              </div>
              <div style={{ color: theme.text, fontSize: "15px", fontWeight: "500", marginBottom: "6px" }}>{c.title}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: theme.subtext, fontSize: "12px" }}>
                  {c.account} · {c.date || c.created_at?.split("T")[0]}
                </span>
                <PriorityBadge priority={c.priority} />
              </div>
            </div>
          ))}
        </div>

        {/* Right Panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Case Details */}
          <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "12px", padding: "24px" }}>
            <h3 style={{ color: theme.text, fontSize: "15px", marginBottom: "16px" }}>Case Details</h3>
            {!selected ? (
              <p style={{ color: theme.subtext, fontSize: "14px" }}>Click a case to view details</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {[
                  { label: "Case ID",     value: selected.case_id || selected.id, color: "#38bdf8" },
                  { label: "Title",       value: selected.title },
                  { label: "Account",     value: selected.account },
                  { label: "Date Opened", value: selected.date || selected.created_at?.split("T")[0] },
                  { label: "Description", value: selected.description || "—" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ borderBottom: `1px solid ${theme.border}`, paddingBottom: "12px" }}>
                    <div style={{ color: theme.subtext, fontSize: "12px", marginBottom: "4px" }}>{label}</div>
                    <div style={{ color: color || theme.text, fontSize: "15px", fontWeight: "500" }}>{value}</div>
                  </div>
                ))}
                <div style={{ display: "flex", gap: "12px", borderBottom: `1px solid ${theme.border}`, paddingBottom: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: theme.subtext, fontSize: "12px", marginBottom: "6px" }}>Status</div>
                    <StatusBadge status={selected.status} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: theme.subtext, fontSize: "12px", marginBottom: "6px" }}>Priority</div>
                    <PriorityBadge priority={selected.priority} />
                  </div>
                </div>
                <div>
                  <div style={{ color: theme.subtext, fontSize: "12px", marginBottom: "10px" }}>Status Update karo</div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {["Open", "In Progress", "Closed"].map(s => (
                      <button key={s} onClick={() => updateStatus(selected.id, s)} disabled={!!updatingId} style={{
                        flex: 1, padding: "8px", borderRadius: "8px", fontSize: "12px", cursor: "pointer",
                        border: selected.status === s ? "1px solid #38bdf8" : `1px solid ${theme.border}`,
                        background: selected.status === s ? "#1e3a5f" : theme.bg,
                        color: selected.status === s ? "#38bdf8" : theme.subtext,
                        opacity: updatingId ? 0.6 : 1,
                      }}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Investigation Notes */}
          <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "12px", padding: "24px" }}>
            <h3 style={{ color: theme.text, fontSize: "15px", marginBottom: "16px" }}>Investigation Notes</h3>
            {!selected ? (
              <p style={{ color: theme.subtext, fontSize: "14px" }}>Select a case to view notes</p>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px", maxHeight: "200px", overflowY: "auto" }}>
                  {notes.length === 0 ? (
                    <p style={{ color: theme.subtext, fontSize: "13px" }}>No notes yet</p>
                  ) : notes.map(n => (
                    <div key={n.id} style={{ background: theme.bg, borderRadius: "8px", padding: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ color: "#38bdf8", fontSize: "12px", fontWeight: "600" }}>{n.author || n.created_by || "Agent"}</span>
                        <span style={{ color: theme.subtext, fontSize: "11px" }}>{n.date || n.created_at?.split("T")[0]}</span>
                      </div>
                      <div style={{ color: theme.text, fontSize: "13px" }}>{n.note || n.content}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addNote()}
                    placeholder="Note likhain aur Enter dabao..."
                    style={{
                      flex: 1, background: theme.bg, border: `1px solid ${theme.border}`,
                      borderRadius: "8px", color: theme.text, padding: "10px 12px",
                      fontSize: "13px", outline: "none",
                    }}
                  />
                  <button onClick={addNote} style={{ padding: "10px 16px", borderRadius: "8px", background: "#2563eb", color: "white", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>
                    Add
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default CaseManagement;
