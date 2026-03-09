import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import ScreenshotUploader from '@/components/ScreenshotUploader';

describe('ScreenshotUploader Component', () => {
    const mockOnDataExtracted = vi.fn();
    global.fetch = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders upload button', () => {
        render(<ScreenshotUploader type="nutrition" onDataExtracted={mockOnDataExtracted} />);
        expect(screen.getByText('Upload Screenshot')).toBeInTheDocument();
    });

    it('shows file input with correct accept attribute', () => {
        render(<ScreenshotUploader type="nutrition" onDataExtracted={mockOnDataExtracted} />);
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        expect(input).toHaveAttribute('accept', 'image/*');
    });

    it('has unique id based on type', () => {
        const { rerender } = render(<ScreenshotUploader type="nutrition" onDataExtracted={mockOnDataExtracted} />);
        expect(document.querySelector('#screenshot-upload-nutrition')).toBeInTheDocument();

        rerender(<ScreenshotUploader type="workout" onDataExtracted={mockOnDataExtracted} />);
        expect(document.querySelector('#screenshot-upload-workout')).toBeInTheDocument();
    });

    it('handles file selection and upload', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            status: 200,
            json: async () => ({ success: true, data: { protein: 150 } }),
        });

        render(<ScreenshotUploader type="nutrition" onDataExtracted={mockOnDataExtracted} />);

        const file = new File(['dummy'], 'test.png', { type: 'image/png' });
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;

        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/parse-screenshot', expect.objectContaining({
                method: 'POST',
                body: expect.any(FormData),
            }));
        });
    });

    it('shows loading state during upload', async () => {
        (global.fetch as any).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

        render(<ScreenshotUploader type="nutrition" onDataExtracted={mockOnDataExtracted} />);

        const file = new File(['dummy'], 'test.png', { type: 'image/png' });
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;

        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => {
            expect(screen.getByText('Parsing...')).toBeInTheDocument();
        });
    });

    it('calls onDataExtracted with parsed data on success', async () => {
        const mockData = { protein: 150, carbs: 200, fat: 60 };
        (global.fetch as any).mockResolvedValueOnce({
            status: 200,
            json: async () => ({ success: true, data: mockData }),
        });

        render(<ScreenshotUploader type="nutrition" onDataExtracted={mockOnDataExtracted} />);

        const file = new File(['dummy'], 'test.png', { type: 'image/png' });
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;

        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => {
            expect(mockOnDataExtracted).toHaveBeenCalledWith(mockData);
        });
    });

    it('sends correct type in FormData', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            status: 200,
            json: async () => ({ success: true, data: {} }),
        });

        render(<ScreenshotUploader type="workout" onDataExtracted={mockOnDataExtracted} />);

        const file = new File(['dummy'], 'test.png', { type: 'image/png' });
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;

        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => {
            const formData = (global.fetch as any).mock.calls[0][1].body as FormData;
            expect(formData.get('type')).toBe('workout');
        });
    });

    it('handles API error response', async () => {
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
        (global.fetch as any).mockResolvedValueOnce({
            status: 200,
            json: async () => ({ success: false, error: 'Invalid image format' }),
        });

        render(<ScreenshotUploader type="nutrition" onDataExtracted={mockOnDataExtracted} />);

        const file = new File(['dummy'], 'test.png', { type: 'image/png' });
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;

        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith('Failed to parse screenshot: Invalid image format');
        });

        alertSpy.mockRestore();
    });

    it('handles network error', async () => {
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
        (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

        render(<ScreenshotUploader type="nutrition" onDataExtracted={mockOnDataExtracted} />);

        const file = new File(['dummy'], 'test.png', { type: 'image/png' });
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;

        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith('Failed to upload screenshot: Network error');
        });

        alertSpy.mockRestore();
    });

    it('disables input during upload', async () => {
        (global.fetch as any).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

        render(<ScreenshotUploader type="nutrition" onDataExtracted={mockOnDataExtracted} />);

        const file = new File(['dummy'], 'test.png', { type: 'image/png' });
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;

        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => {
            expect(input).toBeDisabled();
        });
    });

    it('does nothing when no file is selected', () => {
        render(<ScreenshotUploader type="nutrition" onDataExtracted={mockOnDataExtracted} />);

        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        fireEvent.change(input, { target: { files: [] } });

        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('renders label with correct htmlFor attribute', () => {
        render(<ScreenshotUploader type="nutrition" onDataExtracted={mockOnDataExtracted} />);
        const label = document.querySelector('label[for="screenshot-upload-nutrition"]');
        expect(label).toBeInTheDocument();
    });

    it('handles different screenshot types', () => {
        const { rerender } = render(<ScreenshotUploader type="nutrition" onDataExtracted={mockOnDataExtracted} />);
        expect(document.querySelector('#screenshot-upload-nutrition')).toBeInTheDocument();

        rerender(<ScreenshotUploader type="habits" onDataExtracted={mockOnDataExtracted} />);
        expect(document.querySelector('#screenshot-upload-habits')).toBeInTheDocument();
    });
});
