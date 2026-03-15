import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes";

// Create Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson: any, ...args: any[]) {
    capturedJsonResponse = bodyJson;
    return (originalResJson as any).apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

// Register API routes
let routesRegistered = false;
async function setupRoutes() {
  if (!routesRegistered) {
    await registerRoutes(app);
    routesRegistered = true;
  }
}

// Diagnostic route
app.get("/api/health", async (req, res) => {
  const diagnostics = {
    databaseUrlSet: !!process.env.DATABASE_URL,
    databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) + '...',
    sessionSecretSet: !!process.env.SESSION_SECRET,
    nodeEnv: process.env.NODE_ENV,
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
    allEnvKeys: Object.keys(process.env).filter(k => !k.includes('VERCEL')).sort(),
  };

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({
      status: "error",
      message: "DATABASE_URL is not set in Vercel environment variables.",
      diagnostics
    });
  }

  try {
    const { pool: dbPool } = await import("../server/db");
    const result = await dbPool`SELECT 1 as connected`;
    return res.json({
      status: "ok",
      database: "connected",
      diagnostics,
      result
    });
  } catch (error: any) {
    console.error("Health check DB error:", error);
    return res.status(500).json({
      status: "error",
      message: "Database connection failed: " + (error.message || String(error)),
      diagnostics,
      hint: "Check if the database is reachable and the credentials are correct. If you see ENETUNREACH, try adding NODE_OPTIONS=--dns-result-order=ipv4first to Vercel env vars."
    });
  }
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  console.error('Error:', err);
  res.status(status).json({ message });
});

// Vercel serverless function handler
export default async function handler(req: Request, res: Response) {
  try {
    // Check critical environment variables before initialization
    if (!process.env.DATABASE_URL) {
      console.error('CRITICAL: DATABASE_URL is not set in Vercel environment variables');
      return res.status(500).json({
        error: 'Database configuration missing',
        message: 'DATABASE_URL environment variable is not configured. Please add it in Vercel Project Settings > Environment Variables',
        hint: 'Go to https://vercel.com/your-project/settings/environment-variables',
        timestamp: new Date().toISOString()
      });
    }

    if (!process.env.SESSION_SECRET) {
      console.error('WARNING: SESSION_SECRET is not set, using default (INSECURE)');
    }

    await setupRoutes();
    return app(req, res);
  } catch (error: any) {
    console.error('Serverless function initialization error:', error);
    console.error('Error stack:', error.stack);

    return res.status(500).json({
      error: 'Function initialization failed',
      message: error.message || 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      hint: 'Check Vercel Function Logs for detailed error information'
    });
  }
}
