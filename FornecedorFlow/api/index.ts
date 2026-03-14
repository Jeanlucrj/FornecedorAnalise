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

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  console.error('Error:', err);
  res.status(status).json({ message });
});

// Vercel serverless function handler
export default async function handler(req: Request, res: Response) {
  await setupRoutes();
  return app(req, res);
}
