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

    const switchToManualTab = async () => {
        const tab = screen.getByRole('button', { name: /Set Totals/i });
        await act(async () => { fireEvent.click(tab); });
    };

    it('renders when isOpen is true', async () => {
        await act(async () => {
            render(<MacroLogModal {...defaultProps} />);
        });
        expect(screen.getByText(/Log Nutrition/)).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
        render(<MacroLogModal {...defaultProps} isOpen={false} />);
        expect(screen.queryByText(/Log Nutrition/)).not.toBeInTheDocument();
    });

    it('renders all macro input fields', async () => {
        await act(async () => {
            render(<MacroLogModal {...defaultProps} />);
        });
        await switchToManualTab();
        expect(screen.getByText(/Carbs/i)).toBeInTheDocument();
        expect(screen.getByText(/Fat/i)).toBeInTheDocument();
        expect(screen.getByText(/Protein/i)).toBeInTheDocument();
        expect(screen.getByText(/Water/i)).toBeInTheDocument();
    });

    it('allows user to input macro values', async () => {
        await act(async () => {
            render(<MacroLogModal {...defaultProps} />);
        });
        await switchToManualTab();

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
        await switchToManualTab();

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

        const setTotalsButtons = screen.getAllByText('Set Totals');
        await act(async () => {
            fireEvent.click(setTotalsButtons[setTotalsButtons.length - 1]);
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
        await switchToManualTab();

        const inputs = screen.getAllByRole('spinbutton');
        const proteinInput = inputs[2];
        await act(async () => {
            fireEvent.change(proteinInput, { target: { value: '150' } });
        });

        const setTotalsButtons2 = screen.getAllByText('Set Totals');
        await act(async () => {
            fireEvent.click(setTotalsButtons2[setTotalsButtons2.length - 1]);
        });

        await waitFor(() => {
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it('clears input fields after logging', async () => {
        await act(async () => {
            render(<MacroLogModal {...defaultProps} />);
        });
        await switchToManualTab();

        const inputs = screen.getAllByRole('spinbutton');
        const proteinInput = inputs[2];
        await act(async () => {
            fireEvent.change(proteinInput, { target: { value: '150' } });
        });

        const setTotalsButton = screen.getAllByText('Set Totals').pop()!;
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
        await switchToManualTab();

        const inputs = screen.getAllByRole('spinbutton');
        const proteinInput = inputs[2];
        await act(async () => {
            fireEvent.change(proteinInput, { target: { value: '150' } });
        });

        const setTotalsButton = screen.getAllByText('Set Totals').pop()!;
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
        await switchToManualTab();

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

        const setTotalsButton = screen.getAllByText('Set Totals').pop()!;
        await act(async () => {
            fireEvent.click(setTotalsButton);
        });

        expect(mockOnLog).not.toHaveBeenCalled();
        expect(mockOnClose).not.toHaveBeenCalled();
    });

    describe('Meal Cart Flow', () => {
        const cartProps = { ...defaultProps, userId: 'user-123' };

        // Mock fetch for food search
        beforeEach(() => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ results: [
                    { id: 'usda_1', name: 'Chicken Breast', source: 'usda', servingSize: '100g', per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 } },
                    { id: 'usda_2', name: 'White Rice', source: 'usda', servingSize: '150g', per100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 } },
                ] }),
            }) as any;
        });

        it('adds item to cart from search results', async () => {
            await act(async () => { render(<MacroLogModal {...cartProps} />); });

            // Type in search
            const searchInput = screen.getByPlaceholderText('Search foods...');
            await act(async () => { fireEvent.change(searchInput, { target: { value: 'chicken' } }); });

            // Wait for results
            await waitFor(() => { expect(screen.getByText('Chicken Breast')).toBeInTheDocument(); });

            // Click result to select
            await act(async () => { fireEvent.click(screen.getByText('Chicken Breast')); });

            // Should show serving input and "Add to Meal" button
            await waitFor(() => { expect(screen.getByText(/Add to Meal/)).toBeInTheDocument(); });

            // Click "Add to Meal"
            await act(async () => { fireEvent.click(screen.getByText(/Add to Meal/)); });

            // Cart should show the item with macros
            await waitFor(() => { expect(screen.getByText(/Log Meal/)).toBeInTheDocument(); });
        });

        it('shows running total in cart', async () => {
            await act(async () => { render(<MacroLogModal {...cartProps} />); });

            const searchInput = screen.getByPlaceholderText('Search foods...');
            await act(async () => { fireEvent.change(searchInput, { target: { value: 'chicken' } }); });
            await waitFor(() => { expect(screen.getByText('Chicken Breast')).toBeInTheDocument(); });
            await act(async () => { fireEvent.click(screen.getByText('Chicken Breast')); });

            // Should show total with protein value after item added to cart
            await waitFor(() => { expect(screen.getByText(/Log Meal/)).toBeInTheDocument(); });
            expect(screen.getByText('Total')).toBeInTheDocument();
        });

        it('removes item from cart', async () => {
            await act(async () => { render(<MacroLogModal {...cartProps} />); });

            // Add an item
            const searchInput = screen.getByPlaceholderText('Search foods...');
            await act(async () => { fireEvent.change(searchInput, { target: { value: 'chicken' } }); });
            await waitFor(() => { expect(screen.getByText('Chicken Breast')).toBeInTheDocument(); });
            await act(async () => { fireEvent.click(screen.getByText('Chicken Breast')); });

            // Cart should have the item
            await waitFor(() => { expect(screen.getByText(/Log Meal/)).toBeInTheDocument(); });

            // Click remove (✕)
            const removeBtn = screen.getByText('✕');
            await act(async () => { fireEvent.click(removeBtn); });

            // Log Meal should disappear (empty cart)
            await waitFor(() => { expect(screen.queryByText(/Log Meal/)).not.toBeInTheDocument(); });
        });

        it('shows meal type picker when Log Meal is clicked', async () => {
            await act(async () => { render(<MacroLogModal {...cartProps} />); });

            // Add an item
            const searchInput = screen.getByPlaceholderText('Search foods...');
            await act(async () => { fireEvent.change(searchInput, { target: { value: 'chicken' } }); });
            await waitFor(() => { expect(screen.getByText('Chicken Breast')).toBeInTheDocument(); });
            await act(async () => { fireEvent.click(screen.getByText('Chicken Breast')); });

            // Click Log Meal
            await waitFor(() => { expect(screen.getByText(/Log Meal/)).toBeInTheDocument(); });
            await act(async () => { fireEvent.click(screen.getByText(/Log Meal/)); });

            // Should show meal type options
            await waitFor(() => {
                expect(screen.getByText('Breakfast')).toBeInTheDocument();
                expect(screen.getByText('Lunch')).toBeInTheDocument();
                expect(screen.getByText('Dinner')).toBeInTheDocument();
                expect(screen.getByText('Snack')).toBeInTheDocument();
            });
        });
    });
});
