import express from "express";
import { posthog } from "./posthog.js";

export const router = express.Router();

router.get("/health", (req, res) => res.json({ status: "ok" }));

router.get("/api/orders", (req, res) => {
  const userId = req.query.user || "anonymous";

  posthog.capture({
    distinctId: userId,
    event: "order_viewed",
    properties: { endpoint: "/api/orders" }
  });

  res.json({ orders: [1, 2, 3] });
});

router.get("/api/slow", async (req, res) => {
  const ms = Number(req.query.ms || 1000);
  await new Promise(r => setTimeout(r, ms));

  posthog.capture({
    distinctId: "system",
    event: "slow_request",
    properties: { ms }
  });

  res.json({ delay: ms });
});

router.get("/api/error", (req, res) => {
  posthog.capture({
    distinctId: "system",
    event: "api_error",
    properties: { type: "forced_error" }
  });

  throw new Error("Intentional API error");
});
