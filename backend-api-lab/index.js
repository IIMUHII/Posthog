import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { router } from "./routes.js";
import { posthog, trackError } from "./posthog.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode >= 400 ? "❌" : "✅";
    console.log(`${status} ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Static files
app.use(express.static(join(__dirname, "public")));

// API routes
app.use(router);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("🚨 Unhandled Error:", err.message);
  
  trackError(err.name || "UnhandledError", err.message, {
    errorType: "unhandled",
    stack: err.stack,
    url: req.url,
    method: req.method,
    requestId: req.requestId
  });

  res.status(500).json({
    success: false,
    error: {
      name: err.name || "Error",
      message: err.message || "Internal Server Error",
      requestId: req.requestId
    }
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 404,
      message: "Endpoint not found",
      path: req.url
    }
  });
});

const port = process.env.PORT || 5050;

app.listen(port, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║       PostHog Error Tracking PoC                      ║
╠═══════════════════════════════════════════════════════╣
║  🚀 Server running on port ${port}                       ║
║  📊 Dashboard: http://localhost:${port}                  ║
║  🔗 Health: http://localhost:${port}/health              ║
║                                                       ║
║  Error Categories:                                    ║
║  • HTTP Errors: /api/error/http/{code}               ║
║  • Runtime: /api/error/runtime/{type}                ║
║  • Async: /api/error/async/{type}                    ║
║  • Database: /api/error/database/{type}              ║
║  • Network: /api/error/network/{type}                ║
║  • Auth: /api/error/auth/{type}                      ║
║  • Business: /api/error/business/{type}              ║
║  • Resource: /api/error/resource/{type}              ║
║  • Validation: POST /api/error/validation            ║
║  • Random: /api/error/random                         ║
╚═══════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  await posthog.shutdown();
  process.exit(0);
});
