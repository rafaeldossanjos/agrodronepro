import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper para normalizar entrada decimal (aceita vírgula ou ponto)
export const normalizeDecimalInput = (value: string): string => {
  return value.replace(',', '.');
};

// Helper para validar entrada decimal (aceita vírgula ou ponto)
export const isValidDecimalInput = (value: string): boolean => {
  if (value === "") return true;
  // Aceita números com ponto ou vírgula como separador decimal
  return /^\d*[.,]?\d*$/.test(value);
};

// Helper para parsear número de string com vírgula ou ponto
export const parseDecimalInput = (value: string): number => {
  return parseFloat(normalizeDecimalInput(value)) || 0;
};
