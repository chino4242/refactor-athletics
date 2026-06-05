import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OnboardingWizard from '@/components/OnboardingWizard';

// Mock dependencies
const mockSaveProfile = vi.fn().mockResolvedValue(undefined);
const mockAssignDefaultProgram = vi.fn().mockResolvedValue(undefined);
const mockRouterRefresh = vi.fn();

vi.mock('@/services/api', () => ({
    saveProfile: (...args: any[]) => mockSaveProfile(...args),
}));

vi.mock('@/app/actions', () => ({
    assignDefaultProgram: (...args: any[]) => mockAssignDefaultProgram(...args),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: mockRouterRefresh }),
}));

vi.mock('@/app/login/actions', () => ({
    signout: vi.fn(),
}));

// Mock fetch for health sync calls
global.fetch = vi.fn().mockResolvedValue({ ok: true });

describe('OnboardingWizard — Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('cannot advance past step 1 without accepting waiver', () => {
        render(<OnboardingWizard userId="user-123" />);

        expect(screen.getByText('Liability Waiver')).toBeInTheDocument();

        const nextBtn = screen.getByRole('button', { name: /^next$/i });
        expect(nextBtn).toBeDisabled();
    });

    it('advances to step 2 after accepting waiver', () => {
        render(<OnboardingWizard userId="user-123" />);

        fireEvent.click(screen.getByRole('checkbox'));
        const nextBtn = screen.getByRole('button', { name: /^next$/i });
        expect(nextBtn).not.toBeDisabled();
        fireEvent.click(nextBtn);

        expect(screen.getByText('What brings you here?')).toBeInTheDocument();
    });

    it('step flow is: waiver → mode → personal info → goals → equipment → health sync', () => {
        render(<OnboardingWizard userId="user-123" />);

        // Step 1: Waiver
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

        // Step 2: Mode
        expect(screen.getByText('What brings you here?')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Compete & Level Up'));
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

        // Step 3: Personal info (step number 6 internally)
        expect(screen.getByText('About You')).toBeInTheDocument();
    });

    it('cannot advance past goals without selecting at least one', () => {
        render(<OnboardingWizard userId="user-123" />);

        // Navigate to goals step
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
        fireEvent.click(screen.getByText('Compete & Level Up'));
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

        // Fill personal info
        fireEvent.change(screen.getByPlaceholderText('25'), { target: { value: '28' } });
        fireEvent.change(screen.getByPlaceholderText('180'), { target: { value: '185' } });
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'male' } });
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

        // Goals step — Next should be disabled without selection
        expect(screen.getByText('Your Goals')).toBeInTheDocument();
        const nextBtn = screen.getByRole('button', { name: /^next$/i });
        expect(nextBtn).toBeDisabled();

        // Select a goal
        fireEvent.click(screen.getByText('Get stronger'));
        expect(nextBtn).not.toBeDisabled();
    });

    it('completes full onboarding and calls saveProfile with correct data', async () => {
        render(<OnboardingWizard userId="user-123" />);

        // Step 1: Waiver
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

        // Step 2: Mode (RPG)
        fireEvent.click(screen.getByText('Compete & Level Up'));
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

        // Step 3: Personal info
        fireEvent.change(screen.getByPlaceholderText('25'), { target: { value: '28' } });
        fireEvent.change(screen.getByPlaceholderText('180'), { target: { value: '185' } });
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'male' } });
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

        // Step 4: Goals
        fireEvent.click(screen.getByText('Get stronger'));
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

        // Step 5: Equipment (just advance)
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

        // Entering step 6 (Health Sync) triggers auto-save
        await waitFor(() => {
            expect(mockSaveProfile).toHaveBeenCalledWith(
                expect.objectContaining({
                    user_id: 'user-123',
                    age: 28,
                    sex: 'male',
                    bodyweight: 185,
                    experience_mode: 'rpg',
                    is_onboarded: true,
                    goals: expect.objectContaining({ motivations: ['get_stronger'] }),
                    starter_quest_progress: [],
                })
            );
        });

        await waitFor(() => {
            expect(mockAssignDefaultProgram).toHaveBeenCalledWith('user-123', 'hybrid', expect.any(Array));
        });
    });
});
