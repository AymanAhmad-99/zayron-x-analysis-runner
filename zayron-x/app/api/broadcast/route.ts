import { hasAutomationSecret } from '@/lib/edge/auth';
import { NextResponse } from 'next/server';

const targets = ['instagram', 'telegram', 'facebook', 'threads', 'reddit', 'linkedin'] as const;

export async function POST(request: Request) {
  if (!hasAutomationSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ queued: true, targets });
}
