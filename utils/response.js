import { NextResponse } from "next/server";
import { isAppError, normalizeDatabaseError } from "./errors";

export function successResponse(data, message = "Success", statusCode = 200) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status: statusCode }
  );
}

export function errorResponse(message = "An error occurred", statusCode = 400, errors = null) {
  return NextResponse.json(
    {
      success: false,
      message,
      errors,
    },
    { status: statusCode }
  );
}

export function handleError(error, fallbackMessage = "An unexpected error occurred.") {
  const normalized = normalizeDatabaseError(error);

  if (isAppError(normalized)) {
    return errorResponse(normalized.message, normalized.statusCode, normalized.errors || null);
  }

  console.error(normalized);
  return errorResponse(fallbackMessage, 500);
}
