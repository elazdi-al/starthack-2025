"use client";

import { MagnifyingGlass, X } from "phosphor-react";
import { useState, useCallback } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({ onSearch, placeholder = "Search events..." }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    onSearch(value);
  }, [onSearch]);

  const handleClear = useCallback(() => {
    setSearchQuery("");
    onSearch("");
  }, [onSearch]);

  return (
    <div className="relative w-full max-w-2xl">
      <div className="relative flex items-center">
        <MagnifyingGlass
          size={20}
          weight="regular"
          className="absolute left-4 text-white/40 pointer-events-none z-10"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-full pl-12 pr-12 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-4 text-white/40 hover:text-white/80 transition-colors"
            aria-label="Clear search"
          >
            <X size={20} weight="regular" />
          </button>
        )}
      </div>
    </div>
  );
}
