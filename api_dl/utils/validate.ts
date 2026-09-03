import { ApiError } from "./ApiError.js";

// Generous but bounded limit — real URLs and search queries are far shorter.
export const MAX_INPUT_LENGTH = 2000;

// Raw control characters (other than whitespace) — reject to avoid injection.
const CONTROL_CHAR_PATTERN = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

/**
 * Validates a required string param: present, non-empty after trimming,
 * within sane length, and free of control characters.
 */
export function requireNonEmptyString(
  value: any,
  paramName: string,
  { maxLength = MAX_INPUT_LENGTH } = {}
): string {
  if (typeof value !== "string") {
    throw new ApiError(400, `"${paramName}" must be a string.`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ApiError(400, `"${paramName}" is required and cannot be empty.`);
  }
  if (trimmed.length > maxLength) {
    throw new ApiError(400, `"${paramName}" is too long (max ${maxLength} characters).`);
  }
  if (CONTROL_CHAR_PATTERN.test(trimmed)) {
    throw new ApiError(400, `"${paramName}" contains invalid control characters.`);
  }
  return trimmed;
}

/**
 * Validates a value is a syntactically well-formed absolute http(s) URL.
 */
export function requireHttpUrl(value: any, paramName: string): string {
  const trimmed = requireNonEmptyString(value, paramName);
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ApiError(400, `"${paramName}" must be a valid absolute URL.`);
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new ApiError(400, `"${paramName}" must use http or https.`);
  }
  return trimmed;
}

/**
 * Validates input for a platform's declared queryType:
 * "url" → strict URL, "query" → free-text, "url_or_query" → try URL first.
 */
export function requireInputForQueryType(
  value: any,
  queryType: "url" | "query" | "url_or_query",
  paramName: string
): string {
  if (queryType === "url") return requireHttpUrl(value, paramName);
  if (queryType === "url_or_query") {
    const trimmed = requireNonEmptyString(value, paramName);
    try { new URL(trimmed); } catch { /* free-text is ok */ }
    return trimmed;
  }
  return requireNonEmptyString(value, paramName);
}
