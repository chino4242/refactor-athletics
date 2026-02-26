"use client";

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
    startDate: Date | null;
    endDate: Date | null;
    onChange: (start: Date | null, end: Date | null) => void;
    minDate?: Date;
    maxDate?: Date;
    selectionMode?: 'single' | 'range';
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarPicker({
    startDate,
    endDate,
    onChange,
    minDate,
    maxDate,
    selectionMode = 'range'
}: Props) {
    const [viewDate, setViewDate] = useState(startDate || new Date());

    // Sync view if start date changes externally and we aren't looking at it? 
    // basic "keep alive" check
    useEffect(() => {
        if (startDate && startDate.getMonth() !== viewDate.getMonth()) {
            setViewDate(startDate);
        }
    }, [startDate]); // Logic can be debated, but useful for initial open

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const currentMonth = viewDate.getMonth();
    const currentYear = viewDate.getFullYear();
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const startDay = getFirstDayOfMonth(currentYear, currentMonth);

    const handlePrevMonth = () => {
        setViewDate(new Date(currentYear, currentMonth - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(currentYear, currentMonth + 1, 1));
    };

    const isSameDate = (d1: Date | null, d2: Date) => {
        if (!d1) return false;
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    const isDateInRange = (d: Date) => {
        if (selectionMode === 'single') return false;
        if (!startDate || !endDate) return false;
        // Strip time for comparison
        const t = d.getTime();
        const s = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
        const e = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
        return t > s && t < e;
    };

    const isDateDisabled = (d: Date) => {
        // Strip time for clean comparison
        const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

        if (minDate) {
            const min = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()).getTime();
            if (t < min) return true;
        }
        if (maxDate) {
            const max = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()).getTime();
            if (t > max) return true;
        }
        return false;
    };

    const handleDateClick = (day: number) => {
        const clickedDate = new Date(currentYear, currentMonth, day);
        if (isDateDisabled(clickedDate)) return;

        if (selectionMode === 'single') {
            onChange(clickedDate, null);
            return;
        }

        // Range Logic:
        if (!startDate || (startDate && endDate)) {
            onChange(clickedDate, null);
        } else if (startDate && !endDate) {
            if (clickedDate < startDate) {
                onChange(clickedDate, null);
            } else {
                onChange(startDate, clickedDate);
            }
        }
    };

    return (
        <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 select-none">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={handlePrevMonth}
                    className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                >
                    <ChevronLeft size={16} />
                </button>
                <div className="text-sm font-bold text-zinc-200">
                    {MONTHS[currentMonth]} {currentYear}
                </div>
                <button
                    onClick={handleNextMonth}
                    className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS.map(day => (
                    <div key={day} className="text-center text-[10px] font-bold text-zinc-500 uppercase">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startDay }).map((_, i) => (
                    <div key={`empty-${i}`} />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const date = new Date(currentYear, currentMonth, day);
                    const isStart = isSameDate(startDate, date);
                    const isEnd = isSameDate(endDate, date);
                    const inRange = isDateInRange(date);
                    const isToday = isSameDate(new Date(), date);
                    const disabled = isDateDisabled(date);

                    let bgClass = 'hover:bg-zinc-800 text-zinc-300';
                    if (disabled) {
                        bgClass = 'text-zinc-700 cursor-not-allowed hover:bg-transparent';
                    } else if (isStart || isEnd) {
                        bgClass = 'bg-orange-500 text-white shadow-lg shadow-orange-900/50';
                    } else if (inRange) {
                        bgClass = 'bg-orange-500/20 text-orange-200';
                    } else if (isToday) {
                        bgClass = 'bg-zinc-800 text-white font-bold border border-zinc-700';
                    }

                    // Rounding logic for visual connection
                    let roundedClass = 'rounded-lg';
                    if (inRange) roundedClass = 'rounded-none';
                    if (isStart && endDate && selectionMode === 'range') roundedClass = 'rounded-l-lg rounded-r-none';
                    if (isEnd && startDate && selectionMode === 'range') roundedClass = 'rounded-r-lg rounded-l-none';

                    return (
                        <button
                            key={day}
                            onClick={() => handleDateClick(day)}
                            disabled={disabled}
                            className={`
                                h-8 w-full flex items-center justify-center text-xs transition-all relative
                                ${bgClass}
                                ${roundedClass}
                            `}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
