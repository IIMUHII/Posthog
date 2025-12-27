import express from "express";
import { v4 as uuidv4 } from "uuid";
import { trackEvent, identifyUser } from "./posthog.js";

export const router = express.Router();

// Middleware لتتبع جميع الطلبات
router.use((req, res, next) => {
  req.requestId = uuidv4();
  req.startTime = Date.now();
  next();
});

// Health Check
router.get("/health", (req, res) => {
  trackEvent("system", "health_check", { requestId: req.requestId });
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Stats
router.get("/api/stats", (req, res) => {
  const stats = {
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    nodeVersion: process.version,
    platform: process.platform
  };
  
  trackEvent("system", "stats_viewed", { requestId: req.requestId });
  res.json(stats);
});

// Orders API
router.get("/api/orders", (req, res) => {
  const userId = req.query.user || `user_${uuidv4().slice(0, 8)}`;
  const count = parseInt(req.query.count) || 5;
  
  const orders = Array.from({ length: count }, (_, i) => ({
    id: uuidv4(),
    orderNumber: `ORD-${Date.now()}-${i + 1}`,
    amount: Math.floor(Math.random() * 1000) + 100,
    status: ["pending", "processing", "shipped", "delivered"][Math.floor(Math.random() * 4)],
    createdAt: new Date().toISOString()
  }));

  trackEvent(userId, "orders_viewed", { 
    count: orders.length,
    endpoint: "/api/orders",
    requestId: req.requestId
  });

  res.json({ success: true, userId, orders });
});

// Users API
router.get("/api/users", (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  
  const users = Array.from({ length: limit }, () => ({
    id: uuidv4(),
    name: `User ${Math.floor(Math.random() * 1000)}`,
    email: `user${Math.floor(Math.random() * 1000)}@example.com`,
    role: ["admin", "user", "moderator"][Math.floor(Math.random() * 3)],
    active: Math.random() > 0.3
  }));

  trackEvent("system", "users_listed", { 
    count: users.length,
    requestId: req.requestId
  });

  res.json({ success: true, users });
});

// Products API
router.get("/api/products", (req, res) => {
  const category = req.query.category || "all";
  const limit = parseInt(req.query.limit) || 8;
  
  const products = Array.from({ length: limit }, () => ({
    id: uuidv4(),
    name: `Product ${Math.floor(Math.random() * 1000)}`,
    price: Math.floor(Math.random() * 500) + 50,
    category: ["electronics", "clothing", "books", "home"][Math.floor(Math.random() * 4)],
    inStock: Math.random() > 0.2
  }));

  trackEvent("system", "products_viewed", { 
    category,
    count: products.length,
    requestId: req.requestId
  });

  res.json({ success: true, category, products });
});

// Slow Request Simulation
router.get("/api/slow", async (req, res) => {
  const ms = Math.min(Number(req.query.ms || 1000), 10000);
  const startTime = Date.now();
  
  await new Promise(r => setTimeout(r, ms));
  
  const actualDelay = Date.now() - startTime;

  trackEvent("system", "slow_request_completed", { 
    requestedDelay: ms,
    actualDelay,
    requestId: req.requestId
  });

  res.json({ 
    success: true,
    requestedDelay: ms, 
    actualDelay,
    message: `Request completed after ${actualDelay}ms`
  });
});

// Random Error Simulation
router.get("/api/error", (req, res, next) => {
  const errorType = req.query.type || "server";
  const errorTypes = {
    server: { status: 500, message: "Internal Server Error" },
    notfound: { status: 404, message: "Resource Not Found" },
    unauthorized: { status: 401, message: "Unauthorized Access" },
    forbidden: { status: 403, message: "Access Forbidden" },
    timeout: { status: 408, message: "Request Timeout" },
    validation: { status: 422, message: "Validation Error" }
  };

  const error = errorTypes[errorType] || errorTypes.server;

  trackEvent("system", "api_error_triggered", { 
    errorType,
    statusCode: error.status,
    message: error.message,
    requestId: req.requestId
  });

  res.status(error.status).json({ 
    success: false,
    error: error.message,
    type: errorType,
    requestId: req.requestId
  });
});

// User Registration Simulation
router.post("/api/register", express.json(), (req, res) => {
  const { name, email } = req.body || {};
  const userId = uuidv4();

  identifyUser(userId, { name, email, registeredAt: new Date().toISOString() });
  
  trackEvent(userId, "user_registered", { 
    name,
    email,
    requestId: req.requestId
  });

  res.json({ 
    success: true,
    userId,
    message: "User registered successfully"
  });
});

// Purchase Simulation
router.post("/api/purchase", express.json(), (req, res) => {
  const { userId, productId, amount } = req.body || {};
  const purchaseId = uuidv4();

  trackEvent(userId || "anonymous", "purchase_completed", { 
    purchaseId,
    productId,
    amount: amount || Math.floor(Math.random() * 500) + 50,
    currency: "SAR",
    requestId: req.requestId
  });

  res.json({ 
    success: true,
    purchaseId,
    message: "Purchase completed successfully"
  });
});

// Feature Flag Check (Simulation)
router.get("/api/feature/:flag", (req, res) => {
  const flag = req.params.flag;
  const userId = req.query.user || "anonymous";
  const enabled = Math.random() > 0.5;

  trackEvent(userId, "feature_flag_checked", { 
    flag,
    enabled,
    requestId: req.requestId
  });

  res.json({ 
    success: true,
    flag,
    enabled,
    userId
  });
});

// Batch Events
router.post("/api/batch-events", express.json(), (req, res) => {
  const { count = 10, eventType = "batch_event" } = req.body || {};
  const batchId = uuidv4();
  
  for (let i = 0; i < Math.min(count, 100); i++) {
    trackEvent(`user_${i}`, eventType, { 
      batchId,
      index: i,
      requestId: req.requestId
    });
  }

  res.json({ 
    success: true,
    batchId,
    eventsCreated: Math.min(count, 100),
    message: `${Math.min(count, 100)} events tracked`
  });
});
