import { useEffect, useState, useCallback, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";
import PageLayout from "../components/layout/PageLayout";
import { getTransactionNetwork } from "../services/api";

export default function NetworkGraph() {
  const [data, setData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ total_nodes: 0, total_edges: 0 });
  const containerRef = useRef(null);
  const fgRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const raw = await getTransactionNetwork(100);
      const nodes = raw.nodes.map((n) => ({
        id: n.id,
        label: n.label,
        val: Math.max(4, n.transaction_count),
        color: n.is_flagged ? "#f87171" : "#4ade80",
      }));
      const links = raw.edges.map((e) => ({
        source: e.source,
        target: e.target,
        color: e.is_fraud ? "#f87171" : "#334155",
      }));
      setData({ nodes, links });
      setStats({ total_nodes: raw.total_nodes, total_edges: raw.total_edges });
    } catch (err) {
      setError(err.message || "Could not load network data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PageLayout title="Transaction Network" subtitle="Visualizing account and transaction relationships">
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "10px", padding: "12px 18px" }}>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>Nodes</div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#e2e8f0" }}>{stats.total_nodes}</div>
        </div>
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "10px", padding: "12px 18px" }}>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>Connections</div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#e2e8f0" }}>{stats.total_edges}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto", fontSize: "12px", color: "#94a3b8" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f87171", display: "inline-block" }}></span> Flagged
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#4ade80", display: "inline-block", marginLeft: "10px" }}></span> Clean
        </div>
      </div>

      {error && (
        <div style={{ background: "#450a0a", color: "#f87171", padding: "10px 14px", borderRadius: "8px", marginBottom: "12px", fontSize: "13px" }}>
          {error}
        </div>
      )}

      <div
        ref={containerRef}
        style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px", height: "600px", overflow: "hidden" }}
      >
        {loading ? (
          <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
            Loading network...
          </div>
        ) : data.nodes.length === 0 ? (
          <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
            No transaction data yet — create some transactions to see the network.
          </div>
        ) : (
          <ForceGraph2D
              ref={fgRef}
              onEngineStop={() => fgRef.current && fgRef.current.zoomToFit(400, 60)}
              d3VelocityDecay={0.3}
              linkDistance={60}
            graphData={data}
            nodeLabel={(n) => `${n.label} (${n.val} txns)`}
            nodeColor={(n) => n.color}
            linkColor={(l) => l.color}
            backgroundColor="#0f172a"
            width={containerRef.current?.clientWidth || 800}
            height={600}
          />
        )}
      </div>
    </PageLayout>
  );
}
