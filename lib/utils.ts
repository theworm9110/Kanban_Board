import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(...inputs);
}

const USER_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1',
];

export function getUserColor(index: number) {
  return USER_COLORS[index % USER_COLORS.length];
}
