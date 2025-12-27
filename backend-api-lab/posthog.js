import { PostHog } from "posthog-node";

const POSTHOG_KEY = process.env.POSTHOG_PROJECT_KEY || "";
const POSTHOG_HOST = process.env.POSTHOG_HOST || "https://app.posthog.com";

if (!POSTHOG_KEY) {
  console.warn("⚠️  POSTHOG_PROJECT_KEY not set - events will not be tracked");
}

export const posthog = new PostHog(POSTHOG_KEY, {
  host: POSTHOG_HOST,
  flushAt: 1,
  flushInterval: 0
});

// ═══════════════════════════════════════════════════════════════
// Event Tracking
// ═══════════════════════════════════════════════════════════════

export const trackEvent = (distinctId, event, properties = {}) => {
  if (!POSTHOG_KEY) return;
  
  posthog.capture({
    distinctId,
    event,
    properties: {
      ...properties,
      $source: "backend-api",
      $timestamp: new Date().toISOString(),
      $lib: "posthog-node",
      environment: process.env.NODE_ENV || "development"
    }
  });
  
  console.log(`📊 Event: ${event} | User: ${distinctId}`);
};

// ═══════════════════════════════════════════════════════════════
// Error Tracking - الأهم للـ PoC
// ═══════════════════════════════════════════════════════════════

export const trackError = (errorName, errorMessage, properties = {}) => {
  if (!POSTHOG_KEY) return;
  
  const errorData = {
    // Error Details
    $exception_type: errorName,
    $exception_message: errorMessage,
    $exception_source: "backend",
    
    // Standard PostHog Exception Properties
    $exception_fingerprint: `${errorName}:${properties.errorType || 'unknown'}:${properties.subType || 'unknown'}`,
    
    // Additional Context
    error_name: errorName,
    error_message: errorMessage,
    error_type: properties.errorType || "unknown",
    error_subtype: properties.subType || null,
    error_code: properties.errorCode || null,
    error_stack: properties.stack || null,
    
    // Request Context
    request_id: properties.requestId,
    request_url: properties.url,
    request_method: properties.method,
    
    // Environment
    $source: "backend-api",
    $timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    node_version: process.version,
    
    // Additional properties
    ...properties
  };

  // Track as exception event (PostHog Error Tracking)
  posthog.capture({
    distinctId: properties.userId || "system",
    event: "$exception",
    properties: errorData
  });

  // Also track as custom error event for easier filtering
  posthog.capture({
    distinctId: properties.userId || "system",
    event: "error_occurred",
    properties: errorData
  });

  console.log(`🚨 Error: ${errorName} | ${errorMessage}`);
};

// ═══════════════════════════════════════════════════════════════
// User Identification
// ═══════════════════════════════════════════════════════════════

export const identifyUser = (distinctId, properties = {}) => {
  if (!POSTHOG_KEY) return;
  
  posthog.identify({
    distinctId,
    properties: {
      ...properties,
      $source: "backend-api",
      identified_at: new Date().toISOString()
    }
  });
  
  console.log(`👤 Identified: ${distinctId}`);
};

// ═══════════════════════════════════════════════════════════════
// Global Error Handlers
// ═══════════════════════════════════════════════════════════════

// Unhandled Promise Rejections
process.on("unhandledRejection", (reason, promise) => {
  trackError("UnhandledRejection", reason?.message || String(reason), {
    errorType: "unhandled",
    subType: "promise_rejection",
    stack: reason?.stack
  });
});

// Uncaught Exceptions
process.on("uncaughtException", (error) => {
  trackError("UncaughtException", error.message, {
    errorType: "unhandled",
    subType: "uncaught_exception",
    stack: error.stack
  });
});

// Graceful Shutdown
process.on("beforeExit", async () => {
  await posthog.shutdown();
});

process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  await posthog.shutdown();
  process.exit(0);
});
