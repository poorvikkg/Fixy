// ===============================
// Improve Existing System Engine
// ===============================

// Analyzes user-described architecture and generates findings + improvements

function analyzeArchitecture(input) {
  const issues = [];
  const improvements = [];
  const tradeoffs = [];

  const desc = (input.existingHLD || "").toLowerCase();
  const pain = (input.improvementsWanted || "").toLowerCase();
  const scale = input.currentScale || "medium";
  const stack = (input.techStack || "").toLowerCase();

  // ── Scale / DB issues ──
  if (!desc.includes("replica") && !desc.includes("read replica")) {
    issues.push({
      severity: "critical",
      area: "Database",
      title: "No Read Replicas Detected",
      description: "Your architecture has no read replica strategy. At scale, all reads and writes hit the same primary DB instance, creating a severe bottleneck.",
      fix: "Add read replicas (AWS RDS Multi-AZ, Postgres streaming replication). Route all SELECT queries to replicas using a connection proxy like RDS Proxy or PgBouncer."
    });
  }

  if (!desc.includes("cache") && !desc.includes("redis") && !desc.includes("memcache")) {
    issues.push({
      severity: "critical",
      area: "Performance",
      title: "No Caching Layer",
      description: "Every request hits the database directly. This is unsustainable even at 10,000 DAU for read-heavy endpoints like feed, user profiles, or product listings.",
      fix: "Implement a Cache-Aside pattern using Redis. Cache frequently-read objects with a TTL. Invalidate cache on writes using event-driven hooks."
    });
  }

  if (!desc.includes("queue") && !desc.includes("kafka") && !desc.includes("rabbitmq") && !desc.includes("sqs")) {
    issues.push({
      severity: "high",
      area: "Reliability",
      title: "No Async Message Queue",
      description: "All operations are synchronous. If a downstream service (email, notification, media processing) is slow or fails, it blocks the user's request and degrades latency.",
      fix: "Decouple heavy operations using a message queue (AWS SQS, Kafka, or RabbitMQ). Use workers to process tasks asynchronously with retry + DLQ."
    });
  }

  if (!desc.includes("load balancer") && !desc.includes("lb") && !desc.includes("nginx") && !desc.includes("alb")) {
    issues.push({
      severity: "high",
      area: "Scalability",
      title: "No Load Balancer",
      description: "A single server handling all traffic is a single point of failure (SPOF). One crash takes down your entire system.",
      fix: "Add a Layer-7 load balancer (AWS ALB, GCP Cloud Load Balancing, or Nginx). Distribute traffic across multiple stateless service instances behind the LB."
    });
  }

  if (!desc.includes("cdn")) {
    issues.push({
      severity: "medium",
      area: "Performance",
      title: "No CDN for Static Assets",
      description: "Serving images, JS bundles, and media from your origin server adds unnecessary load and increases global latency by 200-500ms.",
      fix: "Push all static assets to a CDN (Cloudflare, AWS CloudFront, or Fastly). Use cache-control headers. For user-generated media, use pre-signed S3 URLs served via CloudFront."
    });
  }

  if (!desc.includes("circuit breaker") && !desc.includes("retry") && !desc.includes("timeout")) {
    issues.push({
      severity: "high",
      area: "Resiliency",
      title: "No Circuit Breaker / Retry Strategy",
      description: "Cascading failures are a real risk. If Service A calls Service B which calls Service C, one slow response propagates and crashes all three.",
      fix: "Implement the Circuit Breaker pattern (Resilience4j, Istio, or AWS App Mesh). Add timeouts on all outgoing calls. Use exponential backoff with jitter for retries."
    });
  }

  if (!desc.includes("monitoring") && !desc.includes("grafana") && !desc.includes("datadog") && !desc.includes("prometheus")) {
    issues.push({
      severity: "medium",
      area: "Observability",
      title: "No Observability Stack",
      description: "Without metrics, logs, and traces, you are flying blind. When production breaks, you have no way to find the root cause quickly.",
      fix: "Implement the three pillars of observability: Metrics (Prometheus + Grafana), Logs (ELK Stack or Loki), Traces (Jaeger or OpenTelemetry). Set up alerting for p99 latency and error rate SLAs."
    });
  }

  if (!desc.includes("auth") && !desc.includes("jwt") && !desc.includes("oauth")) {
    issues.push({
      severity: "critical",
      area: "Security",
      title: "No Auth Strategy Mentioned",
      description: "Authentication and authorization are not visible in your architecture description. This is a critical security gap.",
      fix: "Implement JWT-based authentication with access + refresh token rotation. Use an API Gateway or Auth Service to centralize auth. Consider OAuth2 / OIDC for third-party logins."
    });
  }

  if (pain.includes("slow") || pain.includes("latency")) {
    improvements.push({
      area: "Latency",
      title: "Reduce p99 Latency",
      steps: [
        "Profile DB queries — add missing indexes on foreign keys and filter columns",
        "Move cache hot paths to in-process memory (LRU cache) before Redis",
        "Reduce payload size — use field projection in DB queries, avoid SELECT *",
        "Enable HTTP/2 or gRPC for internal service-to-service calls",
        "Use connection pooling (PgBouncer, HikariCP) to reduce DB connection overhead"
      ]
    });
  }

  if (pain.includes("scale") || pain.includes("traffic") || pain.includes("users")) {
    improvements.push({
      area: "Scaling",
      title: "Horizontal Scaling Strategy",
      steps: [
        "Make all services stateless — move session state to Redis",
        "Implement database connection pooling to handle more concurrent connections",
        "Add read replicas and route read traffic using a proxy",
        "Shard the database by user_id or tenant_id for large datasets",
        "Set up auto-scaling groups (AWS ASG / K8s HPA) based on CPU/RPS thresholds"
      ]
    });
  }

  if (pain.includes("cost") || pain.includes("expensive") || pain.includes("bill")) {
    improvements.push({
      area: "Cost Optimization",
      title: "Reduce Infrastructure Cost",
      steps: [
        "Move infrequent workloads (reports, batch jobs) to Spot/Preemptible instances",
        "Use S3 Intelligent-Tiering for cold media storage",
        "Right-size over-provisioned EC2/GCE instances using CloudWatch/Cloud Monitoring",
        "Cache aggressively to reduce DB instance size and query count",
        "Move to serverless functions (AWS Lambda) for low-traffic endpoints"
      ]
    });
  }

  if (pain.includes("outage") || pain.includes("downtime") || pain.includes("fail")) {
    improvements.push({
      area: "High Availability",
      title: "Eliminate Single Points of Failure",
      steps: [
        "Ensure every tier (LB, service, DB) has at least 2 instances across 2 AZs",
        "Implement health checks and automatic instance replacement",
        "Set up a DB failover strategy (RDS Multi-AZ, Postgres Patroni)",
        "Use Route53 / Cloud DNS health checks for active-passive DNS failover",
        "Define and test your Recovery Time Objective (RTO) and Recovery Point Objective (RPO)"
      ]
    });
  }

  // Architecture improvements
  improvements.push({
    area: "Data Architecture",
    title: "Recommended Data Flow Improvements",
    steps: [
      "Introduce CQRS: separate Write Model (normalized, transactional) from Read Model (denormalized, fast)",
      "Index heavily-queried columns (created_at, user_id, status)",
      "Archive old records to cold storage periodically using a background job",
      "Use soft deletes (deleted_at flag) instead of hard deletes for auditability"
    ]
  });

  return { issues, improvements };
}

function generateImprovedArchitecture(input, analysis) {
  // Build a highly detailed, enterprise-grade target architecture
  const nodes = [];
  const edges = [];

  const desc = (input.existingHLD || "").toLowerCase();
  const pain = (input.improvementsWanted || "").toLowerCase();
  const scale = input.currentScale || "medium";
  const features = input.features || [];

  // Edge Layer
  nodes.push({ id: "client", label: "Client Applications (Web/Mobile)", layer: "client" });
  nodes.push({ id: "cdn", label: "Global CDN (Cloudflare/CloudFront)", layer: "edge" });
  nodes.push({ id: "waf", label: "WAF & Shield", layer: "edge" });
  nodes.push({ id: "route53", label: "Global DNS (Route53)", layer: "edge" });

  // Traffic / Gateway Layer
  nodes.push({ id: "alb", label: "Application Load Balancer", layer: "traffic" });
  nodes.push({ id: "api_gateway", label: "API Gateway (Rate Limiting/Auth)", layer: "traffic" });

  // Service Layer (Microservices)
  nodes.push({ id: "auth_svc", label: "Identity & Auth Service (OIDC)", layer: "service" });
  nodes.push({ id: "core_svc", label: "Core Business Service (K8s Pods)", layer: "service" });
  
  if (desc.includes("feed") || pain.includes("feed") || features.includes("feed")) {
    nodes.push({ id: "feed_svc", label: "Feed Generation Service (CQRS)", layer: "service" });
  }
  if (desc.includes("chat") || pain.includes("chat") || features.includes("chat")) {
    nodes.push({ id: "chat_svc", label: "Real-time Chat Service (WebSockets)", layer: "service" });
  }
  nodes.push({ id: "notify_svc", label: "Push Notification Service", layer: "service" });
  nodes.push({ id: "search_svc", label: "Search Service (Elasticsearch)", layer: "service" });

  // Data / State Layer
  nodes.push({ id: "cache_cluster", label: "Redis Cluster (LRU/Session/PubSub)", layer: "data" });
  nodes.push({ id: "db_primary", label: "Primary DB (Write-Heavy)", layer: "data" });
  nodes.push({ id: "db_replica", label: "Read Replicas (Auto-scaling)", layer: "data" });
  nodes.push({ id: "object_store", label: "Object Storage (S3)", layer: "data" });

  // Async / Background Layer
  nodes.push({ id: "event_bus", label: "Event Bus / Kafka Cluster", layer: "async" });
  nodes.push({ id: "worker_nodes", label: "Background Worker Nodes", layer: "async" });
  nodes.push({ id: "data_warehouse", label: "Data Warehouse (Snowflake/BigQuery)", layer: "async" });

  // Observability
  nodes.push({ id: "observability", label: "Observability (Datadog/Prometheus)", layer: "async" });

  // Connect Edge
  edges.push(["client", "route53"], ["route53", "cdn"], ["cdn", "waf"], ["waf", "alb"], ["alb", "api_gateway"]);

  // Connect Gateway to Services
  edges.push(["api_gateway", "auth_svc"], ["api_gateway", "core_svc"]);
  if (nodes.find(n => n.id === "feed_svc")) edges.push(["api_gateway", "feed_svc"]);
  if (nodes.find(n => n.id === "chat_svc")) edges.push(["api_gateway", "chat_svc"]);
  edges.push(["api_gateway", "search_svc"]);

  // Connect Services to Data / Cache
  edges.push(["auth_svc", "db_primary"], ["auth_svc", "cache_cluster"]);
  edges.push(["core_svc", "db_primary"], ["core_svc", "db_replica"], ["core_svc", "cache_cluster"]);
  edges.push(["core_svc", "object_store"]);

  if (nodes.find(n => n.id === "feed_svc")) {
    edges.push(["feed_svc", "db_replica"], ["feed_svc", "cache_cluster"]);
  }
  if (nodes.find(n => n.id === "chat_svc")) {
    edges.push(["chat_svc", "cache_cluster"], ["chat_svc", "event_bus"]);
  }

  // Connect Search
  edges.push(["search_svc", "db_replica"]);

  // Async flows
  edges.push(["core_svc", "event_bus"], ["event_bus", "worker_nodes"], ["worker_nodes", "db_primary"]);
  edges.push(["event_bus", "notify_svc"]);
  edges.push(["db_replica", "data_warehouse"]); // CDC or batch sync

  // Observability touches everything (simplified here to just point from Gateway and Core)
  edges.push(["api_gateway", "observability"], ["core_svc", "observability"]);

  return { nodes, edges };
}

module.exports = { analyzeArchitecture, generateImprovedArchitecture };
