import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import "dotenv/config";
import router from "./routes/index.js";
import { ErrorHandler } from "./MiddleWares/ErrorHandler.js";
import { AppError } from "./AppError/AppError.js";
import authRouter from "./routes/AuthenticationRoutes.js";

const app = express();
app.use(express.json());
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && "body" in err) {
    return next(new AppError("Invalid JSON payload", 400, err.message));
  }
  next(err);
});
app.use(cors());
app.use("/api", router);
app.use("/auth", authRouter);
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("🔥 Raw Error:", err);
  if (err instanceof AppError) return next(err);
  if (err instanceof SyntaxError && "body" in err) {
    return next(new AppError("Invalid JSON payload", 400, err.message));
  }
  return next(
    new AppError(
      err?.message || "Internal Server Error",
      err?.statusCode || err?.status || 500,
      err
    )
  );
});
app.use(ErrorHandler);
const PORT = parseInt(process.env.PORT || "5000");
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});