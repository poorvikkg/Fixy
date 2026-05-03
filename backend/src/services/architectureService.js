// ===============================
// Architecture Generator Service — v2 (FAANG-aware)
// ===============================

const LABELS = {
  // infra
  waf_security_layer: "WAF / Security",
  gRPC_API_Gateway: "gRPC Gateway",
  Apollo_Federation_Gateway: "Apollo GraphQL Gateway",
  REST_API_Gateway: "REST API Gateway",
  Service_Mesh_Istio: "Istio Service Mesh",
  cdn: "CDN",
  edge_compute: "Edge Compute",
  load_balancer: "Load Balancer",
  auto_scaling: "Auto Scaling",
  // services
  auth_service: "Auth Service",
  user_service: "User Service",
  audit_logging_service: "Audit Log Service",
  OpenTelemetry_Collector: "OpenTelemetry Collector",
  Chaos_Mesh_Agent: "Chaos Mesh Agent",
  feed_service: "Feed Service",
  chat_service: "Chat Service",
  media_service: "Media Service",
  notification_service: "Notification Service",
  // data
  Write_Model_DB: "Write Model DB (CQRS)",
  Read_Model_DB: "Read Model DB (CQRS)",
  NewSQL_Distributed_DB: "NewSQL Distributed DB",
  SQL_DB_Strict: "SQL DB (Strict)",
  NoSQL_DB: "NoSQL DB",
  SQL_DB: "SQL DB",
  Redis_Cluster_Ultra_Fast: "Redis Cluster (Ultra-Fast)",
  cache: "Cache (Redis)",
  read_replica: "Read Replica",
  sharding: "DB Sharding",
  Cross_Region_Active_Replication: "Cross-Region Replication",
  KMS_Encryption_Service: "KMS Encryption",
  // async
  Event_Store_Kafka: "Event Store (Kafka)",
  message_queue: "Message Queue",
  worker_services: "Worker Services",
  event_streaming: "Event Streaming",
};

function label(id) {
  return LABELS[id] || id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function generateArchitecture(decisions) {
  const nodes = [];
  const edges = [];
  const infra = decisions.infrastructure;

  // ── Client ──
  nodes.push({ id: "client", label: "Client", layer: "client" });

  // ── Security (WAF) before CDN ──
  if (infra.includes("waf_security_layer")) {
    nodes.push({ id: "waf_security_layer", label: label("waf_security_layer"), layer: "edge" });
    edges.push(["client", "waf_security_layer"]);
  }

  // ── CDN ──
  if (infra.includes("cdn")) {
    nodes.push({ id: "cdn", label: label("cdn"), layer: "edge" });
    const prev = infra.includes("waf_security_layer") ? "waf_security_layer" : "client";
    edges.push([prev, "cdn"]);
  }

  // ── Edge Compute ──
  if (infra.includes("edge_compute")) {
    nodes.push({ id: "edge_compute", label: label("edge_compute"), layer: "edge" });
    const prev = infra.includes("cdn") ? "cdn" : "client";
    edges.push([prev, "edge_compute"]);
  }

  // ── API Gateway (REST/gRPC/GraphQL) ──
  const gatewayId = infra.find(i =>
    ["gRPC_API_Gateway", "Apollo_Federation_Gateway", "REST_API_Gateway"].includes(i)
  ) || "REST_API_Gateway";

  nodes.push({ id: gatewayId, label: label(gatewayId), layer: "edge" });
  const prevGateway = infra.includes("edge_compute")
    ? "edge_compute"
    : infra.includes("cdn")
    ? "cdn"
    : infra.includes("waf_security_layer")
    ? "waf_security_layer"
    : "client";
  edges.push([prevGateway, gatewayId]);

  // ── Service Mesh ──
  if (infra.includes("Service_Mesh_Istio")) {
    nodes.push({ id: "Service_Mesh_Istio", label: label("Service_Mesh_Istio"), layer: "traffic" });
    edges.push([gatewayId, "Service_Mesh_Istio"]);
  }

  // ── Load Balancer ──
  if (infra.includes("load_balancer")) {
    nodes.push({ id: "lb", label: label("load_balancer"), layer: "traffic" });
    const prevLB = infra.includes("Service_Mesh_Istio") ? "Service_Mesh_Istio" : gatewayId;
    edges.push([prevLB, "lb"]);
  }

  const prevService = infra.includes("load_balancer")
    ? "lb"
    : infra.includes("Service_Mesh_Istio")
    ? "Service_Mesh_Istio"
    : gatewayId;

  // ── Services ──
  decisions.services.forEach(svc => {
    nodes.push({ id: svc, label: label(svc), layer: "service" });
    edges.push([prevService, svc]);
  });

  // ── Data Layer ──
  decisions.dataLayer.forEach(d => {
    nodes.push({ id: d, label: label(d), layer: "data" });
    decisions.services.forEach(svc => edges.push([svc, d]));
  });

  // ── Async Layer ──
  decisions.asyncLayer.forEach(a => {
    nodes.push({ id: a, label: label(a), layer: "async" });
    decisions.services.forEach(svc => edges.push([svc, a]));
  });

  return { nodes, edges };
}

module.exports = { generateArchitecture };