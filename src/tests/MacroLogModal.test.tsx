import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import MacroLogModal from '@/components/MacroLogModal';

describe('MacroLogModal Component', () => {
    const mockOnClose = vi.fn();
    const mockOnLog = vi.fn().mockResolvedValue(undefined);
    const mockTotals = {
        macro_protein: 100,
        macro_carbs: 150,
        macro_fat: 50,
        habit_water: 64,
    };

    const defaultProps = {
        isOpen: true,
        onClose: mockOnClose,
        onLog: mockOnLog,
        totals: mockTotals,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders when isOpen is true', async () => {
        await act(async () => {
            render(<MacroLogModal {...defaultProps} />);
        });
        expect(screen.getByText(/Set Nutrition Totals/)).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
        render(<MacroLogModal {...defaultProps} isOpen={false} />);
        expect(screen.queryByText(/Set Nutrition Totals/)).not.toBeInTheDocument();
    });

    it('renders all macro input fields', async () => {
        await act(async () => {
            render(<MacroLogModal {...defaultProps} />);
        });
        expect(screen.getByText(/Carbs/i)).toBeInTheDocument();
        expect(screen.getByText(/Fat/i)).toBeInTheDocument();
        expect(screen.getByText(/Protein/i)).toBeInTheDocument();
        expect(screen.getByText(/Water/i)).toBeInTheDocument();
    });

    it('allows user to input macro values', async () => {
        await act(async () => {
            render(<MacroLogModal {...defaultProps} />);
        });

        const inputs = screen.getAllByRole('spinbutton');
        const proteinInput = inputs[2]; // Third input is protein
        await act(async () => {
            fireEvent.change(proteinInput, { target: { value: '150' } });
        });
        expect(proteinInput).toHaveValue(150);
    });

    it('logs all macros when Set Totals button is clicked', async () => {
        await act(async () => {
            render(<MacroLogModal {...defaultProps} />);
        });

        // Fill in values
        const inputs = screen.getAllByRole('spinbutton');
        const carbsInput = inputs[0];
        const fatInput = inputs[1];
        const proteinInput = inputs[2];

        await act(async () => {
            fireEvent.change(proteinInput, { target: { value: '150' } });
            fireEvent.change(carbsInput, { target: { value: '200' } });
            fireEvent.change(fatInput, { target: { value: '60' } });
        });

        const setTotalsButton = screen.getByText('Set Totals');
        await act(async () => {
            fireEvent.click(setTotalsButton);
        });

        await waitFor(() => {
            expect(mockOnLog).toHaveBeenCalledWith('protein', 150);
            expect(mockOnLog).toHaveBeenCalledWith('carbs', 200);
            expect(mockOnLog).toHaveBeenCalledWith('fat', 60);
        });
    });

    it('closes modal after logging all macros', async () => {
        await act(async () => {
            render(<MacroLogModal {...defaultProps} />);
        });

        const inputs = screen.getAllByRole('spinbutton');
        const proteinInput = inputs[2];
        await act(async () => {
            fireEvent.change(proteinInput, { target: { value: '150' } });
        });

        const setTotalsButton = screen.getByText('Set Totals');
        await act(async () => {
            fireEvent.click(setTotalsButton);
        });

        await waitFor(() => {
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it('clears input fields after logging', async () => {
        await act(async () => {
            render(<MacroLogModal {...defaultProps} />);
        });

        const inputs = screen.getAllByRole('spinbutton');
        const proteinInput = inputs[2];
        await act(async () => {
            fireEvent.change(proteinInput, { target: { value: '150' } });
        });

        const setTotalsButton = screen.getByText('Set Totals');
        await act(async () => {
            fireEvent.click(setTotalsButton);
        });

        await waitFor(() => {
            expect(proteinInput).toHaveValue(null);
        });
    });

    it('only logs macros with values greater than 0', async () => {
        await act(async () => {
            render(<MacroLogModal {...defaultProps} />);
        });

        const inputs = screen.getAllByRole('spinbutton');
        const proteinInput = inputs[2];
        await act(async () => {
            fireEvent.change(proteinInput, { target: { value: '150' } });
        });

        const setTotalsButton = screen.getByText('Set Totals');
        await act(async () => {
            fireEvent.click(setTotalsButton);
        });

        await waitFor(() => {
            expect(mockOnLog).toHaveBeenCalledTimes(1);
            expect(mockOnLog).toHaveBeenCalledWith('protein', 150);
        });
    });

    it('logs water when quick-add button is clicked', async () => {
        await act(async () => {
            render(<MacroLogModal {...defaultProps} />);
        });

        const quickAdd16 = screen.getByText('+16');
        await act(async () => {
            fireEvent.click(quickAdd16);
        });

        await waitFor(() => {
            // Water quick-add is additive: current 64 + 16 = 80
            expect(mockOnLog).toHaveBeenCalledWith('water', 80);
        });
    });

    it('closes modal when X button is clicked', async () => {
        await act(async () => {
            render(<MacroLogModal {...defaultProps} />);
        });

        const closeButton = screen.getByRole('button', { name: '' }).closest('button');
        await act(async () => {
            fireEvent.click(closeButton!);
        });

        expect(mockOnClose).toHaveBeenCalled();
    });

    it('does not log if no values are entered', async () => {
        await act(async () => {
            render(<MacroLogModal {...defaultProps} />);
        });

        const setTotalsButton = screen.getByText('Set Totals');
        await act(async () => {
            fireEvent.click(setTotalsButton);
        });

        expect(mockOnLog).not.toHaveBeenCalled();
        expect(mockOnClose).not.toHaveBeenCalled();
    });
});
