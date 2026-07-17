// src/pages/Dashboard.jsx
import {
  AlertTriangle,
  Download,
  FolderOpen,
  RefreshCw,
  ShieldAlert,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PageLayout from "../components/layout/PageLayout";
import { useTheme } from "../context/ThemeContext";
import { useOperationalData } from "../hooks/useOperationalData";
import { exportToCSV } from "../utils/exportCSV";

const RISK_COLORS = { High: "#f87171", Medium: "#fbbf24", Low: "#34d399" };
const STATUS_COLORS = { Flagged: "#f87171", "Under Review": "#fbbf24", Clear: "#34d399" };
const PIE_COLORS = ["#34d399", "#fbbf24", "#f87171"];

function currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function scoreColor(score) {
  if (score >= 85) return "#f87171";
  if (score >= 70) return "#fbbf24";
  return "#34d399";
}

function Card({ title, action, children }) {
  const { surface, border, text } = useTheme();
  return (
    <div
      style={{
        background: surface,
        border: `1px solid ${border}`,
        borderRadius: 12,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: text }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Pill({ label, color }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        padding: "4px 10px",
        borderRadius: 999,
        color,
        background: `${color}1f`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

const Dashboard = () => {
  const { surface, border, text, subtext, accent } = useTheme();
  const {
    error,
    fraudAlerts,
    highRiskAccounts,
    lastUpdated,
    loading,
    monthlyTrends,
    refresh,
    riskDistribution,
    source,
    stats,
    transactions,
    weeklyTransactions,
  } = useOperationalData();

  const resolvedCount = fraudAlerts.filter((a) => a.status === "Resolved").length;
  const resolutionRate = fraudAlerts.length
    ? Math.round((resolvedCount / fraudAlerts.length) * 100)
    : 0;
  const resolutionData = [{ name: "Resolved", value: resolutionRate, fill: accent }];

  const lastUpdatedLabel = lastUpdated
    ? new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(lastUpdated)
    : "—";

  const sortedAccounts = [...highRiskAccounts].sort((a, b) => b.riskScore - a.riskScore);

  const kpis = [
    { label: "Total Transactions", value: stats.totalTransactions.toLocaleString(), icon: Users, tint: accent },
    { label: "Fraud Alerts", value: stats.fraudAlerts.toLocaleString(), icon: AlertTriangle, tint: "#f87171" },
    { label: "High-Risk Accounts", value: stats.highRiskAccounts.toLocaleString(), icon: ShieldAlert, tint: "#fbbf24" },
    { label: "Open Cases", value: stats.openCases.toLocaleString(), icon: FolderOpen, tint: "#a78bfa" },
  ];

  return (
    <PageLayout title="Fraud Detection Dashboard">
      <style>{`
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .chart-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
        .panel-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
        .table-wrap { overflow-x: auto; }
        .spin { animation: dash-spin 0.8s linear infinite; }
        @keyframes dash-spin { to { transform: rotate(360deg); } }
        @media (max-width: 1024px) {
          .chart-row, .panel-row { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .kpi-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      {/* Status bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: subtext, fontSize: 13 }}>
          {source === "live" ? (
            <Wifi size={15} style={{ color: "#34d399" }} />
          ) : (
            <WifiOff size={15} style={{ color: subtext }} />
          )}
          <span>{source === "live" ? "Live data" : "Demo data"}</span>
          <span>· Updated {lastUpdatedLabel}</span>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "transparent",
            border: `1px solid ${border}`,
            color: text,
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 13,
            cursor: loading ? "default" : "pointer",
          }}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(248,113,113,0.1)",
            border: "1px solid rgba(248,113,113,0.4)",
            color: "#f87171",
            borderRadius: 10,
            padding: "10px 16px",
            fontSize: 13,
            marginBottom: 20,
          }}
        >
          {error} Showing demo data instead.
        </div>
      )}

      {/* KPI cards */}
      <div className="kpi-grid">
        {kpis.map(({ label, value, icon: Icon, tint }) => (
          <div
            key={label}
            style={{
              background: surface,
              border: `1px solid ${border}`,
              borderRadius: 12,
              padding: 18,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: `${tint}1f`,
              }}
            >
              <Icon size={17} style={{ color: tint }} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: text }}>{value}</div>
            <div style={{ fontSize: 13, color: subtext }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Risk distribution + resolution rate */}
      <div className="chart-row">
        <Card title="Risk Distribution">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={riskDistribution}
                dataKey="value"
                nameKey="name"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={2}
              >
                {riskDistribution.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: surface, border: `1px solid ${border}`, borderRadius: 8 }}
                labelStyle={{ color: text }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {riskDistribution.map((entry, index) => (
              <div key={entry.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: subtext }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[index % PIE_COLORS.length] }} />
                {entry.name}: {entry.value}%
              </div>
            ))}
          </div>
        </Card>

        <Card title="Alert Resolution Rate">
          <div style={{ position: "relative" }}>
            <ResponsiveContainer width="100%" height={180}>
              <RadialBarChart
                data={resolutionData}
                innerRadius="70%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar dataKey="value" cornerRadius={10} background={{ fill: border }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 26, fontWeight: 700, color: text }}>{resolutionRate}%</div>
              <div style={{ fontSize: 12, color: subtext }}>resolved</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: subtext, textAlign: "center" }}>
            {resolvedCount} of {fraudAlerts.length} alerts closed
          </div>
        </Card>
      </div>

      {/* Weekly + monthly trends */}
      <div className="chart-row">
        <Card title="Weekly Transaction Volume">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyTransactions}>
              <CartesianGrid stroke={border} vertical={false} />
              <XAxis dataKey="day" stroke={subtext} fontSize={12} />
              <YAxis stroke={subtext} fontSize={12} />
              <Tooltip contentStyle={{ background: surface, border: `1px solid ${border}`, borderRadius: 8 }} labelStyle={{ color: text }} />
              <Bar dataKey="transactions" fill={accent} radius={[4, 4, 0, 0]} />
              <Bar dataKey="flagged" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Monthly Trends">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyTrends}>
              <CartesianGrid stroke={border} vertical={false} />
              <XAxis dataKey="month" stroke={subtext} fontSize={12} />
              <YAxis stroke={subtext} fontSize={12} />
              <Tooltip contentStyle={{ background: surface, border: `1px solid ${border}`, borderRadius: 8 }} labelStyle={{ color: text }} />
              <Line type="monotone" dataKey="transactions" stroke={accent} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="fraud" stroke="#f87171" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Alerts + high-risk accounts */}
      <div className="panel-row">
        <Card title="Active Fraud Alerts">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {fraudAlerts.map((alert) => (
              <div key={alert.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: text }}>
                  <span>{alert.account} · {alert.type}</span>
                  <Pill
                    label={alert.status}
                    color={alert.status === "Resolved" ? "#34d399" : alert.status === "Open" ? "#f87171" : "#fbbf24"}
                  />
                </div>
                <div style={{ height: 6, borderRadius: 999, background: border, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${alert.probability}%`,
                      background: alert.probability >= 80 ? "#f87171" : alert.probability >= 60 ? "#fbbf24" : "#34d399",
                    }}
                  />
                </div>
                <div style={{ fontSize: 11, color: subtext }}>
                  {alert.probability}% fraud probability · {alert.date}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="High-Risk Accounts">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sortedAccounts.map((acc) => (
              <div key={acc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: text }}>{acc.name}</div>
                  <div style={{ fontSize: 11, color: subtext }}>
                    {acc.id} · {acc.transactions} txns · {acc.flagged} flagged
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: scoreColor(acc.riskScore),
                    background: `${scoreColor(acc.riskScore)}1f`,
                    borderRadius: 8,
                    padding: "4px 10px",
                  }}
                >
                  {acc.riskScore}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent transactions */}
      <div style={{ marginTop: 16 }}>
        <Card
          title="Recent Transactions"
          action={
            <button
              onClick={() => exportToCSV(transactions, "transactions.csv")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: accent,
                border: "none",
                color: "#0f172a",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Download size={14} />
              Export CSV
            </button>
          }
        >
          <div className="table-wrap">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: subtext, borderBottom: `1px solid ${border}` }}>
                  <th style={{ padding: "8px 10px" }}>ID</th>
                  <th style={{ padding: "8px 10px" }}>Account</th>
                  <th style={{ padding: "8px 10px" }}>Type</th>
                  <th style={{ padding: "8px 10px" }}>Amount</th>
                  <th style={{ padding: "8px 10px" }}>Status</th>
                  <th style={{ padding: "8px 10px" }}>Risk</th>
                  <th style={{ padding: "8px 10px" }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: `1px solid ${border}` }}>
                    <td style={{ padding: "8px 10px", color: text }}>{tx.id}</td>
                    <td style={{ padding: "8px 10px", color: text }}>{tx.account}</td>
                    <td style={{ padding: "8px 10px", color: subtext }}>{tx.type}</td>
                    <td style={{ padding: "8px 10px", color: text }}>{currency(tx.amount)}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <Pill label={tx.status} color={STATUS_COLORS[tx.status] || subtext} />
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <Pill label={tx.risk} color={RISK_COLORS[tx.risk] || subtext} />
                    </td>
                    <td style={{ padding: "8px 10px", color: subtext }}>{tx.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
};

export default Dashboard;