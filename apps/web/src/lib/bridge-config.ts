import { type Address } from 'viem';

export type BridgeToken = 'USDC';
export type BridgeStep =
  | 'idle'
  | 'switching-network'
  | 'approving'
  | 'signing-bridge'
  | 'waiting-receive-message'
  | 'success'
  | 'error';

export interface BridgeState {
  step: BridgeStep;
  error: string | null;
  result: any | null;
  isLoading: boolean;
  // Transaction hashes
  sourceTxHash?: string; // Source chain transaction hash
  receiveTxHash?: string; // Destination chain receive message transaction hash
  // Direction information
  direction?: BridgeDirection;
}

export interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  contractAddress: Address;
}

// Bridge directions supported
export type BridgeDirection =
  | 'sepolia-to-arc'
  | 'arc-to-sepolia'
  | 'base-sepolia-to-arc'
  | 'arc-to-base-sepolia'
  | 'arbitrum-sepolia-to-arc'
  | 'arc-to-arbitrum-sepolia';

// Chain IDs
export const CHAIN_IDS = {
  SEPOLIA: 11155111,
  BASE_SEPOLIA: 84532,
  ARBITRUM_SEPOLIA: 421614,
  ARC_TESTNET: 5042002,
} as const;

// Token configurations for all supported chains
// These are Circle's official USDC contract addresses for Bridge Kit
export const CHAIN_TOKENS: Record<number, Record<BridgeToken, TokenInfo>> = {
  [CHAIN_IDS.SEPOLIA]: {
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      contractAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as Address,
    },
  },
  [CHAIN_IDS.BASE_SEPOLIA]: {
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      contractAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
    },
  },
  [CHAIN_IDS.ARBITRUM_SEPOLIA]: {
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      contractAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as Address,
    },
  },
  [CHAIN_IDS.ARC_TESTNET]: {
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      contractAddress: '0x3600000000000000000000000000000000000000' as Address,
    },
  },
};

// RPC URLs for balance fetching (with fallbacks)
export const CHAIN_RPC_URLS: Record<number, string[]> = {
  [CHAIN_IDS.SEPOLIA]: [
    'https://ethereum-sepolia-rpc.publicnode.com',
    'https://rpc.sepolia.org',
  ],
  [CHAIN_IDS.BASE_SEPOLIA]: [
    'https://sepolia.base.org',
    'https://base-sepolia-rpc.publicnode.com',
  ],
  [CHAIN_IDS.ARBITRUM_SEPOLIA]: [
    'https://sepolia-rollup.arbitrum.io/rpc',
    'https://arbitrum-sepolia-rpc.publicnode.com',
  ],
  [CHAIN_IDS.ARC_TESTNET]: [
    'https://rpc.testnet.arc.network/',
    'https://rpc.testnet.arc.network',
  ],
};

// Helper to get token info for a chain
export function getTokenInfo(chainId: number, token: BridgeToken): TokenInfo | null {
  const chainTokens = CHAIN_TOKENS[chainId];
  if (!chainTokens) return null;
  return chainTokens[token] || null;
}

// Helper to get RPC URLs for a chain
export function getRpcUrls(chainId: number): string[] {
  return CHAIN_RPC_URLS[chainId] || [];
}

// Helper to get chain name for display
export function getChainName(chainId: number): string {
  switch (chainId) {
    case CHAIN_IDS.SEPOLIA:
      return 'Ethereum Sepolia';
    case CHAIN_IDS.BASE_SEPOLIA:
      return 'Base Sepolia';
    case CHAIN_IDS.ARBITRUM_SEPOLIA:
      return 'Arbitrum Sepolia';
    case CHAIN_IDS.ARC_TESTNET:
      return 'Arc Testnet';
    default:
      return `Chain ${chainId}`;
  }
}

// Helper to determine bridge direction
export function getBridgeDirection(
  sourceChainId: number,
  destinationChainId: number
): BridgeDirection | null {
  const key = `${sourceChainId}-${destinationChainId}`;
  const directionMap: Record<string, BridgeDirection> = {
    [`${CHAIN_IDS.SEPOLIA}-${CHAIN_IDS.ARC_TESTNET}`]: 'sepolia-to-arc',
    [`${CHAIN_IDS.ARC_TESTNET}-${CHAIN_IDS.SEPOLIA}`]: 'arc-to-sepolia',
    [`${CHAIN_IDS.BASE_SEPOLIA}-${CHAIN_IDS.ARC_TESTNET}`]: 'base-sepolia-to-arc',
    [`${CHAIN_IDS.ARC_TESTNET}-${CHAIN_IDS.BASE_SEPOLIA}`]: 'arc-to-base-sepolia',
    [`${CHAIN_IDS.ARBITRUM_SEPOLIA}-${CHAIN_IDS.ARC_TESTNET}`]: 'arbitrum-sepolia-to-arc',
    [`${CHAIN_IDS.ARC_TESTNET}-${CHAIN_IDS.ARBITRUM_SEPOLIA}`]: 'arc-to-arbitrum-sepolia',
  };
  return directionMap[key] || null;
}

// Helper to check if a chain is supported for bridging
export function isBridgingSupportedChain(chainId: number): boolean {
  return chainId in CHAIN_TOKENS;
}

// Helper to check if user is on Arc Testnet
export function isOnArcTestnet(chainId: number | undefined): boolean {
  return chainId === CHAIN_IDS.ARC_TESTNET;
}
