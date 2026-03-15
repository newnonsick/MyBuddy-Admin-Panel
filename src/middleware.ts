import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPage = pathname.startsWith('/admin');
  const isAdminApi = pathname.startsWith('/api/admin');

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    return new NextResponse('Not Found', { status: 404 });
  }

  if (isAdminPage) {
    const key = request.nextUrl.searchParams.get('key');
    if (key !== adminKey) {
      return new NextResponse('Not Found', { status: 404 });
    }
  }

  if (isAdminApi) {
    const key = request.headers.get('x-admin-key');
    if (key !== adminKey) {
      return new NextResponse('Not Found', { status: 404 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
