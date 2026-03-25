import { StatusCodes } from "http-status-codes";

export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "BAD_REQUEST"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  statusCode: number;
  code: AppErrorCode;
  details?: unknown;

  constructor(code: AppErrorCode, message: string, statusCode: number, details?: unknown) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const unauthorized = (message = "Unauthorized") =>
  new AppError("UNAUTHORIZED", message, StatusCodes.UNAUTHORIZED);

export const forbidden = (message = "Forbidden") =>
  new AppError("FORBIDDEN", message, StatusCodes.FORBIDDEN);

export const notFound = (message = "Not found") =>
  new AppError("NOT_FOUND", message, StatusCodes.NOT_FOUND);

export const badRequest = (message = "Bad request", details?: unknown) =>
  new AppError("BAD_REQUEST", message, StatusCodes.BAD_REQUEST, details);

export const conflict = (message = "Conflict", details?: unknown) =>
  new AppError("CONFLICT", message, StatusCodes.CONFLICT, details);
