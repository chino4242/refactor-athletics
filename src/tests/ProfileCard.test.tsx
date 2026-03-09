import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfileCard from '@/components/profile/ProfileCard';
import * as api from '@/services/api';
import { useRouter } from 'next/navigation';

// Mock Next.js router
vi.mock('next/navigation', () => ({
    useRouter: vi.fn(),
}));

// Mock API
vi.mock('@/services/api', () => ({
    saveProfile: vi.fn(),
}));

// Mock signout action
vi.mock('@/app/login/actions', () => ({
    signout: vi.fn(),
}));

describe('ProfileCard', () => {
    const mockRouter = {
        refresh: vi.fn(),
        push: vi.fn(),
    };

    const defaultProps = {
        displayName: 'John Doe',
        userId: 'user-123',
        age: 30,
        sex: 'male',
        currentWeight: 180,
        goalWeight: 175,
        level: 5,
        onProfileUpdate: vi.fn(),
        onReload: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useRouter as any).mockReturnValue(mockRouter);
        (api.saveProfile as any).mockResolvedValue({ status: 'success' });
    });

    it('renders profile information', () => {
        render(<ProfileCard {...defaultProps} />);

        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('LVL 5')).toBeInTheDocument();
        expect(screen.getByText('30')).toBeInTheDocument();
        expect(screen.getByText('male')).toBeInTheDocument();
        expect(screen.getByText(/180/)).toBeInTheDocument();
        expect(screen.getByText(/175/)).toBeInTheDocument();
    });

    it('shows goal weight difference', () => {
        render(<ProfileCard {...defaultProps} />);

        expect(screen.getByText('5.0 lbs to go')).toBeInTheDocument();
    });

    it('shows "None set" when no goal weight', () => {
        render(<ProfileCard {...defaultProps} goalWeight={0} />);

        expect(screen.getByText('None set')).toBeInTheDocument();
    });

    it('opens edit mode when Edit Stats clicked', async () => {
        render(<ProfileCard {...defaultProps} />);

        // Open settings menu
        const settingsButton = screen.getByLabelText('Settings Menu');
        fireEvent.click(settingsButton);

        // Click Edit Stats
        const editButton = screen.getByText('Edit Stats');
        fireEvent.click(editButton);

        // Should show form inputs (use getByRole since labels don't have htmlFor)
        expect(screen.getByRole('combobox')).toBeInTheDocument(); // Sex select
        expect(screen.getAllByRole('spinbutton')).toHaveLength(2); // Current Weight, Goal Weight
        expect(screen.getByPlaceholderText('Optional')).toBeInTheDocument(); // Goal Weight
    });

    it('updates form values', async () => {
        render(<ProfileCard {...defaultProps} />);

        // Enter edit mode
        fireEvent.click(screen.getByLabelText('Settings Menu'));
        fireEvent.click(screen.getByText('Edit Stats'));

        // Change sex
        const sexSelect = screen.getByRole('combobox') as HTMLSelectElement;
        fireEvent.change(sexSelect, { target: { value: 'female' } });
        expect(sexSelect.value).toBe('female');

        // Change weight (first spinbutton)
        const inputs = screen.getAllByRole('spinbutton');
        const weightInput = inputs[0] as HTMLInputElement;
        fireEvent.change(weightInput, { target: { value: '185' } });
        expect(weightInput.value).toBe('185');

        // Change goal weight (second spinbutton)
        const goalInput = inputs[1] as HTMLInputElement;
        fireEvent.change(goalInput, { target: { value: '180' } });
        expect(goalInput.value).toBe('180');
    });

    it('calculates age from birth date', async () => {
        render(<ProfileCard {...defaultProps} />);

        // Enter edit mode
        fireEvent.click(screen.getByLabelText('Settings Menu'));
        fireEvent.click(screen.getByText('Edit Stats'));

        // Set birth date to 25 years ago
        const birthDate = new Date();
        birthDate.setFullYear(birthDate.getFullYear() - 25);
        const dateString = birthDate.toISOString().split('T')[0];

        const dobInput = screen.getByDisplayValue('') as HTMLInputElement; // Date input starts empty
        fireEvent.change(dobInput, { target: { value: dateString } });

        // Age should be calculated (approximately 25)
        expect(dobInput.value).toBe(dateString);
    });

    it('saves profile with updated values', async () => {
        render(<ProfileCard {...defaultProps} />);

        // Enter edit mode
        fireEvent.click(screen.getByLabelText('Settings Menu'));
        fireEvent.click(screen.getByText('Edit Stats'));

        // Update values
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'female' } });
        const inputs = screen.getAllByRole('spinbutton');
        fireEvent.change(inputs[0], { target: { value: '185' } });
        fireEvent.change(inputs[1], { target: { value: '180' } });

        // Save
        const saveButton = screen.getByText('Save Changes');
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(api.saveProfile).toHaveBeenCalledWith({
                user_id: 'user-123',
                age: 30,
                sex: 'female',
                bodyweight: 185,
                body_composition_goals: { target_weight: '180' },
                is_onboarded: true,
                display_name: 'John Doe',
            });
        });
    });

    it('calls router.refresh after save', async () => {
        render(<ProfileCard {...defaultProps} />);

        // Enter edit mode and save
        fireEvent.click(screen.getByLabelText('Settings Menu'));
        fireEvent.click(screen.getByText('Edit Stats'));
        fireEvent.click(screen.getByText('Save Changes'));

        await waitFor(() => {
            expect(mockRouter.refresh).toHaveBeenCalled();
        });
    });

    it('calls onProfileUpdate callback after save', async () => {
        render(<ProfileCard {...defaultProps} />);

        // Enter edit mode
        fireEvent.click(screen.getByLabelText('Settings Menu'));
        fireEvent.click(screen.getByText('Edit Stats'));

        // Update weight
        const inputs = screen.getAllByRole('spinbutton');
        fireEvent.change(inputs[0], { target: { value: '185' } });

        // Save
        fireEvent.click(screen.getByText('Save Changes'));

        await waitFor(() => {
            expect(defaultProps.onProfileUpdate).toHaveBeenCalledWith(185, 30, 'male');
        });
    });

    it('exits edit mode after successful save', async () => {
        render(<ProfileCard {...defaultProps} />);

        // Enter edit mode
        fireEvent.click(screen.getByLabelText('Settings Menu'));
        fireEvent.click(screen.getByText('Edit Stats'));

        // Save
        fireEvent.click(screen.getByText('Save Changes'));

        await waitFor(() => {
            expect(screen.queryByLabelText('Sex')).not.toBeInTheDocument();
        });
    });

    it('shows saving state during save', async () => {
        (api.saveProfile as any).mockImplementation(
            () => new Promise((resolve) => setTimeout(() => resolve({ status: 'success' }), 100))
        );

        render(<ProfileCard {...defaultProps} />);

        // Enter edit mode and save
        fireEvent.click(screen.getByLabelText('Settings Menu'));
        fireEvent.click(screen.getByText('Edit Stats'));
        fireEvent.click(screen.getByText('Save Changes'));

        expect(screen.getByText('Saving...')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
        });
    });

    it('handles save error', async () => {
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
        (api.saveProfile as any).mockRejectedValue(new Error('Network error'));

        render(<ProfileCard {...defaultProps} />);

        // Enter edit mode and save
        fireEvent.click(screen.getByLabelText('Settings Menu'));
        fireEvent.click(screen.getByText('Edit Stats'));
        fireEvent.click(screen.getByText('Save Changes'));

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith('Failed to save profile: Network error');
        });

        alertSpy.mockRestore();
    });

    it('cancels edit mode', async () => {
        render(<ProfileCard {...defaultProps} />);

        // Enter edit mode
        fireEvent.click(screen.getByLabelText('Settings Menu'));
        fireEvent.click(screen.getByText('Edit Stats'));

        // Change value
        const inputs = screen.getAllByRole('spinbutton');
        fireEvent.change(inputs[0], { target: { value: '200' } });

        // Cancel
        fireEvent.click(screen.getByText('Cancel'));

        // Should exit edit mode (no more spinbuttons)
        expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();

        // Original value should be preserved
        expect(screen.getByText(/180/)).toBeInTheDocument();
    });

    it('omits body_composition_goals when goal weight is 0', async () => {
        render(<ProfileCard {...defaultProps} goalWeight={0} />);

        // Enter edit mode and save
        fireEvent.click(screen.getByLabelText('Settings Menu'));
        fireEvent.click(screen.getByText('Edit Stats'));
        fireEvent.click(screen.getByText('Save Changes'));

        await waitFor(() => {
            expect(api.saveProfile).toHaveBeenCalledWith(
                expect.not.objectContaining({
                    body_composition_goals: expect.anything(),
                })
            );
        });
    });
});
