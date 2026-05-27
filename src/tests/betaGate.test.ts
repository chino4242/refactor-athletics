import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

// Must import after mocks
import { updateSession } from '@/utils/supabase/middleware';

function createMockRequest(pathname: string): NextRequest {
  const url = new URL(`http://localhost:3000${pathname}`);
  const mockUrl = Object.assign(url, {
    clone: () => new URL(url.toString()),
  });
  return {
    nextUrl: mockUrl,
    cookies: {
      getAll: () => [],
      set: vi.fn(),
    },
    url: url.toString(),
  } as unknown as NextRequest;
}

function getRedirectLocation(res: NextResponse): string | null {
  const location = res.headers.get('location');
  return location;
}

describe('Beta Access Gate (middleware)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated users to /login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const req = createMockRequest('/dashboard');
    const res = await updateSession(req);

    expect(res.status).toBe(307);
    expect(getRedirectLocation(res)).toContain('/login');
  });

  it('allows unauthenticated users to access /login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const req = createMockRequest('/login');
    const res = await updateSession(req);

    expect(res.status).not.toBe(307);
  });

  it('redirects authenticated user without beta_access to /beta', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { beta_access: false } }),
        }),
      }),
    });

    const req = createMockRequest('/dashboard');
    const res = await updateSession(req);

    expect(res.status).toBe(307);
    expect(getRedirectLocation(res)).toContain('/beta');
  });

  it('allows authenticated user with beta_access to proceed', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { beta_access: true } }),
        }),
      }),
    });

    const req = createMockRequest('/dashboard');
    const res = await updateSession(req);

    const location = getRedirectLocation(res);
    expect(location === null || !location.includes('/beta')).toBe(true);
  });

  it('allows authenticated user without beta_access to access /beta page', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const req = createMockRequest('/beta');
    const res = await updateSession(req);

    const location = getRedirectLocation(res);
    expect(location === null || !location.includes('/beta')).toBe(true);
  });

  it('redirects authenticated user away from /login to /', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const req = createMockRequest('/login');
    const res = await updateSession(req);

    expect(res.status).toBe(307);
    expect(getRedirectLocation(res)).toContain('/');
  });

  it('does not redirect if profile is null (new user without row)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    });

    const req = createMockRequest('/dashboard');
    const res = await updateSession(req);

    const location = getRedirectLocation(res);
    expect(location === null || !location.includes('/beta')).toBe(true);
  });
});
