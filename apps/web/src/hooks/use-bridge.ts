import { useState, useCallback } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { createAdapterFromProvider } from '@circle-fin/adapter-viem-v2';
import { BridgeKit } from '@circle-fin/bridge-kit';
import { type EIP1193Provider } from 'viem';
import { createPublicClient, http, formatUnits } from 'viem';
import { sepolia, baseSepolia, arbitrumSepolia } from 'viem/chains';
import {
  type BridgeState,
  type BridgeToken,
  type BridgeDirection,
  CHAIN_TOKENS,
  CHAIN_IDS,
  CHAIN_RPC_URLS,
  getChainName,
  getBridgeDirection,
  isOnArcTestnet,
} from '@/lib/bridge-config';

// ERC20 ABI for balanceOf
const erc20Abi = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
] as const;

export function useBridge() {
  const { address, isConnected, chainId, connector } = useAccount();
  const { switchChain } = useSwitchChain();

  const [state, setState] = useState<BridgeState>({
    step: 'idle',
    error: null,
    result: null,
    isLoading: false,
    sourceTxHash: undefined,
    receiveTxHash: undefined,
    direction: undefined,
  });

  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState<string>('');

  // Fetch token balance on a specific chain
  const fetchTokenBalance = useCallback(
    async (token: BridgeToken, sourceChainId: number) => {
      if (!address) return;

      setIsLoadingBalance(true);
      setBalanceError('');

      try {
        const chainTokens = CHAIN_TOKENS[sourceChainId];
        if (!chainTokens) {
          throw new Error(`Chain ${sourceChainId} not supported for token balance fetching`);
        }

        const tokenInfo = chainTokens[token];
        const rpcUrls = CHAIN_RPC_URLS[sourceChainId];

        if (!rpcUrls || rpcUrls.length === 0) {
          throw new Error(`No RPC URLs configured for chain ${sourceChainId}`);
        }

        let publicClient;
        let lastError;

        // Get the appropriate chain config
        let chainConfig;
        switch (sourceChainId) {
          case CHAIN_IDS.SEPOLIA:
            chainConfig = sepolia;
            break;
          case CHAIN_IDS.BASE_SEPOLIA:
            chainConfig = baseSepolia;
            break;
          case CHAIN_IDS.ARBITRUM_SEPOLIA:
            chainConfig = arbitrumSepolia;
            break;
          case CHAIN_IDS.ARC_TESTNET:
            chainConfig = {
              id: CHAIN_IDS.ARC_TESTNET,
              name: 'Arc Testnet',
              network: 'arc-testnet',
              nativeCurrency: {
                decimals: 6,
                name: 'USDC',
                symbol: 'USDC',
              },
              rpcUrls: {
                default: { http: rpcUrls },
                public: { http: rpcUrls },
              },
              blockExplorers: {
                default: { name: 'Arc Explorer', url: 'https://testnet.arcscan.app' },
              },
            };
            break;
          default:
            throw new Error(`Unsupported chain ID: ${sourceChainId}`);
        }

        // Try each RPC URL until one works
        for (const rpcUrl of rpcUrls) {
          try {
            publicClient = createPublicClient({
              chain: chainConfig as any,
              transport: http(rpcUrl, {
                retryCount: 2,
                timeout: 8000,
              }),
            });

            await publicClient.getBlockNumber();
            console.log(`✅ Connected to ${getChainName(sourceChainId)} via: ${rpcUrl}`);
            break;
          } catch (err: any) {
            lastError = err;
            continue;
          }
        }

        if (!publicClient) {
          throw new Error(
            `Failed to connect to RPC for chain ${sourceChainId}: ${lastError?.message || ''}`
          );
        }

        const balance = await publicClient.readContract({
          address: tokenInfo.contractAddress,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address as `0x${string}`],
        });

        const formattedBalance = formatUnits(balance as bigint, tokenInfo.decimals);
        setTokenBalance(formattedBalance);

        console.log(`✅ ${getChainName(sourceChainId)} ${token} balance fetched:`, {
          address,
          balance: formattedBalance,
          contractAddress: tokenInfo.contractAddress,
        });
      } catch (err: any) {
        console.error(`❌ Error fetching balance for chain ${sourceChainId}:`, err);
        setTokenBalance('0');

        if (err.message?.includes('timeout') || err.message?.includes('took too long')) {
          setBalanceError('RPC timeout - balance may not be accurate.');
        } else {
          setBalanceError('Unable to fetch balance.');
        }
      } finally {
        setIsLoadingBalance(false);
      }
    },
    [address]
  );

  // Execute bridge transaction (bidirectional, multi-chain)
  const bridge = useCallback(
    async (token: BridgeToken, amount: string, direction: BridgeDirection): Promise<void> => {
      if (!isConnected || !address) {
        setState({
          step: 'error',
          error: 'Please connect your wallet first',
          result: null,
          isLoading: false,
        });
        return;
      }

      if (!amount || parseFloat(amount) <= 0) {
        setState({
          step: 'error',
          error: `Please enter a valid ${token} amount`,
          result: null,
          isLoading: false,
        });
        return;
      }

      try {
        setState((prev) => ({ ...prev, step: 'idle', error: null, isLoading: true }));

        // Get the provider from the connected wallet
        if (!connector) {
          throw new Error('No wallet connected. Please connect your wallet first.');
        }

        // Get provider from the connector - this is the simple approach
        const provider = await connector.getProvider();

        if (!provider) {
          throw new Error('Failed to get provider from wallet. Please try reconnecting.');
        }

        console.log('Using provider from connector:', connector.name);

        // Create adapter from the wallet's provider
        const adapter = await createAdapterFromProvider({
          provider: provider as EIP1193Provider,
        });

        // Initialize Bridge Kit
        const kit = new BridgeKit();
        const supportedChains = kit.getSupportedChains();

        // Determine source and destination chains based on direction
        let sourceChainId: number;
        let destinationChainId: number;

        switch (direction) {
          case 'sepolia-to-arc':
            sourceChainId = CHAIN_IDS.SEPOLIA;
            destinationChainId = CHAIN_IDS.ARC_TESTNET;
            break;
          case 'arc-to-sepolia':
            sourceChainId = CHAIN_IDS.ARC_TESTNET;
            destinationChainId = CHAIN_IDS.SEPOLIA;
            break;
          case 'base-sepolia-to-arc':
            sourceChainId = CHAIN_IDS.BASE_SEPOLIA;
            destinationChainId = CHAIN_IDS.ARC_TESTNET;
            break;
          case 'arc-to-base-sepolia':
            sourceChainId = CHAIN_IDS.ARC_TESTNET;
            destinationChainId = CHAIN_IDS.BASE_SEPOLIA;
            break;
          case 'arbitrum-sepolia-to-arc':
            sourceChainId = CHAIN_IDS.ARBITRUM_SEPOLIA;
            destinationChainId = CHAIN_IDS.ARC_TESTNET;
            break;
          case 'arc-to-arbitrum-sepolia':
            sourceChainId = CHAIN_IDS.ARC_TESTNET;
            destinationChainId = CHAIN_IDS.ARBITRUM_SEPOLIA;
            break;
          default:
            throw new Error(`Unsupported bridge direction: ${direction}`);
        }

        // Find source chain in Bridge Kit's supported chains
        let sourceChain = supportedChains.find((c) => {
          const isEVM = 'chainId' in c;
          if (!isEVM) return false;
          return (c as any).chainId === sourceChainId;
        });

        // Fallback: search by name if chain ID doesn't match
        if (!sourceChain) {
          const chainName = getChainName(sourceChainId).toLowerCase();
          sourceChain = supportedChains.find((c) => {
            return c.name.toLowerCase().includes(chainName);
          });
        }

        // Find destination chain
        let destinationChain = supportedChains.find((c) => {
          const isEVM = 'chainId' in c;
          if (!isEVM) return false;
          return (c as any).chainId === destinationChainId;
        });

        // Fallback: search by name
        if (!destinationChain) {
          const chainName = getChainName(destinationChainId).toLowerCase();
          destinationChain = supportedChains.find((c) => {
            return c.name.toLowerCase().includes(chainName);
          });
        }

        if (!sourceChain) {
          throw new Error(
            `${getChainName(sourceChainId)} (chain ID ${sourceChainId}) is not supported by Bridge Kit.`
          );
        }

        if (!destinationChain) {
          throw new Error(
            `${getChainName(destinationChainId)} (chain ID ${destinationChainId}) is not supported by Bridge Kit.`
          );
        }

        console.log('Selected chains:', {
          from: sourceChain.name,
          fromChainId: (sourceChain as any).chainId,
          to: destinationChain.name,
          toChainId: (destinationChain as any).chainId,
          token,
          amount,
          direction,
        });

        // Switch to source chain if not already on it
        const isOnSourceChain = chainId === sourceChainId;
        if (!isOnSourceChain) {
          setState((prev) => ({ ...prev, step: 'switching-network' }));
          await switchChain({ chainId: sourceChainId });
          // Wait for chain switch
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        // Execute the bridge
        // Bridge Kit handles:
        // 1. Approval transaction (if needed)
        // 2. Transfer transaction on source chain
        // 3. Automatic chain switching to destination chain
        // 4. Receive message transaction on destination chain
        setState((prev) => ({ ...prev, step: 'approving' }));

        // Add timeout for bridge operation (2 minutes for fast transfers)
        const bridgePromise = kit.bridge({
          from: {
            adapter: adapter,
            chain: sourceChain.chain,
          },
          to: {
            adapter: adapter,
            chain: destinationChain.chain,
          },
          amount: amount,
        });

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Bridge timeout - this is taking longer than expected. Your USDC was burned on the source chain. You may need to manually complete the bridge using Circle\'s bridge interface.')), 2 * 60 * 1000); // 2 minutes (fast transfers should complete in 8-20 seconds)
        });

        const result = await Promise.race([bridgePromise, timeoutPromise]);

        console.log('Bridge result:', result);

        // Extract transaction hashes from result
        let sourceTxHash: string | undefined;
        let receiveTxHash: string | undefined;

        const resultAny = result as any;

        if (resultAny && resultAny.steps && Array.isArray(resultAny.steps)) {
          console.log('Found steps array with', resultAny.steps.length, 'steps');

          // Loop through steps to find transaction hashes
          resultAny.steps.forEach((step: any, index: number) => {
            console.log(`Step ${index}: ${step.name} - ${step.state}`);

            if (step.name === 'burn' && step.txHash) {
              // Burn/transfer transaction on source chain
              sourceTxHash = step.txHash;
              console.log('Found sourceTxHash from burn step:', sourceTxHash);
            } else if (step.name === 'mint' && step.txHash) {
              // Mint/receive transaction on destination chain
              receiveTxHash = step.txHash;
              console.log('Found receiveTxHash from mint step:', receiveTxHash);
            }
            // Note: We intentionally do NOT use approval as fallback for sourceTxHash
            // Only the burn transaction indicates the bridge actually started
          });
        } else {
          // Fallback: try other possible result structures
          console.log('No steps array found, trying alternative structures...');

          if (resultAny.txHash) {
            sourceTxHash = resultAny.txHash;
          }
          if (
            resultAny.sourceTxHash ||
            resultAny.sourceTransactionHash ||
            resultAny.fromTxHash
          ) {
            sourceTxHash =
              resultAny.sourceTxHash ||
              resultAny.sourceTransactionHash ||
              resultAny.fromTxHash;
          }
          if (
            resultAny.receiveTxHash ||
            resultAny.receiveTransactionHash ||
            resultAny.toTxHash ||
            resultAny.destinationTxHash
          ) {
            receiveTxHash =
              resultAny.receiveTxHash ||
              resultAny.receiveTransactionHash ||
              resultAny.toTxHash ||
              resultAny.destinationTxHash;
          }
        }

        console.log('Extracted transaction hashes:', { sourceTxHash, receiveTxHash });

        // Validate that the bridge actually succeeded
        // We MUST have the burn/transfer transaction (sourceTxHash) to consider the bridge started
        // The approval transaction alone is NOT sufficient
        if (!sourceTxHash) {
          throw new Error(
            'Bridge did not complete - no burn transaction found. Only the approval may have succeeded. ' +
            'The transaction was likely cancelled before the actual bridge transfer.'
          );
        }

        // Bridge complete
        setState({
          step: 'success',
          error: null,
          result,
          isLoading: false,
          sourceTxHash,
          receiveTxHash,
          direction,
        });
      } catch (err: any) {
        console.error('Bridge error:', err);

        let errorMessage = err.message || 'Bridge transaction failed';

        // Check for common errors
        if (err.message?.includes('Insufficient funds') || err.message?.includes('insufficient')) {
          const tokenInfo = CHAIN_TOKENS[CHAIN_IDS.SEPOLIA]?.[token];
          errorMessage =
            `❌ Insufficient ${token} Balance or Wrong Contract Address!\n\n` +
            `Bridge Kit requires ${token} from the official Circle contract.\n` +
            (tokenInfo
              ? `📌 Expected ${token} contract: ${tokenInfo.contractAddress}\n\n`
              : '') +
            `💡 Solutions:\n` +
            `1. Ensure you have enough ${token} on the source chain\n` +
            `2. Use ${token} from the official Circle/Bridge Kit contract\n` +
            `3. Get ${token} from a faucet that provides the correct contract address`;
        } else if (err.message?.includes('User rejected') || err.message?.includes('denied')) {
          errorMessage = 'Transaction was cancelled by user';
        }

        setState({
          step: 'error',
          error: errorMessage,
          result: null,
          isLoading: false,
        });
      }
    },
    [address, isConnected, chainId, switchChain, connector]
  );

  // Reset bridge state
  const reset = useCallback(() => {
    setState({
      step: 'idle',
      error: null,
      result: null,
      isLoading: false,
      sourceTxHash: undefined,
      receiveTxHash: undefined,
      direction: undefined,
    });
    setTokenBalance('0');
    setBalanceError('');
  }, []);

  return {
    state,
    tokenBalance,
    isLoadingBalance,
    balanceError,
    fetchTokenBalance,
    bridge,
    reset,
    isOnArc: isOnArcTestnet(chainId),
    currentChainId: chainId,
  };
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: EIP1193Provider | any;
  }
}
