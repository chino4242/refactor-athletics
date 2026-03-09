'use client';

import Link from 'next/link';

interface QuickActionButtonProps {
    label: string;
    href: string;
    onClick: () => void;
}

export default function QuickActionButton({ label, href, onClick }: QuickActionButtonProps) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className="block px-6 py-3 text-sm font-bold text-white hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-b-0"
        >
            {label}
        </Link>
    );
}
