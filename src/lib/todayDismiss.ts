/**
 * todayDismiss.ts - Persist "Agora não" dismissals for 24h
 * 
 * Uses localStorage with daily keys to auto-expire dismissals.
 * Pattern: today_dismiss:YYYY-MM-DD:module_key = "1"
 */

import { format } from "date-fns";

const STORAGE_PREFIX = "today_dismiss";

/**
 * Get today's date key in YYYY-MM-DD format (local timezone)
 */
function getTodayKey(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/**
 * Build the full storage key for a module
 */
function buildStorageKey(moduleKey: string, dateKey?: string): string {
  return `${STORAGE_PREFIX}:${dateKey || getTodayKey()}:${moduleKey}`;
}

/**
 * Check if a module has been dismissed today
 */
export function isDismissedToday(moduleKey: string): boolean {
  try {
    const key = buildStorageKey(moduleKey);
    return localStorage.getItem(key) === "1";
  } catch {
    // localStorage might be unavailable (SSR, private mode)
    return false;
  }
}

/**
 * Dismiss a module for today (24h until midnight)
 */
export function dismissToday(moduleKey: string): void {
  try {
    const key = buildStorageKey(moduleKey);
    localStorage.setItem(key, "1");
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Clear dismissal for a module (for testing/manual reset)
 */
export function clearDismissal(moduleKey: string): void {
  try {
    const key = buildStorageKey(moduleKey);
    localStorage.removeItem(key);
  } catch {
    // Silently fail
  }
}

/**
 * Cleanup old dismissal keys (call periodically to avoid localStorage bloat)
 * Removes keys older than 7 days
 */
export function cleanupOldDismissals(): void {
  try {
    const keysToRemove: string[] = [];
    const today = new Date();
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        // Extract date from key: today_dismiss:YYYY-MM-DD:module_key
        const parts = key.split(":");
        if (parts.length >= 3) {
          const dateStr = parts[1];
          const keyDate = new Date(dateStr);
          const diffDays = Math.floor((today.getTime() - keyDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays > 7) {
            keysToRemove.push(key);
          }
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch {
    // Silently fail
  }
}
