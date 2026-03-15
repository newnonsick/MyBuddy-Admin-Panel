import { NextRequest, NextResponse } from 'next/server';

const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB

export function getAdminKey(): string {
  return process.env.ADMIN_KEY ?? '';
}

export function isValidAdminKey(key: string | null): boolean {
  const adminKey = getAdminKey();
  if (!adminKey || !key) return false;
  return key === adminKey;
}

export function validateAdminRequest(request: NextRequest): NextResponse | null {
  const key = request.headers.get('x-admin-key');
  if (!isValidAdminKey(key)) {
    return new NextResponse('Not Found', { status: 404 });
  }
  return null;
}

export function isPayloadTooLarge(contentLength: string | null): boolean {
  if (!contentLength) return false;
  return parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE;
}

export function sanitizeString(value: string): string {
  return value.replace(/[<>]/g, '');
}
