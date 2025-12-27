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

export const trackEvent = (distinctId, event, properties = {}) => {
  if (!POSTHOG_KEY) return;
  
  posthog.capture({
    distinctId,
    event,
    properties: {
      ...properties,
      source: "backend-api",
      timestamp: new Date().toISOString()
    }
  });
};

export const identifyUser = (distinctId, properties = {}) => {
  if (!POSTHOG_KEY) return;
  
  posthog.identify({
    distinctId,
    properties
  });
};

process.on("beforeExit", async () => {
  await posthog.shutdown();
});
