import { useState } from 'react';

interface ChecklistViewProps {
  block: any;
  blockIndex?: number;
  totalBlocks?: number;
  onComplete: (skipped?: boolean) => void;
}

export default function ChecklistView({ block, onComplete, blockIndex = 0, totalBlocks = 0 }: ChecklistViewProps) {
  const [checkedItems, setCheckedItems] = useState<number[]>([]);
  const [expandedItems, setExpandedItems] = useState<number[]>([]);

  const toggleCheck = (index: number) => {
    if (checkedItems.includes(index)) {
      setCheckedItems(checkedItems.filter(i => i !== index));
    } else {
      setCheckedItems([...checkedItems, index]);
    }
  };

  const toggleExpand = (index: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent ensuring only one action happens
    if (expandedItems.includes(index)) {
      setExpandedItems(expandedItems.filter(i => i !== index));
    } else {
      setExpandedItems([...expandedItems, index]);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto h-[80vh] md:h-[600px] bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative border border-zinc-800">

      {/* HEADER: Uses block.name */}
      <div className="bg-zinc-800/50 p-6 border-b border-zinc-700 shrink-0">
        <h2 className="text-orange-500 font-bold uppercase tracking-widest text-xs mb-1">
          {block.type === 'list' ? 'Self-Paced Block' : 'Checklist'}
        </h2>
        <h1 className="text-white text-2xl font-black italic leading-tight">
          {block.name}
        </h1>
      </div>

      {/* SCROLLABLE LIST: Uses block.intervals */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
        {block.intervals.map((item: any, index: number) => {

          // 1. SUBHEADINGS (Orange text, no checkbox)
          if (item.type === 'subheading') {
            return (
              <div key={index} className="px-2 pt-2 pb-1">
                <p className={`font-bold italic text-sm uppercase tracking-wide ${item.color || 'text-orange-400'}`}>
                  {item.text}
                </p>
              </div>
            );
          }

          // 1.5 HEADERS (White large text, no checkbox)
          if (item.type === 'header') {
            return (
              <div key={index} className="px-2 pt-4 pb-2">
                <h3 className="font-black text-xl text-white uppercase italic">
                  {item.text}
                </h3>
              </div>
            );
          }

          // 2. STANDARD CHECKBOX CARD (or Summary Accordion)
          const isChecked = checkedItems.includes(index);
          const isExpanded = expandedItems.includes(index);
          const hasDetails = item.details && item.details.length > 0;

          return (
            <div
              key={index}
              onClick={(e) => hasDetails ? toggleExpand(index, e) : toggleCheck(index)}
              className={`
                relative p-4 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden
                ${isChecked ? 'opacity-40 bg-zinc-950 border-zinc-900' : 'opacity-100'}
                ${item.color || 'bg-zinc-800/50 border-zinc-700'}
              `}
            >
              <div className="flex items-start gap-4 justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {/* Checkbox (Hide if summary item) */}
                  {!hasDetails && (
                    <div className={`
                        mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0
                        ${isChecked ? 'bg-green-500 border-green-500' : 'border-zinc-600'}
                        `}>
                      {isChecked && <span className="text-black font-bold text-xs">✓</span>}
                    </div>
                  )}

                  <div className="flex-1">
                    <p className={`text-sm font-medium text-zinc-200 ${isChecked ? 'line-through text-zinc-500' : ''}`}>
                      {item.text}
                    </p>
                  </div>
                </div>

                {/* Chevron for Details */}
                {hasDetails && (
                  <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                )}
              </div>

              {/* DETAILS PANEL */}
              {isExpanded && hasDetails && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-2 animate-fade-in">
                  {item.details.map((line: string, i: number) => (
                    <div key={i} className="flex gap-2 text-xs text-zinc-400">
                      <span className="text-orange-500/50">•</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FOOTER BUTTON */}
      <div className="p-4 bg-zinc-900 border-t border-zinc-800 shrink-0">
        <button
          onClick={() => onComplete(false)} // Explicitly false for normal completion
          className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black italic tracking-wider uppercase rounded-xl transition-all active:scale-95 shadow-lg shadow-orange-900/20"
        >
          {blockIndex === 0 ? "Start Workout ->" : (
            totalBlocks && blockIndex === totalBlocks - 1 ? "Finish Workout ->" : "Complete Block ->"
          )}
        </button>

        {/* Skip Button */}
        <div className="mt-3 text-center">
          <button
            onClick={() => onComplete(true)} // True for skipped
            className="text-zinc-500 text-xs font-bold uppercase tracking-widest hover:text-red-500 transition-colors px-4 py-2"
          >
            Skip Block (No XP)
          </button>
        </div>
      </div>
    </div>
  );
}