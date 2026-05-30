import React from "react";

interface AlphabetFilterProps {
  alphabetFilter: string | null;
  setAlphabetFilter: (char: string | null) => void;
}

export const AlphabetFilter: React.FC<AlphabetFilterProps> = ({
  alphabetFilter,
  setAlphabetFilter,
}) => {
  const alphabets = [...Array(26)].map((_, i) => String.fromCharCode(65 + i));

  return (
    <div className="w-[3%] bg-slate-900 flex flex-col items-center py-4 overflow-y-auto gap-1.5 border-r border-slate-950 shrink-0 scrollbar-none select-none">
      <button
        onClick={() => setAlphabetFilter(null)}
        className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center tracking-tighter transition-all ${
          !alphabetFilter
            ? "bg-orange-600 text-white shadow-md"
            : "text-slate-500 hover:text-white"
        }`}
      >
        ALL
      </button>
      {alphabets.map((char) => (
        <button
          key={char}
          onClick={() =>
            setAlphabetFilter(char === alphabetFilter ? null : char)
          }
          className={`w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center transition-all ${
            char === alphabetFilter
              ? "bg-orange-600 text-white shadow shadow-orange-500/50 scale-110"
              : "text-slate-400 hover:text-white"
          }`}
        >
          {char}
        </button>
      ))}
    </div>
  );
};
