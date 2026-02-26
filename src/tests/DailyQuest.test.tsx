import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import DailyQuest from '@/components/DailyQuest';

// 1. Mock the ToastContext
const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    xp: vi.fn(),
    info: vi.fn(),
};

vi.mock('@/context/ToastContext', () => ({
    useToast: () => mockToast,
}));

// 2. Mock Server Actions (replacing old api.ts calls)
vi.mock('@/app/actions', () => ({
    logHabitAction: vi.fn().mockResolvedValue({ xp_earned: 50 }),
    deleteHistoryItemAction: vi.fn().mockResolvedValue({ status: 'success' }),
}));

// 3. Mock residual api.ts dependencies used by DailyQuest for progress + profile
vi.mock('@/services/api', () => ({
    getHabitProgress: vi.fn().mockResolvedValue({ status: 'success', totals: {} }),
    saveProfile: vi.fn().mockResolvedValue({ status: 'success' }),
    getHistory: vi.fn().mockResolvedValue([]),
    getProfile: vi.fn().mockResolvedValue(null),
    getWeeklySchedule: vi.fn().mockResolvedValue([]),
}));

describe('DailyQuest Component', () => {
    const mockOnXpEarned = vi.fn();

    const defaultProps = {
        userId: 'test-user',
        bodyweight: 185,
        onXpEarned: mockOnXpEarned,
        stats: null,
        initialProfile: null,
        activeChallenge: null,
        onStartChallenge: vi.fn(),
        onChallengeUpdate: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the DAILY QUESTS header', async () => {
        render(<DailyQuest {...defaultProps} />);
        expect(screen.getByText(/DAILY QUESTS/i)).toBeInTheDocument();
    });

    it('renders the core habit buttons', async () => {
        render(<DailyQuest {...defaultProps} />);
        expect(screen.getByText('Supplements')).toBeInTheDocument();
        expect(screen.getByText(/Sleep 7\+/i)).toBeInTheDocument();
        expect(screen.getByText(/Steps/i)).toBeInTheDocument();
    });

    it('calls logHabitAction when a simple habit button is clicked', async () => {
        const { logHabitAction } = await import('@/app/actions');
        vi.mocked(logHabitAction).mockResolvedValue({ xp_earned: 5 });

        render(<DailyQuest {...defaultProps} />);
        const btn = screen.getByText('Supplements').closest('button');
        fireEvent.click(btn!);

        await waitFor(() => {
            expect(logHabitAction).toHaveBeenCalledWith(
                'test-user',
                'habit_creatine',
                1,
                185,
                'Supplements',
                undefined
            );
        });
        expect(mockToast.xp).toHaveBeenCalledWith(expect.stringContaining('+5 XP'));
        expect(mockOnXpEarned).toHaveBeenCalled();
    });

    it('logs a numeric habit (Steps) successfully', async () => {
        const { logHabitAction } = await import('@/app/actions');
        vi.mocked(logHabitAction).mockResolvedValue({ xp_earned: 150 });

        render(<DailyQuest {...defaultProps} />);

        const card = screen.getByText('Steps', { selector: 'span.uppercase' }).closest('button');
        expect(card).toBeInTheDocument();
        fireEvent.click(card!);

        const stepsInput = screen.getByPlaceholderText('steps');
        fireEvent.change(stepsInput, { target: { value: '10000' } });

        const logBtn = screen.getByText('LOG');
        expect(logBtn).not.toBeDisabled();
        fireEvent.click(logBtn);

        await waitFor(() => {
            expect(logHabitAction).toHaveBeenCalledWith(
                'test-user',
                'habit_steps',
                10000,
                185,
                'Steps',
                undefined
            );
        });
        expect(mockToast.xp).toHaveBeenCalledWith(expect.stringContaining('+150 XP'));
    });

    it('disables LOG button when input is empty', () => {
        render(<DailyQuest {...defaultProps} />);

        const card = screen.getByText('Steps', { selector: 'span.uppercase' }).closest('button');
        fireEvent.click(card!);

        const logBtn = screen.getByText('LOG');
        expect(logBtn).toBeDisabled();

        const stepsInput = screen.getByPlaceholderText('steps');
        fireEvent.change(stepsInput, { target: { value: '100' } });
        expect(logBtn).not.toBeDisabled();
    });

    it('shows error toast when logHabitAction fails', async () => {
        const { logHabitAction } = await import('@/app/actions');
        vi.mocked(logHabitAction).mockRejectedValue(new Error('Network Error'));

        render(<DailyQuest {...defaultProps} />);
        const btn = screen.getByText(/Sleep 7\+/i).closest('button');
        fireEvent.click(btn!);

        await waitFor(() => {
            expect(mockToast.error).toHaveBeenCalledWith('Failed to log quest.');
        });
        expect(mockOnXpEarned).not.toHaveBeenCalled();
    });

    it('generates share report with stats', async () => {
        const writeTextMock = vi.fn();
        Object.assign(navigator, { clipboard: { writeText: writeTextMock } });

        const statsWithVolume = {
            power_level: 10,
            exercises_tracked: 50,
            highest_level_achieved: 5,
            total_career_xp: 5000,
            player_level: 5,
            level_progress_percent: 50,
            xp_to_next_level: 500,
            habit_no_alcohol_tracked_today: true,
            habit_no_vice_tracked_today: true,
            no_alcohol_streak: 5,
            no_vice_streak: 5,
            total_volume_today: 12500,
        };

        render(<DailyQuest {...defaultProps} stats={statsWithVolume as any} />);

        const shareBtn = screen.getByText('Share');
        fireEvent.click(shareBtn);

        expect(mockToast.success).toHaveBeenCalledWith('Report copied to clipboard!');
        const copiedText = writeTextMock.mock.calls[0][0];
        expect(copiedText).toContain('REFACTOR ATHLETICS REPORT');
        expect(copiedText).toContain('💪 Total Weight: 12,500 lbs');
        expect(copiedText).toContain('🍺 No Alcohol: 5 Days');
    });
});
