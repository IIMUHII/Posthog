import { PostHog } from "posthog-node";

export const posthog = new PostHog(process.env.POSTHOG_PROJECT_KEY, {
  host: process.env.POSTHOG_HOST
});
