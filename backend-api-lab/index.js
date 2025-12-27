import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { router } from "./routes.js";
import { posthog } from "./posthog.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS للتطوير
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
    console.log(`${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Static files
app.use(express.static(join(__dirname, "public")));

// API routes
app.use(router);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  
  posthog.capture({
    distinctId: "system",
    event: "server_error",
    properties: {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method
    }
  });

  res.status(500).json({
    success: false,
    error: err.message || "Internal Server Error"
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found"
  });
});

const port = process.env.PORT || 5050;

app.listen(port, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║     PostHog PoC Server                       ║
╠══════════════════════════════════════════════╣
║  🚀 Server running on port ${port}              ║
║  📊 Dashboard: http://localhost:${port}         ║
║  🔗 Health: http://localhost:${port}/health     ║
╚══════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  await posthog.shutdown();
  process.exit(0);
});
