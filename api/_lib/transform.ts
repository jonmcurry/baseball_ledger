/**
 * Field Name Transformation
 *
 * Deep recursive conversion between snake_case (database) and
 * camelCase (JSON responses) per REQ-API-008.
 *
 * Layer 2: API infrastructure.
 */

/**
 * Convert a snake_case string to camelCase.
 * Examples: "home_team_id" -> "homeTeamId", "is_complete" -> "isComplete"
 */
export function snakeToCamelStr(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/**
 * Convert a camelCase string to snake_case.
 * Examples: "homeTeamId" -> "home_team_id", "isComplete" -> "is_complete"
 */
export function camelToSnakeStr(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Deep-convert all keys in an object from snake_case to camelCase.
 * Handles nested objects and arrays recursively.
 */
export function snakeToCamel<T = unknown>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return obj as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => snakeToCamel(item)) as T;
  }

  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[snakeToCamelStr(key)] = snakeToCamel(value);
    }
    return result as T;
  }

  return obj as T;
}

/**
 * Deep-convert all keys in an object from camelCase to snake_case.
 * Handles nested objects and arrays recursively.
 */
export function camelToSnake<T = unknown>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return obj as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => camelToSnake(item)) as T;
  }

  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[camelToSnakeStr(key)] = camelToSnake(value);
    }
    return result as T;
  }

  return obj as T;
}
