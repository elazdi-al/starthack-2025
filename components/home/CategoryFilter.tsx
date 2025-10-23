"use client";

import { getCategoryColor } from "@/lib/utils/categoryColors";
import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  // Add "All" as the first option
  const allCategories = ["All", ...categories];

  return (
    <div className="w-full overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 px-6 pb-4 min-w-max">
        {allCategories.map((category) => {
          const isAll = category === "All";
          const isSelected = isAll
            ? selectedCategory === null
            : selectedCategory === category;
          const colors = isAll
            ? {
                bg: "bg-white/10",
                text: "text-white",
                border: "border-white/20",
              }
            : getCategoryColor(category);

          return (
            <button
              key={category}
              onClick={() => onSelectCategory(isAll ? null : category)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap border",
                "hover:scale-105 active:scale-95",
                isSelected
                  ? cn(
                      colors.bg,
                      colors.text,
                      colors.border,
                      "shadow-lg"
                    )
                  : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/80"
              )}
            >
              {category}
            </button>
          );
        })}
      </div>
    </div>
  );
}
