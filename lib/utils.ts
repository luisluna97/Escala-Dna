// lib/utils.ts
import { ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Função auxiliar para mesclar classes com clsx + tailwind-merge.
 * Garante que as classes duplicadas sejam tratadas corretamente.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
