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

export function maskDecimalBR(value: string): string {
  // Remove tudo exceto números e vírgula
  let cleaned = value.replace(/[^\d,]/g, '');
  
  // Garante apenas uma vírgula
  const parts = cleaned.split(',');
  if (parts.length > 2) {
    cleaned = parts[0] + ',' + parts.slice(1).join('');
  }
  
  // Limita casas decimais a 2
  if (parts.length === 2 && parts[1].length > 2) {
    cleaned = parts[0] + ',' + parts[1].slice(0, 2);
  }
  
  return cleaned;
}
