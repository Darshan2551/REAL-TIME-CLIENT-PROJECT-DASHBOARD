import type { NextFunction, Request, Response } from "express";
import type { AnyZodObject, ZodEffects, ZodTypeAny } from "zod";
import { AppError } from "../utils/httpError.js";

const toObjectSchema = (schema: AnyZodObject | ZodEffects<ZodTypeAny>) => schema;

export const validateBody = (schema: AnyZodObject | ZodEffects<ZodTypeAny>) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = toObjectSchema(schema).safeParse(req.body);

    if (!parsed.success) {
      return next(
        new AppError("VALIDATION_ERROR", "Validation failed", 422, parsed.error.flatten().fieldErrors)
      );
    }

    req.body = parsed.data;
    next();
  };
};

export const validateQuery = (schema: AnyZodObject | ZodEffects<ZodTypeAny>) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = toObjectSchema(schema).safeParse(req.query);

    if (!parsed.success) {
      return next(
        new AppError("VALIDATION_ERROR", "Query validation failed", 422, parsed.error.flatten().fieldErrors)
      );
    }

    req.query = parsed.data;
    next();
  };
};

export const validateParams = (schema: AnyZodObject | ZodEffects<ZodTypeAny>) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = toObjectSchema(schema).safeParse(req.params);

    if (!parsed.success) {
      return next(
        new AppError("VALIDATION_ERROR", "Params validation failed", 422, parsed.error.flatten().fieldErrors)
      );
    }

    req.params = parsed.data;
    next();
  };
};
