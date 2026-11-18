import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Aceita números decimais digitados com vírgula ou ponto.
export const normalizeDecimalInput = (value: string): string => value.replace(',', '.');

export const isValidDecimalInput = (value: string): boolean => {
  if (value === "") return true;
  return /^\d*[.,]?\d*$/.test(value);
};

export const parseDecimalInput = (value: string): number => {
  return parseFloat(normalizeDecimalInput(value)) || 0;
};
