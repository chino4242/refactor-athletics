import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '@/app/api/challenge-75/route';
import { NextRequest } from 'next/server';

// Mock Supabase
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockUpsert = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockIs = vi.fn();
const mockIn = vi.fn();
const mockGte = vi.fn();
const mockLt = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockSingle = vi.fn();

function createChainMock(returnData: any = null, count?: number) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: returnData }),
  };
  // Terminal methods
  chain.select.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.upsert.mockReturnValue(chain);
  chain.delete.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.is.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
  chain.gte.mockReturnValue(chain);
  chain.lt.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  // Make chain itself thenable (for awaiting without .single())
  chain.then = (resolve: any) => resolve({ data: Array.isArray(returnData) ? returnData : returnData ? [returnData] : [], count });
  return chain;
}

const mockServiceFrom = vi.fn();
const mockAuthGetUser = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => Promise.resolve({
    auth: { getUser: mockAuthGetUser },
  }),
}));

vi.mock('@/utils/supabase/service', () => ({
  createServiceClient: () => ({ from: mockServiceFrom }),
}));

describe('75 Day Challenge API', () => {
  const userId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: userId } } });
  });

  const createRequest = (body: any) => ({
    json: async () => body,
  }) as NextRequest;

  describe('POST - create', () => {
    it('creates a challenge with metrics and auto-joins creator', async () => {
      const challengeId = 'challenge-456';
      const membershipId = 'member-789';
      const insertChain = createChainMock({ id: challengeId, title: 'My Challenge' });
      const metricsChain = createChainMock();
      const membersChain = createChainMock({ id: membershipId, challenge_id: challengeId, user_id: 'user-123' });

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === 'challenges_75') return insertChain;
        if (table === 'challenge_75_metrics') return metricsChain;
        if (table === 'challenge_75_members') return membersChain;
        return createChainMock();
      });

      const req = createRequest({
        action: 'create',
        title: 'My Challenge',
        start_date: '2026-05-27',
        metrics: [
          { id: 'habit_steps', label: 'Steps', type: 'app', minimum: 10000 },
          { id: 'custom_read', label: 'Read 30 min', type: 'custom', minimum: 0 },
        ],
      });

      const res = await POST(req);
      const data = await res.json();

      expect(data.challenge).toBeDefined();
      expect(mockServiceFrom).toHaveBeenCalledWith('challenges_75');
      expect(mockServiceFrom).toHaveBeenCalledWith('challenge_75_metrics');
      expect(mockServiceFrom).toHaveBeenCalledWith('challenge_75_members');
    });
  });

  describe('POST - join', () => {
    it('adds user to challenge members', async () => {
      const chain = createChainMock();
      mockServiceFrom.mockReturnValue(chain);

      const req = createRequest({ action: 'join', challenge_id: 'challenge-456' });
      const res = await POST(req);
      const data = await res.json();

      expect(data.success).toBe(true);
      expect(mockServiceFrom).toHaveBeenCalledWith('challenge_75_members');
    });
  });

  describe('POST - check_custom', () => {
    it('upserts custom check for today', async () => {
      const selectChain = createChainMock({ id: 'day-1', custom_checks: {} });
      const updateChain = createChainMock();

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === 'challenge_75_days') return selectChain;
        return createChainMock();
      });

      const req = createRequest({
        action: 'check_custom',
        challenge_id: 'challenge-456',
        metric_id: 'custom_read',
        checked: true,
      });

      const res = await POST(req);
      const data = await res.json();

      expect(data.success).toBe(true);
    });
  });

  describe('POST - restart', () => {
    it('resets challenge status and clears day records', async () => {
      const chain = createChainMock();
      mockServiceFrom.mockReturnValue(chain);

      const req = createRequest({ action: 'restart', challenge_id: 'challenge-456' });
      const res = await POST(req);
      const data = await res.json();

      expect(data.success).toBe(true);
      expect(mockServiceFrom).toHaveBeenCalledWith('challenges_75');
      expect(mockServiceFrom).toHaveBeenCalledWith('challenge_75_days');
      expect(mockServiceFrom).toHaveBeenCalledWith('challenge_75_members');
    });
  });

  describe('POST - unauthorized', () => {
    it('returns 401 when not authenticated', async () => {
      mockAuthGetUser.mockResolvedValue({ data: { user: null } });

      const req = createRequest({ action: 'create' });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });
  });

  describe('POST - unknown action', () => {
    it('returns 400 for unknown action', async () => {
      const req = createRequest({ action: 'invalid' });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });
  });
});
