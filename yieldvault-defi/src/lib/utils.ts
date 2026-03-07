import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number with specified decimals and optional currency
 */
export function formatNumber(
  value: number,
  options: {
    decimals?: number;
    currency?: boolean;
    compact?: boolean;
    suffix?: string;
  } = {}
): string {
  const { decimals = 2, currency = false, compact = false, suffix = '' } = options;

  if (compact && Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M${suffix}`;
  }

  if (compact && Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K${suffix}`;
  }

  const formatted = value.toFixed(decimals);
  const parts = formatted.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const result = parts.join('.');
  return currency ? `$${result}${suffix}` : `${result}${suffix}`;
}

/**
 * Format a wallet address for display
 */
export function formatAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format a timestamp to readable date
 */
export function formatDate(timestamp: Date | number | string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a timestamp to readable time
 */
export function formatTime(timestamp: Date | number | string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format APY percentage
 */
export function formatAPY(value: number): string {
  if (value >= 100) {
    return `${value.toFixed(0)}%`;
  }
  return `${value.toFixed(2)}%`;
}

/**
 * Calculate time ago from timestamp
 */
export function timeAgo(timestamp: Date | number): string {
  const now = Date.now();
  const diff = now - new Date(timestamp).getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

/**
 * Generate referral link for an address
 */
export function generateReferralLink(address: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}?ref=${address}`;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse URL parameters
 */
export function getUrlParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

/**
 * Validate Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Shorten large numbers with suffix
 */
export function shortenNumber(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(2);
}

/**
 * Calculate percentage change
 */
export function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}
