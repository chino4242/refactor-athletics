import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HabitCard from '../components/HabitCard';

describe('HabitCard', () => {
  const mockOnLog = vi.fn();

  it('renders label and progress', () => {
    render(
      <HabitCard habitId="test" label="Sleep" current={6} goal={8} unit="hrs" colorClass="bg-purple-500" onLog={mockOnLog} />
    );
    expect(screen.getByText('Sleep')).toBeInTheDocument();
    expect(screen.getByText(/6/)).toBeInTheDocument();
  });

  it('enters edit mode on click and submits value', () => {
    render(
      <HabitCard habitId="test" label="Sleep" current={0} goal={8} unit="hrs" colorClass="bg-purple-500" onLog={mockOnLog} />
    );
    fireEvent.click(screen.getByText('Sleep'));
    const input = screen.getByPlaceholderText('hrs');
    fireEvent.change(input, { target: { value: '7.5' } });
    fireEvent.click(screen.getByText('LOG'));
    expect(mockOnLog).toHaveBeenCalledWith(7.5, 'Sleep');
  });

  it('renders week dots when provided', () => {
    const { container } = render(
      <HabitCard habitId="test" label="Sleep" current={8} goal={8} unit="hrs" colorClass="bg-purple-500" onLog={mockOnLog} weekDots={[true, false, true, true, false, true, true]} />
    );
    const dots = container.querySelectorAll('[class*="rounded-full"][class*="w-1"]');
    expect(dots.length).toBe(7);
  });
});
