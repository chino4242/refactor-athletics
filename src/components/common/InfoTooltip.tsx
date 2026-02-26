import { Info } from 'lucide-react';
import { useState } from 'react';

interface InfoTooltipProps {
    text: string;
    size?: number;
    className?: string;
}

export default function InfoTooltip({ text, size = 16, className = "" }: InfoTooltipProps) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div
            className={`relative inline-flex items-center ml-2 cursor-help group ${className}`}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            onClick={() => setIsVisible(!isVisible)} // Mobile support
        >
            <Info size={size} className="text-zinc-500 hover:text-orange-500 transition-colors" />

            {isVisible && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded-lg shadow-xl z-50 animate-fade-in pointer-events-none not-italic font-normal tracking-normal normal-case leading-relaxed">
                    {text}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-zinc-900"></div>
                </div>
            )}
        </div>
    );
}
