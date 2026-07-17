import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fraudAlerts as mockFraudAlerts,
  highRiskAccounts as mockHighRiskAccounts,
  monthlyTrends,
  recentTransactions as mockTransactions,
  riskDistribution,
  stats as mockStats,
  weeklyTransactions,
} from "../data/mockdata";
import { getTransactions, normalizeList } from "../services/api";

function formatDate(value) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-CA").format(new Date(value));
}

function mapStatus(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "FAILED") return "Flagged";
  if (normalized === "PENDING") return "Under Review";
  return "Clear";
}

function mapRisk(amount, status, riskLevel) {
  if (riskLevel) {
    const normalized = String(riskLevel).toLowerCase();
    if (normalized.includes("high")) return "High";
    if (normalized.includes("medium")) return "Medium";
    if (normalized.includes("low")) return "Low";
  }
  const numericAmount = Number(amount || 0);
  if (String(status || "").toUpperCase() === "FAILED" || numericAmount >= 50000) return "High";
  if (String(status || "").toUpperCase() === "PENDING" || numericAmount >= 10000) return "Medium";
  return "Low";
}

function mapType(transactionType) {
  const type = String(transactionType || "").toUpperCase();
  if (type === "DEBIT") return "Withdrawal";
  if (type === "CREDIT") return "Deposit";
  return "Transfer";
}

function toUiTransaction(tx) {
  const amount = Number(tx.amount || 0);
  const risk = mapRisk(amount, tx.status, tx.risk_level);
  return {
    id: tx.reference || `TXN${tx.id}`,
    account: tx.user_email || `User #${tx.user}`,
    amount,
    type: mapType(tx.transaction_type),
    status: mapStatus(tx.status),
    risk,
    fraudProbability: tx.fraud_probability ?? null,
    riskScore: tx.risk_score ?? null,
    riskLevel: tx.risk_level || "",
    location: tx.location || "",
    deviceType: tx.device_type || "",
    date: formatDate(tx.created_at),
    description: tx.description,
    // ── KYC fields from backend serializer ──
    kyc_name:     tx.kyc_name     || null,
    kyc_status:   tx.kyc_status   || null,
    kyc_is_pep:   tx.kyc_is_pep   || false,
  };
}

function buildAlerts(transactions) {
  return transactions
    .filter((tx) => tx.risk === "High" || tx.status === "Flagged")
    .map((tx, index) => ({
      id: `ALT${String(index + 1).padStart(3, "0")}`,
      account: tx.account,
      type: tx.amount >= 50000 ? "Large Value Transaction" : "Failed Transaction",
      probability: tx.fraudProbability ?? (tx.risk === "High" ? 88 : 68),
      status: tx.status === "Clear" ? "Resolved" : "Open",
      date: tx.date,
    }));
}

function buildStats(transactions, alerts, source) {
  if (source !== "live") return mockStats;
  return {
    totalTransactions: transactions.length,
    fraudAlerts: alerts.length,
    highRiskAccounts: new Set(transactions.filter((tx) => tx.risk === "High").map((tx) => tx.account)).size,
    openCases: alerts.filter((alert) => alert.status !== "Resolved").length,
  };
}

function buildHighRiskAccounts(transactions) {
  const byAccount = new Map();
  transactions.forEach((tx) => {
    const entry = byAccount.get(tx.account) || {
      id: tx.account,
      name: tx.account,
      transactions: 0,
      flagged: 0,
      highRiskCount: 0,
      scoreSum: 0,
      scoredCount: 0,
    };
    entry.transactions += 1;
    if (tx.status === "Flagged") entry.flagged += 1;
    if (tx.risk === "High") entry.highRiskCount += 1;
    if (tx.riskScore != null) {
      entry.scoreSum += tx.riskScore;
      entry.scoredCount += 1;
    }
    byAccount.set(tx.account, entry);
  });

  return Array.from(byAccount.values())
    .map((acc) => {
      let riskScore;
      if (acc.scoredCount > 0) {
        riskScore = Math.round(acc.scoreSum / acc.scoredCount);
      } else {
        const flagRate = acc.transactions ? acc.flagged / acc.transactions : 0;
        const highRiskRate = acc.transactions ? acc.highRiskCount / acc.transactions : 0;
        riskScore = Math.min(100, Math.round(flagRate * 60 + highRiskRate * 40 + acc.flagged * 5));
      }
      return { id: acc.id, name: acc.name, transactions: acc.transactions, flagged: acc.flagged, riskScore };
    })
    .sort((a, b) => b.riskScore - a.riskScore);
}

function buildRiskDistribution(transactions) {
  if (!transactions.length) return riskDistribution;
  const counts = { Low: 0, Medium: 0, High: 0 };
  transactions.forEach((tx) => { counts[tx.risk] = (counts[tx.risk] || 0) + 1; });
  const total = transactions.length;
  return [
    { name: "Low Risk", value: Math.round((counts.Low / total) * 100) },
    { name: "Medium Risk", value: Math.round((counts.Medium / total) * 100) },
    { name: "High Risk", value: Math.round((counts.High / total) * 100) },
  ];
}

export function useOperationalData() {
  const [transactions, setTransactions] = useState(mockTransactions);
  const [source, setSource] = useState("demo");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await getTransactions();
      const liveTransactions = normalizeList(payload).map(toUiTransaction);
      setTransactions(liveTransactions);
      setSource("live");
    } catch (err) {
      setTransactions(mockTransactions);
      setSource("demo");
      setError(err.message || "Backend is not available yet.");
    } finally {
      setLastUpdated(new Date());
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  return useMemo(() => {
    const fraudAlerts = source === "live" ? buildAlerts(transactions) : mockFraudAlerts;
    return {
      error,
      fraudAlerts,
      highRiskAccounts: source === "live" ? buildHighRiskAccounts(transactions) : mockHighRiskAccounts,
      lastUpdated,
      loading,
      monthlyTrends,
      refresh,
      riskDistribution: source === "live" ? buildRiskDistribution(transactions) : riskDistribution,
      source,
      stats: buildStats(transactions, fraudAlerts, source),
      transactions,
      weeklyTransactions,
    };
  }, [error, lastUpdated, loading, refresh, source, transactions]);
}
