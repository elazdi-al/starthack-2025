/**
 * Maps category names to clean, Apple-like accent colors
 * Uses a hash function for consistent color assignment
 */

const APPLE_COLORS = [
  { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30" },
  { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30" },
  { bg: "bg-pink-500/15", text: "text-pink-400", border: "border-pink-500/30" },
  { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30" },
  { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30" },
  { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/30" },
  { bg: "bg-green-500/15", text: "text-green-400", border: "border-green-500/30" },
  { bg: "bg-teal-500/15", text: "text-teal-400", border: "border-teal-500/30" },
  { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/30" },
  { bg: "bg-indigo-500/15", text: "text-indigo-400", border: "border-indigo-500/30" },
];

/**
 * Simple hash function to convert string to number
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Get consistent color classes for a category
 */
export function getCategoryColor(category: string): {
  bg: string;
  text: string;
  border: string;
} {
  const normalizedCategory = category.toLowerCase().trim();
  const hash = hashString(normalizedCategory);
  const colorIndex = hash % APPLE_COLORS.length;
  return APPLE_COLORS[colorIndex];
}
