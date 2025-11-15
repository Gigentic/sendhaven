import { formatUnits } from "viem";
import { getStablecoinDecimals, getStablecoinSymbol } from "./escrow-config";

/**
 * Format a bigint amount as a human-readable string with the correct currency symbol
 * All chains now use USDC (6 decimals)
 * @param amount Amount in smallest unit (bigint)
 * @param chainId Optional chain ID to determine decimals and symbol
 * @returns Formatted string like "100.00 USDC"
 */
export function formatAmount(amount: bigint, chainId?: number): string {
  const decimals = chainId ? getStablecoinDecimals(chainId) : 6;
  const symbol = chainId ? getStablecoinSymbol(chainId) : 'USDC';
  return `${formatUnits(amount, decimals)} ${symbol}`;
}

/**
 * Format a Unix timestamp (in seconds) as a localized date string
 * @param timestamp Unix timestamp in seconds (bigint or number)
 * @returns Localized date/time string
 */
export function formatDate(timestamp: bigint | number): string {
  return new Date(Number(timestamp) * 1000).toLocaleString();
}
