export type TimestampClassification =
  | 'VALID'
  | 'INVALID'
  | 'SYNTHETIC'
  | 'TEST'
  | 'UNKNOWN';

export interface TimestampValidationResult {
  valid: boolean;
  classification: TimestampClassification;
  value?: string;
  reason?: string;
}

/** Validates source timestamps without allowing future intelligence events. */
export function validateSourceTimestamp(
  value: string | undefined,
  now = new Date(),
): TimestampValidationResult {
  if (!value) {
    return { valid: false, classification: 'UNKNOWN', reason: 'Source timestamp is missing' };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { valid: false, classification: 'INVALID', reason: 'Timestamp is not ISO-8601 parseable' };
  }

  if (parsed.getTime() > now.getTime()) {
    return { valid: false, classification: 'INVALID', reason: 'Source timestamp is in the future' };
  }

  return { valid: true, classification: 'VALID', value: parsed.toISOString() };
}

export function systemTimestamp(now = new Date()): string {
  return now.toISOString();
}
