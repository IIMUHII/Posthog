import express from "express";
import { v4 as uuidv4 } from "uuid";
import { trackEvent, trackError, identifyUser } from "./posthog.js";

export const router = express.Router();

// Middleware لتتبع جميع الطلبات
router.use((req, res, next) => {
  req.requestId = uuidv4();
  req.startTime = Date.now();
  next();
});

// ═══════════════════════════════════════════════════════════════
// HEALTH & STATS
// ═══════════════════════════════════════════════════════════════

router.get("/health", (req, res) => {
  trackEvent("system", "health_check", { requestId: req.requestId });
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

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

// ═══════════════════════════════════════════════════════════════
// CRUD APIs
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// PERFORMANCE TESTING
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// ERROR SIMULATION - جميع أنواع الأخطاء
// ═══════════════════════════════════════════════════════════════

// 1. HTTP Status Errors
router.get("/api/error/http/:code", (req, res) => {
  const code = parseInt(req.params.code) || 500;
  const errorMessages = {
    400: { type: "Bad Request", message: "The request was malformed or invalid" },
    401: { type: "Unauthorized", message: "Authentication is required to access this resource" },
    403: { type: "Forbidden", message: "You don't have permission to access this resource" },
    404: { type: "Not Found", message: "The requested resource was not found" },
    405: { type: "Method Not Allowed", message: "This HTTP method is not supported for this endpoint" },
    408: { type: "Request Timeout", message: "The request took too long to process" },
    409: { type: "Conflict", message: "The request conflicts with the current state of the resource" },
    410: { type: "Gone", message: "The resource is no longer available" },
    422: { type: "Unprocessable Entity", message: "The request was well-formed but contains semantic errors" },
    429: { type: "Too Many Requests", message: "Rate limit exceeded. Please slow down" },
    500: { type: "Internal Server Error", message: "An unexpected error occurred on the server" },
    501: { type: "Not Implemented", message: "This feature is not yet implemented" },
    502: { type: "Bad Gateway", message: "Invalid response from upstream server" },
    503: { type: "Service Unavailable", message: "The service is temporarily unavailable" },
    504: { type: "Gateway Timeout", message: "Upstream server did not respond in time" }
  };

  const error = errorMessages[code] || errorMessages[500];
  
  trackError(`HTTP_${code}_ERROR`, error.message, {
    statusCode: code,
    errorType: error.type,
    requestId: req.requestId,
    url: req.originalUrl,
    method: req.method
  });

  res.status(code).json({
    success: false,
    error: {
      code,
      type: error.type,
      message: error.message,
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    }
  });
});

// 2. JavaScript Runtime Errors
router.get("/api/error/runtime/:type", (req, res, next) => {
  const errorType = req.params.type;
  
  try {
    switch (errorType) {
      case "reference":
        // ReferenceError - متغير غير معرف
        eval("nonExistentVariable.doSomething()");
        break;
        
      case "type":
        // TypeError - استخدام خاطئ للنوع
        const num = 42;
        num.toUpperCase();
        break;
        
      case "syntax":
        // SyntaxError - خطأ في الصياغة
        eval("const x = {");
        break;
        
      case "range":
        // RangeError - قيمة خارج النطاق
        const arr = new Array(-1);
        break;
        
      case "uri":
        // URIError - خطأ في URI
        decodeURIComponent("%");
        break;
        
      case "eval":
        // EvalError
        throw new EvalError("Eval error occurred");
        break;
        
      default:
        throw new Error(`Unknown runtime error type: ${errorType}`);
    }
  } catch (error) {
    trackError(error.name, error.message, {
      errorType: "runtime",
      subType: errorType,
      stack: error.stack,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      error: {
        name: error.name,
        type: errorType,
        message: error.message,
        stack: error.stack?.split("\n").slice(0, 5),
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 3. Async/Promise Errors
router.get("/api/error/async/:type", async (req, res) => {
  const errorType = req.params.type;
  
  try {
    switch (errorType) {
      case "rejected":
        // Promise Rejection
        await Promise.reject(new Error("Promise was explicitly rejected"));
        break;
        
      case "timeout":
        // Async Timeout
        await new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Async operation timed out")), 100);
        });
        break;
        
      case "chain":
        // Promise Chain Failure
        await Promise.resolve()
          .then(() => { throw new Error("Error in promise chain"); });
        break;
        
      case "all":
        // Promise.all Failure
        await Promise.all([
          Promise.resolve(1),
          Promise.reject(new Error("One promise in Promise.all failed")),
          Promise.resolve(3)
        ]);
        break;
        
      case "race":
        // Promise.race with rejection
        await Promise.race([
          new Promise((_, reject) => setTimeout(() => reject(new Error("Race lost with error")), 10)),
          new Promise(resolve => setTimeout(resolve, 1000))
        ]);
        break;
        
      default:
        throw new Error(`Unknown async error type: ${errorType}`);
    }
  } catch (error) {
    trackError("AsyncError", error.message, {
      errorType: "async",
      subType: errorType,
      stack: error.stack,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      error: {
        name: "AsyncError",
        type: errorType,
        message: error.message,
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 4. Database Simulation Errors
router.get("/api/error/database/:type", (req, res) => {
  const errorType = req.params.type;
  
  const dbErrors = {
    connection: {
      code: "ECONNREFUSED",
      message: "Failed to connect to database server at localhost:5432"
    },
    timeout: {
      code: "ETIMEDOUT",
      message: "Database query timed out after 30000ms"
    },
    duplicate: {
      code: "ER_DUP_ENTRY",
      message: "Duplicate entry 'user@email.com' for key 'users.email_unique'"
    },
    constraint: {
      code: "ER_NO_REFERENCED_ROW",
      message: "Foreign key constraint failed: order.user_id references users.id"
    },
    deadlock: {
      code: "ER_LOCK_DEADLOCK",
      message: "Deadlock detected when trying to acquire lock on table 'orders'"
    },
    syntax: {
      code: "ER_PARSE_ERROR",
      message: "SQL syntax error near 'SELEC * FROM users' at line 1"
    },
    permission: {
      code: "ER_ACCESS_DENIED",
      message: "Access denied for user 'app_user'@'localhost' to database 'production'"
    },
    corruption: {
      code: "ER_CRASHED",
      message: "Table 'orders' is marked as crashed and needs repair"
    }
  };

  const error = dbErrors[errorType] || { code: "UNKNOWN", message: "Unknown database error" };
  
  trackError("DatabaseError", error.message, {
    errorType: "database",
    subType: errorType,
    errorCode: error.code,
    requestId: req.requestId
  });

  res.status(500).json({
    success: false,
    error: {
      name: "DatabaseError",
      type: errorType,
      code: error.code,
      message: error.message,
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    }
  });
});

// 5. Network/External Service Errors
router.get("/api/error/network/:type", async (req, res) => {
  const errorType = req.params.type;
  
  const networkErrors = {
    dns: {
      code: "ENOTFOUND",
      message: "DNS lookup failed for api.external-service.com"
    },
    refused: {
      code: "ECONNREFUSED",
      message: "Connection refused by external service at 192.168.1.100:8080"
    },
    reset: {
      code: "ECONNRESET",
      message: "Connection reset by peer during data transfer"
    },
    timeout: {
      code: "ETIMEDOUT",
      message: "Connection to payment gateway timed out after 10000ms"
    },
    ssl: {
      code: "CERT_HAS_EXPIRED",
      message: "SSL certificate for api.partner.com has expired"
    },
    proxy: {
      code: "EPROXY",
      message: "Proxy server returned 502 Bad Gateway"
    }
  };

  const error = networkErrors[errorType] || { code: "UNKNOWN", message: "Unknown network error" };
  
  trackError("NetworkError", error.message, {
    errorType: "network",
    subType: errorType,
    errorCode: error.code,
    requestId: req.requestId
  });

  res.status(502).json({
    success: false,
    error: {
      name: "NetworkError",
      type: errorType,
      code: error.code,
      message: error.message,
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    }
  });
});

// 6. Validation Errors
router.post("/api/error/validation", express.json(), (req, res) => {
  const validationErrors = [];
  const { email, password, age, phone, username } = req.body || {};

  if (!email) {
    validationErrors.push({ field: "email", message: "Email is required" });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    validationErrors.push({ field: "email", message: "Invalid email format" });
  }

  if (!password) {
    validationErrors.push({ field: "password", message: "Password is required" });
  } else if (password.length < 8) {
    validationErrors.push({ field: "password", message: "Password must be at least 8 characters" });
  }

  if (age !== undefined && (age < 0 || age > 150)) {
    validationErrors.push({ field: "age", message: "Age must be between 0 and 150" });
  }

  if (phone && !/^\+?[\d\s-]{10,}$/.test(phone)) {
    validationErrors.push({ field: "phone", message: "Invalid phone number format" });
  }

  if (username && username.length < 3) {
    validationErrors.push({ field: "username", message: "Username must be at least 3 characters" });
  }

  if (validationErrors.length === 0) {
    validationErrors.push({ field: "demo", message: "This is a demo - send invalid data to see validation errors" });
  }

  trackError("ValidationError", `${validationErrors.length} validation errors`, {
    errorType: "validation",
    errors: validationErrors,
    requestId: req.requestId
  });

  res.status(422).json({
    success: false,
    error: {
      name: "ValidationError",
      type: "validation",
      message: "Validation failed",
      errors: validationErrors,
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    }
  });
});

// 7. Authentication/Authorization Errors
router.get("/api/error/auth/:type", (req, res) => {
  const errorType = req.params.type;
  
  const authErrors = {
    missing_token: {
      status: 401,
      code: "AUTH_TOKEN_MISSING",
      message: "Authorization header is missing"
    },
    invalid_token: {
      status: 401,
      code: "AUTH_TOKEN_INVALID",
      message: "The provided token is invalid or malformed"
    },
    expired_token: {
      status: 401,
      code: "AUTH_TOKEN_EXPIRED",
      message: "The authentication token has expired"
    },
    insufficient_scope: {
      status: 403,
      code: "AUTH_INSUFFICIENT_SCOPE",
      message: "Token does not have required scope: admin:write"
    },
    ip_blocked: {
      status: 403,
      code: "AUTH_IP_BLOCKED",
      message: "Access denied from IP address: 192.168.1.100"
    },
    account_locked: {
      status: 403,
      code: "AUTH_ACCOUNT_LOCKED",
      message: "Account has been locked due to multiple failed login attempts"
    },
    mfa_required: {
      status: 403,
      code: "AUTH_MFA_REQUIRED",
      message: "Multi-factor authentication is required for this action"
    }
  };

  const error = authErrors[errorType] || authErrors.missing_token;
  
  trackError("AuthError", error.message, {
    errorType: "authentication",
    subType: errorType,
    errorCode: error.code,
    requestId: req.requestId
  });

  res.status(error.status).json({
    success: false,
    error: {
      name: "AuthError",
      type: errorType,
      code: error.code,
      message: error.message,
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    }
  });
});

// 8. Business Logic Errors
router.get("/api/error/business/:type", (req, res) => {
  const errorType = req.params.type;
  
  const businessErrors = {
    insufficient_funds: {
      code: "BIZ_INSUFFICIENT_FUNDS",
      message: "Insufficient funds in account. Available: 50.00 SAR, Required: 150.00 SAR"
    },
    out_of_stock: {
      code: "BIZ_OUT_OF_STOCK",
      message: "Product 'iPhone 15 Pro' is currently out of stock"
    },
    order_cancelled: {
      code: "BIZ_ORDER_CANCELLED",
      message: "Cannot modify order #12345 - it has already been cancelled"
    },
    limit_exceeded: {
      code: "BIZ_LIMIT_EXCEEDED",
      message: "Daily transaction limit of 10,000 SAR has been exceeded"
    },
    duplicate_order: {
      code: "BIZ_DUPLICATE_ORDER",
      message: "A similar order was placed in the last 5 minutes. Please confirm this is not a duplicate"
    },
    expired_offer: {
      code: "BIZ_EXPIRED_OFFER",
      message: "The promotional offer 'SUMMER2024' has expired"
    },
    region_restricted: {
      code: "BIZ_REGION_RESTRICTED",
      message: "This service is not available in your region"
    }
  };

  const error = businessErrors[errorType] || { code: "BIZ_UNKNOWN", message: "Unknown business error" };
  
  trackError("BusinessError", error.message, {
    errorType: "business",
    subType: errorType,
    errorCode: error.code,
    requestId: req.requestId
  });

  res.status(400).json({
    success: false,
    error: {
      name: "BusinessError",
      type: errorType,
      code: error.code,
      message: error.message,
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    }
  });
});

// 9. Memory/Resource Errors
router.get("/api/error/resource/:type", (req, res) => {
  const errorType = req.params.type;
  
  const resourceErrors = {
    memory: {
      code: "RES_OUT_OF_MEMORY",
      message: "JavaScript heap out of memory - current usage: 512MB / 512MB"
    },
    disk: {
      code: "RES_DISK_FULL",
      message: "No space left on device /dev/sda1"
    },
    file_limit: {
      code: "RES_TOO_MANY_FILES",
      message: "EMFILE: too many open files"
    },
    cpu: {
      code: "RES_CPU_OVERLOAD",
      message: "CPU usage exceeded threshold: 95%"
    },
    connections: {
      code: "RES_CONNECTION_POOL_EXHAUSTED",
      message: "Database connection pool exhausted. Max: 100, Waiting: 50"
    }
  };

  const error = resourceErrors[errorType] || { code: "RES_UNKNOWN", message: "Unknown resource error" };
  
  trackError("ResourceError", error.message, {
    errorType: "resource",
    subType: errorType,
    errorCode: error.code,
    requestId: req.requestId
  });

  res.status(503).json({
    success: false,
    error: {
      name: "ResourceError",
      type: errorType,
      code: error.code,
      message: error.message,
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    }
  });
});

// 10. Random Error Generator
router.get("/api/error/random", (req, res) => {
  const errorCategories = [
    { path: "http/500", weight: 20 },
    { path: "http/404", weight: 15 },
    { path: "http/401", weight: 10 },
    { path: "runtime/type", weight: 10 },
    { path: "runtime/reference", weight: 10 },
    { path: "database/connection", weight: 10 },
    { path: "network/timeout", weight: 10 },
    { path: "auth/expired_token", weight: 5 },
    { path: "business/insufficient_funds", weight: 5 },
    { path: "resource/memory", weight: 5 }
  ];

  const totalWeight = errorCategories.reduce((sum, e) => sum + e.weight, 0);
  let random = Math.random() * totalWeight;
  
  let selected = errorCategories[0].path;
  for (const error of errorCategories) {
    random -= error.weight;
    if (random <= 0) {
      selected = error.path;
      break;
    }
  }

  res.redirect(`/api/error/${selected}`);
});

// ═══════════════════════════════════════════════════════════════
// USER ACTIONS
// ═══════════════════════════════════════════════════════════════

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

// Batch Errors
router.post("/api/batch-errors", express.json(), (req, res) => {
  const { count = 5 } = req.body || {};
  const batchId = uuidv4();
  const errorTypes = ["http/500", "http/404", "runtime/type", "database/timeout", "network/refused"];
  
  const generated = [];
  for (let i = 0; i < Math.min(count, 20); i++) {
    const errorPath = errorTypes[i % errorTypes.length];
    generated.push(errorPath);
    
    trackError(`BatchError_${i}`, `Batch error ${i + 1} of type ${errorPath}`, {
      batchId,
      index: i,
      errorPath,
      requestId: req.requestId
    });
  }

  res.json({ 
    success: true,
    batchId,
    errorsGenerated: generated.length,
    types: generated,
    message: `${generated.length} errors tracked in PostHog`
  });
});
