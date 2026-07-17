import { NavLink, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { clearAuth } from "../../services/api";
import { useOperationalData } from "../../hooks/useOperationalData";
import {
  LayoutDashboard, ArrowLeftRight, ShieldAlert,
  Target, Bell, FolderOpen, FileText, Settings, LogOut, UserCheck, Share2,
} from "lucide-react";

function AfcipLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shieldGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <path d="M18 2L4 8V18C4 25.5 10 32 18 34C26 32 32 25.5 32 18V8L18 2Z"
        fill="url(#shieldGrad)" opacity="0.15" />
      <path d="M18 2L4 8V18C4 25.5 10 32 18 34C26 32 32 25.5 32 18V8L18 2Z"
        fill="none" stroke="url(#shieldGrad)" strokeWidth="1.5" />
      <ellipse cx="18" cy="18" rx="6" ry="4" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
      <circle cx="18" cy="18" r="2" fill="#38bdf8" />
      <line x1="10" y1="18" x2="12" y2="18" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="24" y1="18" x2="26" y2="18" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="18" cy="10" r="1.2" fill="#38bdf8" opacity="0.7" />
    </svg>
  );
}

function ThreatLevel({ stats }) {
  const flagged = stats?.fraudAlerts || 0;
  const total = stats?.totalTransactions || 1;
  const ratio = flagged / total;
  
  let level, color, bg, border;
  if (ratio >= 0.5) { level = "HIGH"; color = "#f87171"; bg = "#450a0a"; border = "#7f1d1d"; }
  else if (ratio >= 0.2) { level = "MEDIUM"; color = "#fb923c"; bg = "#431407"; border = "#9a3412"; }
  else { level = "LOW"; color = "#4ade80"; bg = "#052e16"; border = "#166534"; }

  return (
    <div style={{ margin: "8px 18px", background: bg, border: `1px solid ${border}`, borderRadius: "8px", padding: "8px 12px" }}>
      <div style={{ color: "#94a3b8", fontSize: "9px", letterSpacing: "0.08em", marginBottom: "4px" }}>THREAT LEVEL</div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}` }} />
        <span style={{ color, fontSize: "13px", fontWeight: "700", letterSpacing: "1px" }}>{level}</span>
      </div>
    </div>
  );
}

const Sidebar = ({ onClose }) => {
  const navigate = useNavigate();
  const { navBg, border, text, subtext, isDark } = useTheme();
  const { stats, fraudAlerts } = useOperationalData();

  const openAlerts = fraudAlerts.filter(a => a.status === "Open").length;

  const navItems = [
    { path: "/dashboard",       label: "Dashboard",       icon: LayoutDashboard, badge: null },
    { path: "/transactions",    label: "Transactions",    icon: ArrowLeftRight,  badge: stats?.totalTransactions || null },
    { path: "/kyc",             label: "KYC",             icon: UserCheck,       badge: null },
    { path: "/fraud-detection", label: "Fraud Detection", icon: ShieldAlert,     badge: openAlerts || null },
    { path: "/risk-scoring",    label: "Risk Scoring",    icon: Target,          badge: null },
    { path: "/alerts",          label: "Alerts",          icon: Bell,            badge: openAlerts || null },
    { path: "/cases",           label: "Case Management", icon: FolderOpen,      badge: stats?.openCases || null },
    { path: "/reports",         label: "Reports",         icon: FileText,        badge: null },
    { path: "/network",          label: "Network Graph",   icon: Share2,          badge: null },
    { path: "/settings",        label: "Settings",        icon: Settings,        badge: null },
  ];

  const handleLogout = () => { clearAuth(); navigate("/login"); };
  const handleNav = () => { if (onClose) onClose(); };

  return (
    <div style={{
      width: "220px", minHeight: "100vh", background: navBg,
      display: "flex", flexDirection: "column",
      borderRight: `1px solid ${border}`,
      position: "sticky", top: 0, height: "100vh",
      transition: "all 0.3s", zIndex: 200,
    }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      {/* Logo */}
      <div style={{ padding: "18px", borderBottom: `1px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <AfcipLogo />
          <div>
            <div style={{ background: "linear-gradient(90deg, #38bdf8, #6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: "800", fontSize: "17px", letterSpacing: "2px" }}>AFCIP</div>
            <div style={{ color: subtext, fontSize: "9px", marginTop: "1px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Intelligence Platform</div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: "none", border: "none", color: subtext, cursor: "pointer", fontSize: "18px", padding: "4px" }}>âœ•</button>
        )}
      </div>

      {/* System Active */}
      <div style={{ margin: "8px 18px 0", background: "#052e16", border: "1px solid #166534", borderRadius: "8px", padding: "7px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80", animation: "pulse 2s infinite" }} />
        <span style={{ color: "#4ade80", fontSize: "11px", fontWeight: "600" }}>SYSTEM ACTIVE</span>
      </div>

      {/* Threat Level */}
      <ThreatLevel stats={stats} />

      {/* Nav label */}
      <div style={{ padding: "4px 18px", fontSize: "10px", color: subtext, fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Navigation
      </div>

      {/* Nav Links */}
      <nav style={{ flex: 1, paddingTop: "4px", overflowY: "auto" }}>
        {navItems.map(({ path, label, icon: Icon, badge }) => (
          <NavLink
            key={path}
            to={path}
            onClick={handleNav}
            style={({ isActive }) => ({
              display: "flex", alignItems: "center", gap: "10px",
              padding: "10px 18px", fontSize: "13px", textDecoration: "none",
              color: isActive ? "#ffffff" : subtext,
              background: isActive ? "linear-gradient(90deg, #38bdf815, transparent)" : "transparent",
              borderLeft: isActive ? "3px solid #38bdf8" : "3px solid transparent",
              transition: "all 0.15s", margin: "1px 0",
              justifyContent: "space-between",
            })}
            onMouseEnter={e => {
              if (!e.currentTarget.style.borderLeftColor.includes("38bdf8")) {
                e.currentTarget.style.background = isDark ? "#ffffff08" : "#00000008";
                e.currentTarget.style.color = text;
              }
            }}
            onMouseLeave={e => {
              const isActive = e.currentTarget.getAttribute("aria-current") === "page";
              if (!isActive) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = subtext;
              }
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Icon size={15} />
              <span>{label}</span>
            </div>
            {badge > 0 && (
              <span style={{ background: "#f87171", color: "white", fontSize: "10px", fontWeight: "700", borderRadius: "10px", padding: "1px 6px", minWidth: "18px", textAlign: "center" }}>
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Version */}
      <div style={{ padding: "6px 18px", textAlign: "center" }}>
        <span style={{ color: subtext, fontSize: "10px", letterSpacing: "0.05em" }}>v1.0.0 Â· Hackathon Build</span>
      </div>

      {/* Logout */}
      <div style={{ padding: "12px 18px", borderTop: `1px solid ${border}` }}>
        <button onClick={handleLogout} style={{
          background: "none", border: `1px solid ${isDark ? "#334155" : "#fca5a5"}`,
          borderRadius: "8px", color: "#ef4444", fontSize: "13px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: "8px", width: "100%",
          padding: "9px 12px", transition: "all 0.15s",
        }}
          onMouseEnter={e => e.currentTarget.style.background = "#ef444415"}
          onMouseLeave={e => e.currentTarget.style.background = "none"}
        >
          <LogOut size={14} /> Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
