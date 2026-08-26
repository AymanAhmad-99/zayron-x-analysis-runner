export function hasAutomationSecret(request: Request): boolean {
  const expected = process.env.ZAYRON_AUTOMATION_SECRET;
  const supplied = request.headers.get('x-zayron-automation-secret');
  return Boolean(expected && supplied && supplied === expected);
}
