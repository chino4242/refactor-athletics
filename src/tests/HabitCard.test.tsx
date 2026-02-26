import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HabitCard from '../components/HabitCard';

describe('HabitCard - Quick Add Buttons', () => {
  const mockOnLog = vi.fn();

  it('renders quick-add buttons when in edit mode', () => {
    render(
      <HabitCard
        habitId="test_habit"
        label="Steps"
        current={0}
        goal={10000}
        unit="steps"
        colorClass="bg-orange-500"
        onLog={mockOnLog}
      />
    );

    // Click to enter edit mode
    fireEvent.click(screen.getByText(/Steps/i));

    // Check for quick-add buttons
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByText('+5')).toBeInTheDocument();
    expect(screen.getByText('+10')).toBeInTheDocument();
    expect(screen.getByText('+25')).toBeInTheDocument();
  });

  it('increments value when quick-add button is clicked', () => {
    render(
      <HabitCard
        habitId="test_habit"
        label="Steps"
        current={0}
        goal={10000}
        unit="steps"
        colorClass="bg-orange-500"
        onLog={mockOnLog}
      />
    );

    fireEvent.click(screen.getByText(/Steps/i));

    // Click +5 button
    const plus5Button = screen.getByText('+5');
    fireEvent.click(plus5Button);

    // Input should now have value 5
    const input = screen.getByPlaceholderText('steps') as HTMLInputElement;
    expect(input.value).toBe('5');
  });

  it('accumulates multiple quick-add clicks', () => {
    render(
      <HabitCard
        habitId="test_habit"
        label="Steps"
        current={0}
        goal={10000}
        unit="steps"
        colorClass="bg-orange-500"
        onLog={mockOnLog}
      />
    );

    fireEvent.click(screen.getByText(/Steps/i));

    // Click +10 twice
    const plus10Button = screen.getByText('+10');
    fireEvent.click(plus10Button);
    fireEvent.click(plus10Button);

    const input = screen.getByPlaceholderText('steps') as HTMLInputElement;
    expect(input.value).toBe('20');
  });

  it('submits accumulated value when LOG button is clicked', () => {
    render(
      <HabitCard
        habitId="test_habit"
        label="Steps"
        current={0}
        goal={10000}
        unit="steps"
        colorClass="bg-orange-500"
        onLog={mockOnLog}
      />
    );

    fireEvent.click(screen.getByText(/Steps/i));

    // Add values
    fireEvent.click(screen.getByText('+5'));
    fireEvent.click(screen.getByText('+10'));

    // Submit
    fireEvent.click(screen.getByText('LOG'));

    expect(mockOnLog).toHaveBeenCalledWith(15, 'Steps');
  });

  it('has proper touch target sizes for buttons', () => {
    render(
      <HabitCard
        habitId="test_habit"
        label="Steps"
        current={0}
        goal={10000}
        unit="steps"
        colorClass="bg-orange-500"
        onLog={mockOnLog}
      />
    );

    fireEvent.click(screen.getByText(/Steps/i));

    const plus5Button = screen.getByText('+5');
    const computedStyle = window.getComputedStyle(plus5Button);
    
    // Check that button has py-2 (0.5rem = 8px) minimum
    expect(plus5Button.className).toContain('py-2');
  });
});
