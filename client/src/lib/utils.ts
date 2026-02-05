import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function parseDecimalBR(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value).trim();
  if (str === '' || str === '--') return null;
  const normalized = str.replace(',', '.');
  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}

export function formatDecimalBR(value: string | number | null | undefined, decimals: number = 2): string {
  const num = parseDecimalBR(value);
  if (num === null) return '--';
  return num.toLocaleString('pt-BR', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
}
