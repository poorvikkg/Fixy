function interpret(input) {
  const flags = {
    // scale
    isSmallScale: input.users < 10000,
    isMediumScale: input.users >= 10000 && input.users < 1000000,
    isLargeScale: input.users >= 1000000,

    // features
    needsChat: input.features.includes("chat"),
    needsMedia: input.features.includes("media"),
    needsFeed: input.features.includes("feed"),
    needsNotifications: input.features.includes("notifications"),

    // system behavior
    needsRealtime: input.realTime === true,
    isReadHeavy: input.readWriteRatio === "read-heavy",
    isWriteHeavy: input.readWriteRatio === "write-heavy",

    // deployment
    isGlobal: input.region === "global",
    isHighlyAvailable: input.availability === "high",

    // type-based flags
    isSocialApp: input.appType === "social",
    isEcommerce: input.appType === "ecommerce",
    isStreamingApp: input.appType === "streaming",

    // advanced config
    provider: input.cloudProvider,
    requiresCompliance: input.compliance !== "none",
    complianceType: input.compliance,
    isStrongConsistency: input.consistency === "strong",
    requiresLowLatency: input.latency === "low",
    isLowBudget: input.budget === "low",

    // FAANG level flags
    isActiveActive: input.drStrategy === "active-active",
    needsDistributedTracing: input.observability === "distributed",
    needsChaosEngineering: input.resiliency === "chaos",
    needsCircuitBreaker: input.resiliency === "circuit-breaker" || input.resiliency === "chaos",
    useGrpc: input.apiProtocol === "grpc",
    useGraphql: input.apiProtocol === "graphql",
    isEventSourced: input.dataArchitecture === "event-sourcing",
    isCqrs: input.dataArchitecture === "cqrs" || input.dataArchitecture === "event-sourcing"
  };

  return flags;
}

module.exports = { interpret };