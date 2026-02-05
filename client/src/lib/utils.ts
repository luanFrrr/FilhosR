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

export function maskDecimalBR(value: string, decimalPlaces: number = 2): string {
  // Remove tudo exceto números
  const digits = value.replace(/\D/g, '');
  
  if (digits === '') return '';
  
  // Remove zeros à esquerda, mas mantém pelo menos um dígito
  const trimmed = digits.replace(/^0+/, '') || '0';
  
  // Garante que temos dígitos suficientes para as casas decimais
  const padded = trimmed.padStart(decimalPlaces + 1, '0');
  
  // Separa parte inteira e decimal
  const integerPart = padded.slice(0, -decimalPlaces) || '0';
  const decimalPart = padded.slice(-decimalPlaces);
  
  // Remove zeros à esquerda da parte inteira (mas mantém pelo menos um)
  const cleanInteger = integerPart.replace(/^0+/, '') || '0';
  
  return `${cleanInteger},${decimalPart}`;
}
