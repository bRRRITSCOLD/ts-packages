import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Joins class names and resolves Tailwind conflicts so the last class for a property wins. */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}
