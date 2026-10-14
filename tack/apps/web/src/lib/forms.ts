import type { ZodError } from 'zod';

/** First message for each field, keyed by field name, in the same shape the API uses. */
export function zodFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_');
    fields[key] ??= issue.message;
  }
  return fields;
}
