import { NextResponse } from "next/server";

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
