import React, { useState, useCallback } from "react";
import ReactFlow, {
  Controls, Background, applyNodeChanges, applyEdgeChanges,
  MarkerType, Handle, Position, BaseEdge, getSmoothStepPath
} from "reactflow";
import "reactflow/dist/style.css";
import dagre from "dagre";

// ── Icon + Color map per component type ──
const NODE_ICON = {
  // Client
  client: { icon: "🖥️", color: "#1e3a5f", border: "#3b82f6", label_color: "#93c5fd" },
  // Edge
  waf_security_layer: { icon: "🛡️", color: "#3b1f00", border: "#f59e0b", label_color: "#fcd34d" },
  cdn: { icon: "☁️", color: "#1a2e4a", border: "#0ea5e9", label_color: "#7dd3fc" },
  edge_compute: { icon: "⚡", color: "#1a3a2a", border: "#10b981", label_color: "#6ee7b7" },
  gRPC_API_Gateway: { icon: "🔌", color: "#2d1b69", border: "#8b5cf6", label_color: "#c4b5fd" },
  Apollo_Federation_Gateway: { icon: "🔮", color: "#1e1b4b", border: "#6366f1", label_color: "#a5b4fc" },
  REST_API_Gateway: { icon: "🔗", color: "#1e3a5f", border: "#0ea5e9", label_color: "#7dd3fc" },
  Service_Mesh_Istio: { icon: "🕸️", color: "#2d1b69", border: "#a78bfa", label_color: "#ddd6fe" },
  // Traffic
  lb: { icon: "⚖️", color: "#3b1f00", border: "#f97316", label_color: "#fdba74" },
  load_balancer: { icon: "⚖️", color: "#3b1f00", border: "#f97316", label_color: "#fdba74" },
  // Services
  auth_service: { icon: "🔑", color: "#1a3a2a", border: "#22c55e", label_color: "#86efac" },
  user_service: { icon: "👤", color: "#1a3a2a", border: "#22c55e", label_color: "#86efac" },
  feed_service: { icon: "📰", color: "#1a3a2a", border: "#22c55e", label_color: "#86efac" },
  chat_service: { icon: "💬", color: "#1a3a2a", border: "#22c55e", label_color: "#86efac" },
  media_service: { icon: "🎬", color: "#1a3a2a", border: "#22c55e", label_color: "#86efac" },
  notification_service: { icon: "🔔", color: "#1a3a2a", border: "#22c55e", label_color: "#86efac" },
  audit_logging_service: { icon: "📋", color: "#1a3a2a", border: "#22c55e", label_color: "#86efac" },
  OpenTelemetry_Collector: { icon: "🔭", color: "#1a2e4a", border: "#06b6d4", label_color: "#67e8f9" },
  Chaos_Mesh_Agent: { icon: "🌪️", color: "#3b1f00", border: "#ef4444", label_color: "#fca5a5" },
  // Data
  NoSQL_DB: { icon: "🍃", color: "#1a3a1a", border: "#16a34a", label_color: "#4ade80" },
  SQL_DB: { icon: "🗄️", color: "#1a2a3a", border: "#2563eb", label_color: "#93c5fd" },
  SQL_DB_Strict: { icon: "🔒", color: "#1a2a3a", border: "#2563eb", label_color: "#93c5fd" },
  NewSQL_Distributed_DB: { icon: "🌐", color: "#1a2a3a", border: "#7c3aed", label_color: "#c4b5fd" },
  Write_Model_DB: { icon: "✏️", color: "#1a2a3a", border: "#dc2626", label_color: "#fca5a5" },
  Read_Model_DB: { icon: "👁️", color: "#1a2a3a", border: "#2563eb", label_color: "#93c5fd" },
  cache: { icon: "⚡", color: "#3b1f00", border: "#ef4444", label_color: "#fca5a5" },
  Redis_Cluster_Ultra_Fast: { icon: "🚀", color: "#3b1f00", border: "#ef4444", label_color: "#fca5a5" },
  read_replica: { icon: "📄", color: "#1a2a3a", border: "#64748b", label_color: "#cbd5e1" },
  sharding: { icon: "🧩", color: "#1a2a3a", border: "#64748b", label_color: "#cbd5e1" },
  Cross_Region_Active_Replication: { icon: "🔄", color: "#1a2a3a", border: "#7c3aed", label_color: "#c4b5fd" },
  KMS_Encryption_Service: { icon: "🔐", color: "#3b1f00", border: "#f59e0b", label_color: "#fcd34d" },
  // Async
  Event_Store_Kafka: { icon: "🌊", color: "#1a2a3a", border: "#ea580c", label_color: "#fdba74" },
  message_queue: { icon: "📨", color: "#1a2a3a", border: "#ea580c", label_color: "#fdba74" },
  worker_services: { icon: "⚙️", color: "#1a2a3a", border: "#64748b", label_color: "#cbd5e1" },
  event_streaming: { icon: "📡", color: "#1a2a3a", border: "#ea580c", label_color: "#fdba74" },
};

const DEFAULT_NODE = { icon: "🔷", color: "#1e2a3a", border: "#475569", label_color: "#94a3b8" };

const EdgeLabel = ({ x, y, label }) => (
  <foreignObject x={x - 50} y={y - 12} width={100} height={24} style={{ overflow: "visible" }}>
    <div style={{
      background: "rgba(0,0,0,0.7)", color: "#94a3b8", fontSize: 10,
      padding: "2px 8px", borderRadius: 4, textAlign: "center",
      whiteSpace: "nowrap", fontFamily: "monospace", border: "1px solid #334155"
    }}>
      {label}
    </div>
  </foreignObject>
);

const EDGE_LABELS = {
  "client->cdn": "routes to", "client->REST_API_Gateway": "HTTPS",
  "client->gRPC_API_Gateway": "gRPC", "cdn->REST_API_Gateway": "origin pull",
  "cdn->Apollo_Federation_Gateway": "origin pull", "cdn->gRPC_API_Gateway": "origin pull",
  "REST_API_Gateway->lb": "load", "gRPC_API_Gateway->lb": "load",
  "Apollo_Federation_Gateway->lb": "load", "lb->auth_service": "routes",
  "lb->user_service": "routes", "lb->feed_service": "routes",
  "lb->chat_service": "ws", "lb->media_service": "upload",
  "lb->notification_service": "push",
  "chat_service->NoSQL_DB": "read/write", "chat_service->cache": "sessions",
  "feed_service->read_replica": "SELECT", "feed_service->cache": "hot posts",
  "auth_service->NoSQL_DB": "tokens", "auth_service->SQL_DB": "users",
  "media_service->NoSQL_DB": "metadata", "user_service->SQL_DB": "write",
  "user_service->read_replica": "read",
};

function getEdgeLabel(source, target) {
  return EDGE_LABELS[`${source}->${target}`] || "";
}

function LabeledEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd, style }) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {data?.label && <EdgeLabel x={labelX} y={labelY} label={data.label} />}
    </>
  );
}

const edgeTypes = { labeled: LabeledEdge };

const ArchNode = ({ data, selected }) => {
  const cfg = NODE_ICON[data.nodeId] || DEFAULT_NODE;
  return (
    <div style={{
      background: cfg.color,
      border: `1.5px solid ${selected ? "#fff" : cfg.border}`,
      borderRadius: 12,
      padding: "12px 16px",
      minWidth: 130,
      maxWidth: 170,
      boxShadow: selected
        ? `0 0 20px ${cfg.border}, 0 0 40px ${cfg.border}40`
        : `0 0 12px ${cfg.border}40, 0 4px 16px rgba(0,0,0,0.5)`,
      cursor: "pointer",
      transition: "box-shadow 0.2s",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 6,
      position: "relative",
    }}>
      <Handle type="target" position={Position.Left}
        style={{ background: cfg.border, width: 8, height: 8, border: "none" }} />

      <div style={{ fontSize: 28, lineHeight: 1 }}>{cfg.icon}</div>
      <div style={{
        fontSize: 11.5, fontWeight: 700, color: "#fff",
        textAlign: "center", lineHeight: 1.3,
        fontFamily: "'Outfit', sans-serif",
      }}>
        {data.label}
      </div>
      <div style={{
        fontSize: 10, color: cfg.label_color, textTransform: "uppercase",
        letterSpacing: "0.5px", fontFamily: "monospace",
      }}>
        {data.layer}
      </div>

      <Handle type="source" position={Position.Right}
        style={{ background: cfg.border, width: 8, height: 8, border: "none" }} />
    </div>
  );
};

const nodeTypes = { arch: ArchNode };

function layout(nodes, edges, dir = "LR") {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: dir, ranksep: 120, nodesep: 60 });
  nodes.forEach(n => g.setNode(n.id, { width: 180, height: 90 }));
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);
  nodes.forEach(n => {
    const p = g.node(n.id);
    n.position = { x: p.x - 90, y: p.y - 45 };
    n.targetPosition = Position.Left;
    n.sourcePosition = Position.Right;
  });
  return { nodes, edges };
}

export default function ArchitectureDiagram({ architectureData, onNodeSelect }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [built, setBuilt] = useState(false);

  React.useEffect(() => {
    if (!architectureData) return;
    const rawNodes = architectureData.nodes.map(n => ({
      id: n.id, type: "arch",
      data: { label: n.label, layer: n.layer, nodeId: n.id },
      position: { x: 0, y: 0 },
    }));
    const rawEdges = architectureData.edges.map(([s, t], i) => ({
      id: `e${i}`, source: s, target: t,
      type: "labeled",
      animated: true,
      style: { stroke: "#334155", strokeWidth: 1.5, strokeDasharray: "5 3" },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#475569", width: 16, height: 16 },
      data: { label: getEdgeLabel(s, t) }
    }));
    const { nodes: ln, edges: le } = layout(rawNodes, rawEdges);
    setNodes(ln); setEdges(le); setBuilt(true);
  }, [architectureData]);

  const onNodesChange = useCallback(c => setNodes(n => applyNodeChanges(c, n)), []);
  const onEdgesChange = useCallback(c => setEdges(e => applyEdgeChanges(c, e)), []);

  const handleNodeClick = (_, node) => {
    if (onNodeSelect) onNodeSelect(node.id, node.data);
  };

  if (!built) return null;

  return (
    <ReactFlow
      nodes={nodes} edges={edges}
      onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      nodeTypes={nodeTypes} edgeTypes={edgeTypes}
      fitView fitViewOptions={{ padding: 0.25 }}
      style={{ background: "#0d1117" }}
    >
      <Background color="#1e2a3a" gap={32} size={1} />
      <Controls style={{ background: "#161b22", border: "1px solid #30363d", color: "#8b949e" }} />
    </ReactFlow>
  );
}
