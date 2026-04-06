import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import BodyCompositionModal from '@/components/BodyCompositionModal';
import type { UserProfileData } from '@/types';

// Mock recharts to avoid canvas issues in tests
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    LineChart: ({ children }: any) => <div>{children}</div>,
    Line: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
}));

// Mock BodyCompositionService
const mockGetHistory = vi.fn();
const mockLogMeasurements = vi.fn();
vi.mock('@/services/BodyCompositionService', () => ({
    BodyCompositionService: {
        getHistory: (...args: any[]) => mockGetHistory(...args),
        logMeasurements: (...args: any[]) => mockLogMeasurements(...args),
    },
}));

// Mock calculatePhysiquePoints
vi.mock('@/utils/physiquePoints', () => ({
    calculatePhysiquePoints: vi.fn(() => ({ score: 0, status: 'No Data', color: 'text-zinc-400' })),
}));

const baseProfile: UserProfileData = {
    user_id: 'user-1',
    age: 30,
    sex: 'male',
    bodyweight: 185,
    body_composition_goals: { waist: 'Shrink', arms: 'Grow', weight: 'Shrink' },
    nutrition_targets: { protein: 150, carbs: 200, fat: 60, calories: 1940, water: 100 },
    hidden_habits: [],
};

const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    profile: baseProfile,
    setProfile: vi.fn(),
    saveProfile: vi.fn().mockResolvedValue({}),
    handleLog: vi.fn().mockResolvedValue(undefined),
    totals: {},
    loading: null as string | null,
    setLoading: vi.fn(),
    toast: { success: vi.fn(), error: vi.fn() },
};

describe('BodyCompositionModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetHistory.mockResolvedValue([]);
        mockLogMeasurements.mockResolvedValue(undefined);
    });

    it('does not render when isOpen is false', () => {
        render(<BodyCompositionModal {...defaultProps} isOpen={false} />);
        expect(screen.queryByText('Body Composition')).not.toBeInTheDocument();
    });

    it('renders when isOpen is true', async () => {
        render(<BodyCompositionModal {...defaultProps} />);
        await waitFor(() => {
            expect(screen.getByText('Body Composition')).toBeInTheDocument();
        });
    });

    it('renders all measurement rows', async () => {
        render(<BodyCompositionModal {...defaultProps} />);
        await waitFor(() => {
            expect(screen.getByText('Weight')).toBeInTheDocument();
            expect(screen.getByText('Waist')).toBeInTheDocument();
            expect(screen.getByText('Arms')).toBeInTheDocument();
            expect(screen.getByText('Chest')).toBeInTheDocument();
            expect(screen.getByText('Legs')).toBeInTheDocument();
            expect(screen.getByText('Shoulders')).toBeInTheDocument();
        });
    });

    it('loads history on open', async () => {
        render(<BodyCompositionModal {...defaultProps} />);
        await waitFor(() => {
            expect(mockGetHistory).toHaveBeenCalledWith('user-1');
        });
    });

    it('logs measurement and refreshes history', async () => {
        mockGetHistory.mockResolvedValue([]);
        mockLogMeasurements.mockResolvedValue(undefined);

        render(<BodyCompositionModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText('Waist')).toBeInTheDocument();
        });

        // Find the waist input and type a value
        const inputs = screen.getAllByRole('spinbutton');
        const waistInput = inputs[1]; // Weight is first, Waist is second
        fireEvent.change(waistInput, { target: { value: '36' } });

        // Click the Log button next to it
        const logButtons = screen.getAllByText('Log');
        fireEvent.click(logButtons[1]);

        await waitFor(() => {
            expect(mockLogMeasurements).toHaveBeenCalledWith('user-1', expect.any(String), { waist: 36, measurement_mode: 'tape' });
        });

        // History should be reloaded after logging
        await waitFor(() => {
            expect(mockGetHistory).toHaveBeenCalledTimes(2); // initial + after log
        });
    });

    it('updates profile bodyweight when weight is logged', async () => {
        render(<BodyCompositionModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText('Weight')).toBeInTheDocument();
        });

        const inputs = screen.getAllByRole('spinbutton');
        const weightInput = inputs[0];
        fireEvent.change(weightInput, { target: { value: '180' } });

        const logButtons = screen.getAllByText('Log');
        fireEvent.click(logButtons[0]);

        await waitFor(() => {
            expect(defaultProps.saveProfile).toHaveBeenCalledWith(
                expect.objectContaining({ bodyweight: 180 })
            );
        });
    });

    it('also logs habit for streak tracking', async () => {
        render(<BodyCompositionModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText('Waist')).toBeInTheDocument();
        });

        const inputs = screen.getAllByRole('spinbutton');
        fireEvent.change(inputs[1], { target: { value: '36' } });

        const logButtons = screen.getAllByText('Log');
        fireEvent.click(logButtons[1]);

        await waitFor(() => {
            expect(defaultProps.handleLog).toHaveBeenCalledWith('habit_measure_waist', 1, 'Waist');
        });
    });

    it('shows toast on successful log', async () => {
        render(<BodyCompositionModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText('Arms')).toBeInTheDocument();
        });

        const inputs = screen.getAllByRole('spinbutton');
        fireEvent.change(inputs[2], { target: { value: '15' } });

        const logButtons = screen.getAllByText('Log');
        fireEvent.click(logButtons[2]);

        await waitFor(() => {
            expect(defaultProps.toast.success).toHaveBeenCalledWith('Logged Arms');
        });
    });

    it('shows error toast on failure', async () => {
        mockLogMeasurements.mockRejectedValue(new Error('DB error'));

        render(<BodyCompositionModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText('Waist')).toBeInTheDocument();
        });

        const inputs = screen.getAllByRole('spinbutton');
        fireEvent.change(inputs[1], { target: { value: '36' } });

        const logButtons = screen.getAllByText('Log');
        fireEvent.click(logButtons[1]);

        await waitFor(() => {
            expect(defaultProps.toast.error).toHaveBeenCalledWith('Failed to save');
        });
    });

    it('saves goal change to profile', async () => {
        const noGoalProfile = { ...baseProfile, body_composition_goals: {} };
        const saveSpy = vi.fn().mockResolvedValue({});

        render(<BodyCompositionModal
            {...defaultProps}
            profile={noGoalProfile}
            saveProfile={saveSpy}
        />);

        await waitFor(() => {
            expect(screen.getByText('Weight')).toBeInTheDocument();
        });

        // Find all goal selector buttons (they contain goal text like Maintain/Shrink)
        // Click the first one to open its dropdown
        const goalButtons = screen.getAllByRole('button').filter(
            btn => btn.textContent?.includes('Maintain') || btn.textContent?.includes('Shrink')
        );
        // First goal button is Weight's "Maintain"
        fireEvent.click(goalButtons[0]);

        // Wait for dropdown, then click "Grow" (unique, only appears in dropdown)
        await waitFor(() => {
            expect(screen.getByText('Grow')).toBeInTheDocument();
        });
        fireEvent.click(screen.getByText('Grow'));

        await waitFor(() => {
            expect(saveSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    body_composition_goals: expect.objectContaining({ weight: 'Grow' })
                })
            );
        });
    });
});
