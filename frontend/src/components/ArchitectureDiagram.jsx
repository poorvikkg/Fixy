import React, { useState, useCallback, useEffect } from "react";
import ReactFlow, {
  Controls, Background, MiniMap, applyNodeChanges, applyEdgeChanges,
  MarkerType, Handle, Position, BaseEdge, getBezierPath, EdgeLabelRenderer
} from "reactflow";
import "reactflow/dist/style.css";
import dagre from "dagre";

// ── Layer config: color, glow, icon, badge label ──
const LAYER_CONFIG = {
  client:   { bg: "linear-gradient(135deg,#0f172a,#1e293b)", border: "#3b82f6", glow: "#3b82f6", icon: "🖥️",  badge: "CLIENT",   badgeColor: "#3b82f6" },
  edge:     { bg: "linear-gradient(135deg,#1a0533,#2d0e5a)", border: "#8b5cf6", glow: "#8b5cf6", icon: "🌐",  badge: "EDGE",     badgeColor: "#8b5cf6" },
  traffic:  { bg: "linear-gradient(135deg,#1c0f00,#3b1f00)", border: "#f97316", glow: "#f97316", icon: "⚖️",  badge: "TRAFFIC",  badgeColor: "#f97316" },
  service:  { bg: "linear-gradient(135deg,#022c22,#064e3b)", border: "#10b981", glow: "#10b981", icon: "⚙️",  badge: "SERVICE",  badgeColor: "#10b981" },
  data:     { bg: "linear-gradient(135deg,#0c1a4a,#1e3a8a)", border: "#60a5fa", glow: "#60a5fa", icon: "🗄️",  badge: "DATA",     badgeColor: "#60a5fa" },
  cache:    { bg: "linear-gradient(135deg,#3b0000,#7f1d1d)", border: "#ef4444", glow: "#ef4444", icon: "⚡",  badge: "CACHE",    badgeColor: "#ef4444" },
  async:    { bg: "linear-gradient(135deg,#1c1100,#3b2200)", border: "#f59e0b", glow: "#f59e0b", icon: "📡",  badge: "ASYNC",    badgeColor: "#f59e0b" },
  security: { bg: "linear-gradient(135deg,#1c0000,#450a0a)", border: "#f87171", glow: "#f87171", icon: "🛡️",  badge: "SECURITY", badgeColor: "#f87171" },
};

// ── Per-node icon overrides ──
const NODE_ICONS = {
  client: "🖥️", waf_security_layer: "🛡️", cdn: "☁️", edge_compute: "⚡",
  gRPC_API_Gateway: "🔌", Apollo_Federation_Gateway: "🔮", REST_API_Gateway: "🔗",
  Service_Mesh_Istio: "🕸️", load_balancer: "⚖️", auto_scaling: "📈",
  auth_service: "🔑", user_service: "👤", feed_service: "📰", chat_service: "💬",
  media_service: "🎬", notification_service: "🔔", audit_logging_service: "📋",
  OpenTelemetry_Collector: "🔭", Chaos_Mesh_Agent: "🌪️",
  NoSQL_DB: "🍃", SQL_DB: "🗄️", SQL_DB_Strict: "🔒", NewSQL_Distributed_DB: "🌐",
  Write_Model_DB: "✏️", Read_Model_DB: "👁️",
  cache: "⚡", Redis_Cluster_Ultra_Fast: "🚀", read_replica: "📄", sharding: "🧩",
  Cross_Region_Active_Replication: "🔄", KMS_Encryption_Service: "🔐",
  Event_Store_Kafka: "🌊", message_queue: "📨", worker_services: "⚙️", event_streaming: "📡",
};

// ── Map node layer string to LAYER_CONFIG key ──
function resolveLayer(nodeId, layer) {
  if (nodeId === "client") return "client";
  if (["waf_security_layer","KMS_Encryption_Service"].includes(nodeId)) return "security";
  if (["cdn","edge_compute","gRPC_API_Gateway","Apollo_Federation_Gateway","REST_API_Gateway","Service_Mesh_Istio"].includes(nodeId)) return "edge";
  if (["load_balancer","auto_scaling"].includes(nodeId)) return "traffic";
  if (nodeId.endsWith("_service") || ["OpenTelemetry_Collector","Chaos_Mesh_Agent","audit_logging_service"].includes(nodeId)) return "service";
  if (["cache","Redis_Cluster_Ultra_Fast","read_replica","sharding","Cross_Region_Active_Replication"].includes(nodeId)) return "cache";
  if (["Event_Store_Kafka","message_queue","worker_services","event_streaming"].includes(nodeId)) return "async";
  return "data";
}

// ── Edge label map ──
const EDGE_META = {
  "client->waf_security_layer":       { label: "HTTPS", bidir: false, color: "#f87171" },
  "client->cdn":                       { label: "HTTPS", bidir: false, color: "#8b5cf6" },
  "client->REST_API_Gateway":          { label: "HTTPS/REST", bidir: true,  color: "#3b82f6" },
  "client->gRPC_API_Gateway":          { label: "gRPC/TLS", bidir: true,  color: "#3b82f6" },
  "client->Apollo_Federation_Gateway": { label: "GraphQL", bidir: true,  color: "#3b82f6" },
  "waf_security_layer->cdn":           { label: "filtered", bidir: false, color: "#f87171" },
  "cdn->REST_API_Gateway":             { label: "origin pull", bidir: false, color: "#8b5cf6" },
  "cdn->gRPC_API_Gateway":             { label: "origin pull", bidir: false, color: "#8b5cf6" },
  "cdn->Apollo_Federation_Gateway":    { label: "origin pull", bidir: false, color: "#8b5cf6" },
  "REST_API_Gateway->load_balancer":   { label: "route", bidir: false, color: "#f97316" },
  "gRPC_API_Gateway->load_balancer":   { label: "route", bidir: false, color: "#f97316" },
  "Apollo_Federation_Gateway->load_balancer": { label: "route", bidir: false, color: "#f97316" },
  "REST_API_Gateway->Service_Mesh_Istio": { label: "mesh", bidir: false, color: "#8b5cf6" },
  "Service_Mesh_Istio->load_balancer": { label: "l4 lb", bidir: false, color: "#f97316" },
  "load_balancer->auth_service":       { label: "JWT auth", bidir: true,  color: "#10b981" },
  "load_balancer->user_service":       { label: "routes", bidir: true,  color: "#10b981" },
  "load_balancer->feed_service":       { label: "routes", bidir: true,  color: "#10b981" },
  "load_balancer->chat_service":       { label: "WS upgrade", bidir: true,  color: "#10b981" },
  "load_balancer->media_service":      { label: "upload", bidir: true,  color: "#10b981" },
  "load_balancer->notification_service": { label: "push", bidir: true, color: "#10b981" },
  "auth_service->SQL_DB":              { label: "users/tokens", bidir: true,  color: "#60a5fa" },
  "auth_service->NoSQL_DB":            { label: "sessions", bidir: true,  color: "#60a5fa" },
  "auth_service->cache":               { label: "token blacklist", bidir: true,  color: "#ef4444" },
  "user_service->SQL_DB":              { label: "write", bidir: false, color: "#60a5fa" },
  "user_service->read_replica":        { label: "read", bidir: false, color: "#60a5fa" },
  "user_service->cache":               { label: "profile cache", bidir: true,  color: "#ef4444" },
  "feed_service->SQL_DB":              { label: "posts write", bidir: false, color: "#60a5fa" },
  "feed_service->read_replica":        { label: "feed read", bidir: false, color: "#60a5fa" },
  "feed_service->cache":               { label: "hot posts", bidir: true,  color: "#ef4444" },
  "feed_service->NoSQL_DB":            { label: "graph", bidir: true,  color: "#60a5fa" },
  "chat_service->NoSQL_DB":            { label: "messages", bidir: true,  color: "#60a5fa" },
  "chat_service->cache":               { label: "presence", bidir: true,  color: "#ef4444" },
  "media_service->NoSQL_DB":           { label: "metadata", bidir: true,  color: "#60a5fa" },
  "notification_service->cache":       { label: "dedup", bidir: true,  color: "#ef4444" },
  "feed_service->Event_Store_Kafka":   { label: "publish", bidir: false, color: "#f59e0b" },
  "chat_service->Event_Store_Kafka":   { label: "events", bidir: false, color: "#f59e0b" },
  "media_service->Event_Store_Kafka":  { label: "jobs", bidir: false, color: "#f59e0b" },
  "Event_Store_Kafka->notification_service": { label: "consume", bidir: false, color: "#f59e0b" },
  "Event_Store_Kafka->worker_services":{ label: "tasks", bidir: false, color: "#f59e0b" },
  "read_replica->SQL_DB":              { label: "replication", bidir: false, color: "#60a5fa" },
};

function getEdgeMeta(s, t) {
  return EDGE_META[`${s}->${t}`] || { label: "", bidir: false, color: "#52525b" };
}

// ── Custom floating edge with bidirectional markers ──
function ArchEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd, markerStart, style }) {
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  return (
    <>
      <BaseEdge path={path} markerEnd={markerEnd} markerStart={data?.bidir ? markerStart : undefined} style={style} />
      {data?.label && (
        <EdgeLabelRenderer>
          <div style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
            zIndex: 9999,
            background: "#09090b",
            color: data.color || "#a1a1aa",
            fontSize: 9,
            fontFamily: "monospace",
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: 4,
            border: `1px solid ${data.color || "#27272a"}`,
            whiteSpace: "nowrap",
            letterSpacing: "0.3px",
            boxShadow: `0 0 8px ${data.color}33`,
            textTransform: "uppercase",
          }}>
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const edgeTypes = { arch: ArchEdge };

// ── Custom 3D-style node ──
const ArchNode = ({ data, selected }) => {
  const layerKey = resolveLayer(data.nodeId, data.layer);
  const cfg = LAYER_CONFIG[layerKey] || LAYER_CONFIG.service;
  const icon = NODE_ICONS[data.nodeId] || cfg.icon;
  const isSelected = selected;

  return (
    <div style={{
      background: cfg.bg,
      border: `1.5px solid ${isSelected ? "#fff" : cfg.border}`,
      borderRadius: 14,
      padding: "10px 14px 12px",
      minWidth: 120,
      maxWidth: 160,
      cursor: "pointer",
      transition: "all 0.18s ease",
      boxShadow: isSelected
        ? `0 0 0 2px #fff, 0 0 24px ${cfg.glow}99, 0 8px 32px rgba(0,0,0,0.7)`
        : `0 0 12px ${cfg.glow}40, 0 4px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
      position: "relative",
      transform: isSelected ? "translateY(-2px) scale(1.03)" : "none",
    }}>
      {/* Top left layer badge */}
      <div style={{
        position: "absolute", top: -10, left: 8,
        background: cfg.badgeColor, color: "#000",
        fontSize: 8, fontWeight: 800, padding: "2px 6px", borderRadius: 4,
        letterSpacing: "0.8px", fontFamily: "monospace",
        boxShadow: `0 2px 6px ${cfg.glow}66`
      }}>
        {cfg.badge}
      </div>

      <Handle type="target" position={Position.Left}
        style={{ background: cfg.glow, width: 9, height: 9, border: "2px solid #000", borderRadius: "50%", left: -6, boxShadow: `0 0 6px ${cfg.glow}` }} />

      {/* Icon */}
      <div style={{ fontSize: 26, lineHeight: 1, marginTop: 8, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}>
        {icon}
      </div>

      {/* Name */}
      <div style={{
        fontSize: 11, fontWeight: 700, color: "#f4f4f5",
        textAlign: "center", lineHeight: 1.3, fontFamily: "'Inter', sans-serif",
        letterSpacing: "0.1px",
      }}>
        {data.label}
      </div>

      {/* Subtle bottom glow bar */}
      <div style={{
        position: "absolute", bottom: 0, left: "15%", right: "15%",
        height: 2, borderRadius: 2,
        background: `linear-gradient(90deg, transparent, ${cfg.glow}, transparent)`,
        opacity: 0.7,
      }} />

      <Handle type="source" position={Position.Right}
        style={{ background: cfg.glow, width: 9, height: 9, border: "2px solid #000", borderRadius: "50%", right: -6, boxShadow: `0 0 6px ${cfg.glow}` }} />
    </div>
  );
};

const nodeTypes = { arch: ArchNode };

// ── Dagre auto layout ──
function autoLayout(nodes, edges) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", ranksep: 160, nodesep: 55, marginx: 40, marginy: 40 });
  nodes.forEach(n => g.setNode(n.id, { width: 175, height: 95 }));
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map(n => {
    const p = g.node(n.id);
    return { ...n, position: { x: p.x - 87, y: p.y - 47 }, targetPosition: Position.Left, sourcePosition: Position.Right };
  });
}

// ── MiniMap node color ──
function minimapColor(node) {
  const layerKey = resolveLayer(node.id, node.data?.layer);
  return LAYER_CONFIG[layerKey]?.glow || "#52525b";
}

export default function ArchitectureDiagram({ architectureData, onNodeSelect }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [built, setBuilt] = useState(false);

  useEffect(() => {
    if (!architectureData) return;

    const rawNodes = architectureData.nodes.map(n => ({
      id: n.id, type: "arch",
      data: { label: n.label, layer: n.layer, nodeId: n.id },
      position: { x: 0, y: 0 },
    }));

    const rawEdges = architectureData.edges.map(([s, t], i) => {
      const meta = getEdgeMeta(s, t);
      return {
        id: `e${i}-${s}-${t}`,
        source: s, target: t,
        type: "arch",
        animated: true,
        style: {
          stroke: meta.color,
          strokeWidth: 1.8,
          strokeDasharray: meta.bidir ? "none" : "6 3",
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: meta.color,
          width: 14, height: 14,
        },
        markerStart: meta.bidir ? {
          type: MarkerType.ArrowClosed,
          color: meta.color,
          width: 14, height: 14,
        } : undefined,
        data: { label: meta.label, bidir: meta.bidir, color: meta.color }
      };
    });

    const laid = autoLayout(rawNodes, rawEdges);
    setNodes(laid);
    setEdges(rawEdges);
    setBuilt(true);
  }, [architectureData]);

  const onNodesChange = useCallback(c => setNodes(n => applyNodeChanges(c, n)), []);
  const onEdgesChange = useCallback(c => setEdges(e => applyEdgeChanges(c, e)), []);
  const onNodeClick = useCallback((_, node) => {
    if (onNodeSelect) onNodeSelect(node.id, node.data);
  }, [onNodeSelect]);

  if (!built) return null;

  return (
    <div style={{ width: "100%", height: "100%", background: "#030303", position: "relative" }}>
      {/* Legend bar */}
      <div style={{
        position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
        zIndex: 10, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center",
        background: "rgba(0,0,0,0.85)", border: "1px solid #27272a",
        borderRadius: 10, padding: "6px 14px",
        backdropFilter: "blur(8px)",
      }}>
        {Object.entries(LAYER_CONFIG).map(([key, cfg]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.glow, boxShadow: `0 0 4px ${cfg.glow}` }} />
            <span style={{ fontSize: 9, color: "#a1a1aa", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {key}
            </span>
          </div>
        ))}
      </div>

      {/* Edge legend */}
      <div style={{
        position: "absolute", top: 12, right: 12, zIndex: 10,
        background: "rgba(0,0,0,0.85)", border: "1px solid #27272a",
        borderRadius: 10, padding: "8px 12px",
        backdropFilter: "blur(8px)",
      }}>
        <div style={{ fontSize: 9, color: "#71717a", fontFamily: "monospace", marginBottom: 6, textTransform: "uppercase", letterSpacing: "1px" }}>CONNECTIONS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width={40} height={8}><line x1={0} y1={4} x2={40} y2={4} stroke="#52525b" strokeWidth={1.5} strokeDasharray="6 3" /></svg>
            <span style={{ fontSize: 9, color: "#a1a1aa", fontFamily: "monospace" }}>one-way</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width={40} height={8}>
              <defs><marker id="a" markerWidth={4} markerHeight={4} refX={2} refY={2} orient="auto"><polygon points="0 0 4 2 0 4" fill="#10b981"/></marker>
              <marker id="b" markerWidth={4} markerHeight={4} refX={2} refY={2} orient="auto-start-reverse"><polygon points="0 0 4 2 0 4" fill="#10b981"/></marker></defs>
              <line x1={0} y1={4} x2={40} y2={4} stroke="#10b981" strokeWidth={1.5} markerEnd="url(#a)" markerStart="url(#b)" />
            </svg>
            <span style={{ fontSize: 9, color: "#a1a1aa", fontFamily: "monospace" }}>bidirectional</span>
          </div>
        </div>
      </div>

      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
        minZoom={0.3}
        maxZoom={2}
        style={{ background: "transparent" }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1a1a1a" gap={28} size={0.8} variant="dots" />
        <Controls style={{
          background: "#0a0a0a", border: "1px solid #27272a",
          borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
        }} />
        <MiniMap
          nodeColor={minimapColor}
          maskColor="rgba(0,0,0,0.8)"
          style={{
            background: "#09090b", border: "1px solid #27272a",
            borderRadius: 8, bottom: 50
          }}
        />
      </ReactFlow>
    </div>
  );
}
