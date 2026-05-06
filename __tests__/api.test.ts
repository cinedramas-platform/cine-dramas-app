import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetSession, mockRefreshSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockRefreshSession: vi.fn(),
}));

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'test-anon-key',
      },
    },
  },
}));

vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      refreshSession: mockRefreshSession,
    },
  },
}));

import { invokeFunction } from '../services/api';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('invokeFunction', () => {
  const fetchSpy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = fetchSpy;
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
  });

  it('constructs URL with function name and includes auth headers', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ ok: true }));

    await invokeFunction('catalog-series');

    expect(fetchSpy).toHaveBeenCalledWith('https://test.supabase.co/functions/v1/catalog-series', {
      headers: {
        Authorization: 'Bearer test-token',
        apikey: 'test-anon-key',
        'Content-Type': 'application/json',
      },
    });
  });

  it('appends query params and omits undefined values', async () => {
    fetchSpy.mockResolvedValue(jsonResponse([]));

    await invokeFunction('catalog-series', {
      category: 'drama',
      page: '1',
      missing: undefined,
    });

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('category=drama');
    expect(calledUrl).toContain('page=1');
    expect(calledUrl).not.toContain('missing');
  });

  it('returns parsed JSON on success', async () => {
    const payload = { data: [{ id: '1' }], total: 1 };
    fetchSpy.mockResolvedValue(jsonResponse(payload));

    const result = await invokeFunction('catalog-series');

    expect(result).toEqual(payload);
  });

  it('retries with refreshed token on 401', async () => {
    mockGetSession
      .mockResolvedValueOnce({
        data: { session: { access_token: 'test-token' } },
      })
      .mockResolvedValueOnce({
        data: { session: { access_token: 'refreshed-token' } },
      });

    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ error: 'jwt expired' }, 401))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));

    mockRefreshSession.mockResolvedValue({ error: null });

    const result = await invokeFunction('catalog-series');

    expect(mockRefreshSession).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const retryHeaders = fetchSpy.mock.calls[1][1].headers;
    expect(retryHeaders.Authorization).toBe('Bearer refreshed-token');
    expect(result).toEqual({ data: [] });
  });

  it('throws when session refresh fails after 401', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ error: 'jwt expired' }, 401));
    mockRefreshSession.mockResolvedValue({
      error: { message: 'refresh token expired' },
    });

    await expect(invokeFunction('catalog-series')).rejects.toThrow('jwt expired');
  });

  it('throws with error message from response body', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ error: 'Series not found' }, 404));

    await expect(invokeFunction('catalog-series-detail', { id: 'bad' })).rejects.toThrow(
      'Series not found',
    );
  });

  it('throws with status code when body is not JSON', async () => {
    fetchSpy.mockResolvedValue(new Response('Internal Server Error', { status: 500 }));

    await expect(invokeFunction('catalog-series')).rejects.toThrow(
      'Request failed with status 500',
    );
  });
});
