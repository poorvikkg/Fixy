// ===============================
// Service Expansion — LLD Generator v2 (FAANG-aware)
// ===============================

function expandService(serviceName, decisions, flags) {
  const lld = {
    service: serviceName,
    layers: {}
  };

  // ── API Layer ──
  lld.layers.api = flags && flags.useGrpc
    ? ["gRPC Service Definition (.proto)", "Unary + Streaming RPC Handlers", "Interceptors (Auth, Logging, Tracing)"]
    : flags && flags.useGraphql
    ? ["GraphQL Resolver", "DataLoader (N+1 prevention)", "Schema Validation"]
    : ["REST Controller", "Request/Response DTO", "Input Validation Middleware"];

  // ── Service Layer ──
  lld.layers.service = ["Business Logic Layer", "Domain Rules Engine", "Error Handling Strategy"];

  if (flags && flags.isCqrs) {
    lld.layers.service.push("Command Handler", "Query Handler");
  }

  // ── Repository Layer ──
  lld.layers.repository = ["Repository Interface (Port)", "Repository Implementation (Adapter)"];

  if (flags && flags.isEventSourced) {
    lld.layers.repository.push("Event Store Writer", "Snapshot Manager");
  } else {
    lld.layers.repository.push("DB Query Builder", "Transaction Manager");
  }

  // ── Cache Layer ──
  if (decisions.dataLayer.some(d => d.includes("cache") || d.includes("Redis"))) {
    lld.layers.cache = [
      "Cache-Aside Strategy",
      "TTL Management",
      "Cache Invalidation on Write",
      flags && flags.requiresLowLatency ? "Write-Through Cache (ultra-fast path)" : "Read Cache Warmer"
    ];
  }

  // ── Async / Queue Layer ──
  if (decisions.asyncLayer.length > 0) {
    lld.layers.async = [
      flags && flags.isEventSourced ? "Kafka Event Publisher" : "Queue Producer",
      "Dead Letter Queue (DLQ) Handler",
      "Retry Policy (Exponential Backoff)",
      "Idempotency Key Management"
    ];
  }

  // ── Observability ──
  lld.layers.observability = ["Structured JSON Logging (log levels)", "Health Check Endpoint (/health, /ready)"];
  if (flags && flags.needsDistributedTracing) {
    lld.layers.observability.push("OpenTelemetry Span Tracer", "Baggage Propagation", "Trace Sampling (1%)");
  } else {
    lld.layers.observability.push("Prometheus Metrics Exporter");
  }

  // ── Resiliency ──
  lld.layers.resiliency = ["Retry with Jitter", "Timeout Enforcement"];
  if (flags && flags.needsCircuitBreaker) {
    lld.layers.resiliency.push("Circuit Breaker (Istio/Resilience4j)", "Bulkhead Pattern");
  }

  // ── Service-specific LLD ──
  if (serviceName === "chat_service") {
    lld.layers.realtime = [
      "WebSocket Connection Manager",
      "Room/Channel Registry",
      "Message Fan-out Engine",
      "Presence Tracking (Online/Offline)",
      "Message Delivery Acknowledgement"
    ];
  }

  if (serviceName === "media_service") {
    lld.layers.media = [
      "Multipart Upload Controller",
      "File Type Validator",
      "CDN Upload Handler (S3/GCS)",
      "Thumbnail Generator (async worker)",
      "Virus Scanner Hook"
    ];
  }

  if (serviceName === "auth_service") {
    lld.layers.auth = [
      "JWT Token Issuer",
      "Refresh Token Rotation",
      "PKCE OAuth2 Flow",
      "Rate Limiter (per IP/user)",
      flags && flags.requiresCompliance ? "MFA Enforcer (TOTP/SMS)" : "Optional MFA"
    ];
  }

  if (serviceName === "notification_service") {
    lld.layers.notification = [
      "Push Notification Channel (FCM/APNs)",
      "Email Channel (SES/SendGrid)",
      "Preference Engine (Do Not Disturb)",
      "Notification Deduplication"
    ];
  }

  if (serviceName === "feed_service") {
    lld.layers.feed = [
      "Fan-out on Write (Push Model)",
      "Fan-out on Read (Pull Model for large accounts)",
      "Ranking Algorithm Caller",
      "Pagination Cursor Manager"
    ];
  }

  // Flatten for backward compatibility (internalStructure array)
  lld.internalStructure = Object.entries(lld.layers).flatMap(([layer, items]) =>
    [`── ${layer.toUpperCase()} ──`, ...items]
  );

  return lld;
}

function generateServiceExpansion(decisions, flags) {
  return {
    services: decisions.services.map(svc => expandService(svc, decisions, flags))
  };
}

module.exports = { generateServiceExpansion };