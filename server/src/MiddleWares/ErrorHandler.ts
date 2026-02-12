import { Request, Response, NextFunction } from "express";

export const ErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("🔥 Error caught by ErrorHandler:", err);

  // Prefer explicit status -> fallback 500
  const status = err.statusCode || err.status || 500;

  // Try to pull Jira / API response details if present
  let details = err.details || err.data || err.response?.data;

  // If fetch returned raw text JSON -> try parsing it
  if (typeof details === "string") {
    try {
      details = JSON.parse(details);
    } catch {
      // leave as text if not JSON
    }
  }

  return res.status(status).json({
    ok: false,
    error: err.message || "Internal Server Error",
    status,
    details,
    stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
  });
};
