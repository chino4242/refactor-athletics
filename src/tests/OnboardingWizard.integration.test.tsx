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

        // Next button should be disabled
        const nextBtn = screen.getByRole('button', { name: /^next$/i });
        expect(nextBtn).toBeDisabled();
    });

    it('advances to step 2 after accepting waiver', () => {
        render(<OnboardingWizard userId="user-123" />);

        // Accept waiver
        const checkbox = screen.getByRole('checkbox');
        fireEvent.click(checkbox);

        // Click next
        const nextBtn = screen.getByRole('button', { name: /^next$/i });
        expect(nextBtn).not.toBeDisabled();
        fireEvent.click(nextBtn);

        // Should be on step 2
        expect(screen.getByText('What brings you here?')).toBeInTheDocument();
    });

    it('selecting Classic mode skips theme step (step 4)', () => {
        render(<OnboardingWizard userId="user-123" />);

        // Step 1: Accept waiver
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

        // Step 2: Select Classic mode
        expect(screen.getByText('What brings you here?')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Track & Improve'));
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

        // Step 3: Intro
        expect(screen.getByText(/Welcome to Refactor Athletics/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

        // Should skip step 4 (theme) and go to step 5 (path)
        expect(screen.getByText(/Choose Your Focus/)).toBeInTheDocument();
    });

    it('selecting RPG mode shows theme step (step 4)', () => {
        render(<OnboardingWizard userId="user-123" />);

        // Step 1: Accept waiver
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

        // Step 2: Select RPG mode
        fireEvent.click(screen.getByText('Compete & Level Up'));
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

        // Step 3: Intro
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

        // Step 4: Theme selection (RPG only)
        expect(screen.getByText('Choose Your Theme')).toBeInTheDocument();
    });

    it('completes full onboarding and calls saveProfile with correct data', async () => {
        render(<OnboardingWizard userId="user-123" />);

        // Step 1: Waiver
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

        // Step 2: Mode (RPG)
        fireEvent.click(screen.getByText('Compete & Level Up'));
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

        // Step 3: Intro
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

        // Step 4: Theme (default is athlete, just advance)
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

        // Step 5: Path (default is hybrid, just advance)
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

        // Step 6: Personal info
        const ageInput = screen.getByPlaceholderText('25');
        const weightInput = screen.getByPlaceholderText('180');
        fireEvent.change(ageInput, { target: { value: '28' } });
        fireEvent.change(weightInput, { target: { value: '185' } });
        // Select sex via select element
        const sexSelect = screen.getByRole('combobox');
        fireEvent.change(sexSelect, { target: { value: 'male' } });
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

        // Step 7: Goal (target weight)
        const targetInput = screen.getByPlaceholderText('170');
        fireEvent.change(targetInput, { target: { value: '175' } });
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

        // Step 8: Equipment (just advance)
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

        // Step 9: Nutrition (just advance)
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

        // Step 10: Health sync — click Complete
        const completeBtn = screen.getByRole('button', { name: /^complete$/i });
        fireEvent.click(completeBtn);

        await waitFor(() => {
            expect(mockSaveProfile).toHaveBeenCalledWith(
                expect.objectContaining({
                    user_id: 'user-123',
                    age: 28,
                    sex: 'male',
                    bodyweight: 185,
                    experience_mode: 'rpg',
                    is_onboarded: true,
                    waiver_accepted_at: expect.any(String),
                    selected_path: 'hybrid',
                })
            );
        });

        await waitFor(() => {
            expect(mockAssignDefaultProgram).toHaveBeenCalledWith('user-123', 'hybrid', expect.any(Array));
        });
    });
});
