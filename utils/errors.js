export class AppError extends Error {
  constructor(message, statusCode = 400, errors = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export function isAppError(error) {
  return Boolean(error?.statusCode);
}

export function normalizeDatabaseError(error) {
  if (!error?.code) return error;

  if (error.code === "23505") {
    return new AppError("A record with these unique details already exists.", 409);
  }

  if (error.code === "23503") {
    return new AppError("The requested record is linked to other data and cannot be changed this way.", 409);
  }

  if (error.code === "23514") {
    return new AppError("The submitted data violates a database constraint.", 400);
  }

  return error;
}
