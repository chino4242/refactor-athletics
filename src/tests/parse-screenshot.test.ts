import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/parse-screenshot/route';
import { NextRequest } from 'next/server';

// Use vi.hoisted to ensure mock is available during hoisting
const { mockCreate } = vi.hoisted(() => ({
    mockCreate: vi.fn(),
}));

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => ({
    default: class MockAnthropic {
        messages = {
            create: mockCreate,
        };
    },
}));

describe('Parse Screenshot API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.ANTHROPIC_API_KEY = 'test-api-key';
    });

    const createMockRequest = (file: File, type: string) => {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('type', type);

        return {
            formData: async () => formData,
        } as NextRequest;
    };

    const createMockFile = (name: string, type: string) => {
        return new File(['test image content'], name, { type });
    };

    it('parses nutrition screenshot', async () => {
        mockCreate.mockResolvedValue({
            content: [
                {
                    type: 'text',
                    text: '{"protein": 150, "carbs": 200, "fat": 65, "water": 100}',
                },
            ],
        });

        const file = createMockFile('nutrition.png', 'image/png');
        const request = createMockRequest(file, 'nutrition');

        const response = await POST(request);
        const json = await response.json();

        expect(json.success).toBe(true);
        expect(json.data.protein).toBe(150);
        expect(json.data.carbs).toBe(200);
        expect(json.data.fat).toBe(65);
        expect(json.data.water).toBe(100);
    });

    it('parses workout screenshot', async () => {
        mockCreate.mockResolvedValue({
            content: [
                {
                    type: 'text',
                    text: '{"exercises": [{"name": "Back Squat", "sets": [{"reps": 5, "weight": 225}]}]}',
                },
            ],
        });

        const file = createMockFile('workout.jpg', 'image/jpeg');
        const request = createMockRequest(file, 'workout');

        const response = await POST(request);
        const json = await response.json();

        expect(json.success).toBe(true);
        expect(json.data.exercises).toHaveLength(1);
        expect(json.data.exercises[0].name).toBe('Back Squat');
        expect(json.data.exercises[0].sets[0].weight).toBe(225);
    });

    it('parses habits screenshot', async () => {
        mockCreate.mockResolvedValue({
            content: [
                {
                    type: 'text',
                    text: '{"steps": 10000, "exercise_minutes": 30, "stand_hours": 12, "sleep": 7.5}',
                },
            ],
        });

        const file = createMockFile('habits.png', 'image/png');
        const request = createMockRequest(file, 'habits');

        const response = await POST(request);
        const json = await response.json();

        expect(json.success).toBe(true);
        expect(json.data.steps).toBe(10000);
        expect(json.data.exercise_minutes).toBe(30);
        expect(json.data.sleep).toBe(7.5);
    });

    it('converts image to base64 and sends to Claude', async () => {
        mockCreate.mockResolvedValue({
            content: [{ type: 'text', text: '{"protein": 100}' }],
        });

        const file = createMockFile('test.png', 'image/png');
        const request = createMockRequest(file, 'nutrition');

        await POST(request);

        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1024,
                messages: expect.arrayContaining([
                    expect.objectContaining({
                        role: 'user',
                        content: expect.arrayContaining([
                            expect.objectContaining({
                                type: 'image',
                                source: expect.objectContaining({
                                    type: 'base64',
                                    media_type: 'image/png',
                                }),
                            }),
                        ]),
                    }),
                ]),
            })
        );
    });

    it('uses correct media type for jpeg', async () => {
        mockCreate.mockResolvedValue({
            content: [{ type: 'text', text: '{"protein": 100}' }],
        });

        const file = createMockFile('test.jpg', 'image/jpeg');
        const request = createMockRequest(file, 'nutrition');

        await POST(request);

        const call = mockCreate.mock.calls[0][0];
        const imageContent = call.messages[0].content.find((c: any) => c.type === 'image');
        expect(imageContent.source.media_type).toBe('image/jpeg');
    });

    it('extracts JSON from text with surrounding content', async () => {
        mockCreate.mockResolvedValue({
            content: [
                {
                    type: 'text',
                    text: 'Here is the data: {"protein": 150, "carbs": 200} from the image.',
                },
            ],
        });

        const file = createMockFile('test.png', 'image/png');
        const request = createMockRequest(file, 'nutrition');

        const response = await POST(request);
        const json = await response.json();

        expect(json.data.protein).toBe(150);
        expect(json.data.carbs).toBe(200);
    });

    it('returns error when no image provided', async () => {
        const formData = new FormData();
        formData.append('type', 'nutrition');

        const request = {
            formData: async () => formData,
        } as NextRequest;

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toBe('No image provided');
    });

    it('returns error when API key not configured', async () => {
        delete process.env.ANTHROPIC_API_KEY;

        const file = createMockFile('test.png', 'image/png');
        const request = createMockRequest(file, 'nutrition');

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(500);
        expect(json.error).toBe('API key not configured');
    });

    it('handles Claude API errors', async () => {
        mockCreate.mockRejectedValue(new Error('Invalid API key'));

        const file = createMockFile('test.png', 'image/png');
        const request = createMockRequest(file, 'nutrition');

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(500);
        expect(json.error).toBe('Invalid API key');
    });

    it('handles invalid JSON response', async () => {
        mockCreate.mockResolvedValue({
            content: [{ type: 'text', text: 'Not valid JSON' }],
        });

        const file = createMockFile('test.png', 'image/png');
        const request = createMockRequest(file, 'nutrition');

        const response = await POST(request);
        const json = await response.json();

        expect(json.success).toBe(true);
        expect(json.data).toEqual({});
    });

    it('uses correct prompt for each type', async () => {
        mockCreate.mockResolvedValue({
            content: [{ type: 'text', text: '{}' }],
        });

        const types = ['nutrition', 'workout', 'habits'];

        for (const type of types) {
            const file = createMockFile('test.png', 'image/png');
            const request = createMockRequest(file, type);
            await POST(request);
        }

        expect(mockCreate).toHaveBeenCalledTimes(3);
        
        const calls = mockCreate.mock.calls;
        expect(calls[0][0].messages[0].content[1].text).toContain('nutrition data');
        expect(calls[1][0].messages[0].content[1].text).toContain('workout data');
        expect(calls[2][0].messages[0].content[1].text).toContain('habit/activity data');
    });
});
