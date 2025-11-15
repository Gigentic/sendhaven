import { createConfig, http, cookieStorage, createStorage } from 'wagmi';
import { sepolia, baseSepolia, arbitrumSepolia } from 'wagmi/chains';
import { defineChain } from 'viem';

// Define Arc Testnet chain
// Note: Arc's native gas token uses 18 decimals, but the USDC ERC-20 token uses 6 decimals
const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    decimals: 18, // Native gas token uses 18 decimals
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Arcscan',
      url: 'https://testnet.arcscan.app',
    },
  },
  testnet: true,
});

// Server-side config for SSR with empty connectors
// Used by layout.tsx for cookieToInitialState
export const wagmiSsrConfig = createConfig({
  chains: [arcTestnet, sepolia, baseSepolia, arbitrumSepolia],
  connectors: [],  // Empty connectors for server-side rendering
  transports: {
    [arcTestnet.id]: http(),
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
  },
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});
