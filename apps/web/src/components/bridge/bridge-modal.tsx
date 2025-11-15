'use client';

import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Loader2, CheckCircle, AlertCircle, ExternalLink, Clock, ArrowLeftRight } from 'lucide-react';
import { useAccount } from 'wagmi';
import confetti from 'canvas-confetti';
import { useBridge } from '@/hooks/use-bridge';
import {
  type BridgeToken,
  type BridgeStep,
  type BridgeDirection,
  CHAIN_TOKENS,
  CHAIN_IDS,
  getChainName,
} from '@/lib/bridge-config';

interface BridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDirection?: BridgeDirection;
  initialAmount?: string;
}

// Step labels for better UX
const STEP_LABELS: Record<BridgeStep, { title: string; description: string }> = {
  idle: { title: 'Ready', description: 'Enter amount to bridge' },
  'switching-network': {
    title: 'Switching Network',
    description: 'You will be asked to switch networks in your wallet',
  },
  approving: {
    title: 'Bridge In Progress',
    description:
      'You will be asked to: (1) Approve USDC spend, (2) Confirm the transfer transaction, and (3) Confirm the receive message. Please approve each transaction in your wallet as they appear.',
  },
  'signing-bridge': {
    title: 'Bridge In Progress',
    description:
      'You will be asked to approve transactions. Please approve each as it appears.',
  },
  'waiting-receive-message': {
    title: 'Bridge In Progress',
    description: 'Waiting for receive message confirmation on destination chain.',
  },
  success: {
    title: 'Bridge Successful',
    description: 'Your USDC has been successfully transferred!',
  },
  error: { title: 'Bridge Failed', description: 'Bridge transaction failed. Please try again.' },
};

// Helper to get block explorer URL
function getExplorerUrl(chainId: number, txHash: string): string {
  switch (chainId) {
    case CHAIN_IDS.SEPOLIA:
      return `https://sepolia.etherscan.io/tx/${txHash}`;
    case CHAIN_IDS.BASE_SEPOLIA:
      return `https://sepolia.basescan.org/tx/${txHash}`;
    case CHAIN_IDS.ARBITRUM_SEPOLIA:
      return `https://sepolia.arbiscan.io/tx/${txHash}`;
    case CHAIN_IDS.ARC_TESTNET:
      return `https://testnet.arcscan.app/tx/${txHash}`;
    default:
      return '#';
  }
}

// Helper to parse direction into source/dest chain IDs
function parseDirection(direction: BridgeDirection): {
  sourceChainId: number;
  destinationChainId: number;
} {
  switch (direction) {
    case 'sepolia-to-arc':
      return { sourceChainId: CHAIN_IDS.SEPOLIA, destinationChainId: CHAIN_IDS.ARC_TESTNET };
    case 'arc-to-sepolia':
      return { sourceChainId: CHAIN_IDS.ARC_TESTNET, destinationChainId: CHAIN_IDS.SEPOLIA };
    case 'base-sepolia-to-arc':
      return { sourceChainId: CHAIN_IDS.BASE_SEPOLIA, destinationChainId: CHAIN_IDS.ARC_TESTNET };
    case 'arc-to-base-sepolia':
      return { sourceChainId: CHAIN_IDS.ARC_TESTNET, destinationChainId: CHAIN_IDS.BASE_SEPOLIA };
    case 'arbitrum-sepolia-to-arc':
      return {
        sourceChainId: CHAIN_IDS.ARBITRUM_SEPOLIA,
        destinationChainId: CHAIN_IDS.ARC_TESTNET,
      };
    case 'arc-to-arbitrum-sepolia':
      return {
        sourceChainId: CHAIN_IDS.ARC_TESTNET,
        destinationChainId: CHAIN_IDS.ARBITRUM_SEPOLIA,
      };
  }
}

// Helper to toggle direction
function toggleDirection(currentDirection: BridgeDirection): BridgeDirection {
  switch (currentDirection) {
    case 'sepolia-to-arc':
      return 'arc-to-sepolia';
    case 'arc-to-sepolia':
      return 'sepolia-to-arc';
    case 'base-sepolia-to-arc':
      return 'arc-to-base-sepolia';
    case 'arc-to-base-sepolia':
      return 'base-sepolia-to-arc';
    case 'arbitrum-sepolia-to-arc':
      return 'arc-to-arbitrum-sepolia';
    case 'arc-to-arbitrum-sepolia':
      return 'arbitrum-sepolia-to-arc';
  }
}

export default function BridgeModal({
  isOpen,
  onClose,
  initialDirection,
  initialAmount,
}: BridgeModalProps) {
  const { address, isConnected, chainId } = useAccount();

  const [amount, setAmount] = useState(initialAmount || '');
  const selectedToken: BridgeToken = 'USDC'; // Only USDC supported
  const [direction, setDirection] = useState<BridgeDirection>(
    initialDirection || 'sepolia-to-arc'
  );
  const [elapsedTime, setElapsedTime] = useState(0);
  const [bridgeStartTime, setBridgeStartTime] = useState<number | null>(null);

  const { state, tokenBalance, isLoadingBalance, balanceError, fetchTokenBalance, bridge, reset } =
    useBridge();

  // Auto-detect direction based on current chain when modal opens
  useEffect(() => {
    if (isOpen && chainId && state.step !== 'success' && !state.direction && !initialDirection) {
      if (chainId === CHAIN_IDS.ARC_TESTNET) {
        setDirection('arc-to-sepolia');
      } else if (chainId === CHAIN_IDS.SEPOLIA) {
        setDirection('sepolia-to-arc');
      } else if (chainId === CHAIN_IDS.BASE_SEPOLIA) {
        setDirection('base-sepolia-to-arc');
      } else if (chainId === CHAIN_IDS.ARBITRUM_SEPOLIA) {
        setDirection('arbitrum-sepolia-to-arc');
      }
    }
  }, [isOpen, chainId, state.step, state.direction, initialDirection]);

  // Use stored direction from bridge state if available (for success screen), otherwise use current direction
  const activeDirection = state.direction || direction;

  // Determine source and destination chain info
  const { sourceChainId, destinationChainId } = parseDirection(activeDirection);
  const sourceChainName = getChainName(sourceChainId);
  const destinationChainName = getChainName(destinationChainId);

  // Fetch token balance when modal opens or direction changes
  useEffect(() => {
    if (isOpen && address && isConnected && state.step !== 'success') {
      fetchTokenBalance(selectedToken, sourceChainId);
    } else if (!isOpen) {
      // Reset state when modal closes
      if (!initialAmount) {
        setAmount('');
      }
      reset();
    }
  }, [
    isOpen,
    address,
    isConnected,
    selectedToken,
    sourceChainId,
    state.step,
    fetchTokenBalance,
    reset,
    initialAmount,
  ]);

  // Timer effect during bridging
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (state.isLoading) {
      // Start timer when bridge begins
      if (!bridgeStartTime) {
        setBridgeStartTime(Date.now());
        setElapsedTime(0);
      }

      interval = setInterval(() => {
        if (bridgeStartTime) {
          const elapsed = Math.floor((Date.now() - bridgeStartTime) / 1000);
          setElapsedTime(elapsed);
        }
      }, 1000);
    } else {
      // Reset timer when bridge completes or errors
      setElapsedTime(0);
      setBridgeStartTime(null);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.isLoading, bridgeStartTime]);

  // Confetti effect on successful bridge
  useEffect(() => {
    if (state.step === 'success') {
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: NodeJS.Timeout = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);

        // Launch from left side
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });

        // Launch from right side
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);

      // Cleanup
      return () => clearInterval(interval);
    }
  }, [state.step]);

  const handleBridge = async () => {
    await bridge(selectedToken, amount, direction);
  };

  // Format elapsed time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    reset();
    if (!initialAmount) {
      setAmount('');
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bridge USDC</h2>
            <p className="text-sm text-gray-600">Transfer USDC across chains</p>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div>
          {state.step === 'idle' && (
            <div className="space-y-6">
              {/* Chain Display with Swap Button */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <p className="text-xs text-gray-600 mb-1">From</p>
                    <p className="font-bold text-gray-900">{sourceChainName}</p>
                    <p className="text-xs text-gray-500 mt-1">Chain ID: {sourceChainId}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDirection(toggleDirection(direction))}
                    disabled={state.isLoading}
                    className="mx-4 p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 hover:border-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Swap chains"
                  >
                    <ArrowLeftRight className="w-5 h-5 text-gray-600" />
                  </button>
                  <div className="text-center flex-1">
                    <p className="text-xs text-gray-600 mb-1">To</p>
                    <p className="font-bold text-gray-900">{destinationChainName}</p>
                    <p className="text-xs text-gray-500 mt-1">Chain ID: {destinationChainId}</p>
                  </div>
                </div>
              </div>

              {/* Token Balance Display */}
              {isConnected && address && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs text-emerald-700 font-medium mb-1">
                        {sourceChainName} {selectedToken} Balance
                      </p>
                      {isLoadingBalance ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                          <span className="text-sm text-emerald-800">Loading...</span>
                        </div>
                      ) : (
                        <p className="text-lg font-bold text-emerald-900">
                          {parseFloat(tokenBalance) > 0
                            ? `${parseFloat(tokenBalance).toFixed(2)} ${selectedToken}`
                            : `0.00 ${selectedToken}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {CHAIN_TOKENS[sourceChainId] && (
                        <p className="text-xs text-emerald-600 font-mono">
                          {CHAIN_TOKENS[sourceChainId][selectedToken].contractAddress.slice(0, 6)}
                          ...
                          {CHAIN_TOKENS[sourceChainId][selectedToken].contractAddress.slice(-4)}
                        </p>
                      )}
                    </div>
                  </div>
                  {balanceError && (
                    <div className="mt-2 pt-2 border-t border-emerald-200">
                      <p className="text-xs text-amber-600">⚠️ {balanceError}</p>
                    </div>
                  )}
                  {parseFloat(tokenBalance) === 0 && !isLoadingBalance && !balanceError && (
                    <div className="mt-3 pt-3 border-t border-emerald-200">
                      <p className="text-xs text-emerald-700 mb-2">
                        ⚠️ You need {selectedToken} at the Bridge Kit contract address to bridge
                      </p>
                      <a
                        href="https://faucet.circle.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                      >
                        <span>Get {selectedToken} from Circle Faucet</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount ({selectedToken})
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  disabled={state.isLoading}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Enter the {selectedToken} amount you want to bridge to {destinationChainName}
                </p>
              </div>

              {/* Warning if not on source chain */}
              {isConnected && chainId !== sourceChainId && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Switch to {sourceChainName}</p>
                      <p className="text-xs mt-1">
                        You'll need to switch to {sourceChainName} network to bridge tokens. We'll
                        prompt you during the bridge process.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Connect Wallet Prompt */}
              {!isConnected && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <p className="text-sm text-blue-800">Please connect your wallet to bridge tokens</p>
                </div>
              )}

              {/* Bridge Button */}
              <button
                onClick={handleBridge}
                disabled={
                  !isConnected || !amount || parseFloat(amount) <= 0 || state.isLoading
                }
                className={`w-full py-3 rounded-xl font-bold transition-all duration-300 ${
                  !isConnected || !amount || parseFloat(amount) <= 0 || state.isLoading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-500 to-emerald-500 text-white hover:shadow-lg hover:scale-105'
                }`}
              >
                {state.isLoading ? 'Processing...' : `Bridge ${selectedToken}`}
              </button>
            </div>
          )}

          {/* Bridge In Progress */}
          {state.step !== 'idle' && state.step !== 'success' && state.step !== 'error' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200 text-center">
                <Loader2 className="w-16 h-16 text-orange-500 animate-spin mx-auto mb-4" />

                {/* Timer Display */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Bridge in Progress</p>
                  <div className="flex items-center justify-center space-x-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    <p className="text-2xl font-bold text-gray-900 font-mono">
                      {formatTime(elapsedTime)}
                    </p>
                  </div>
                </div>

                {/* Status Message */}
                <div className="space-y-2">
                  <p className="text-lg font-bold text-gray-900">
                    {state.step === 'switching-network' ? 'Switching Network' : 'Processing Bridge'}
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {state.step === 'switching-network'
                      ? `You will be asked to switch to ${sourceChainName} network in your wallet.`
                      : `You will be asked to approve transactions in your wallet. Please approve each transaction as it appears. The bridge will automatically handle the transfer and receive message confirmation.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success */}
          {state.step === 'success' && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 mb-2">Bridge Successful!</p>
                <p className="text-sm text-gray-600 mb-4">
                  Your {selectedToken} has been successfully transferred from {sourceChainName} to{' '}
                  {destinationChainName}.
                </p>

                {/* Transaction Links */}
                <div className="space-y-2 mb-4">
                  {state.sourceTxHash && (
                    <a
                      href={getExplorerUrl(sourceChainId, state.sourceTxHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 text-orange-600 hover:text-orange-700 text-sm block"
                    >
                      <span>View {sourceChainName} Transaction</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  {state.receiveTxHash && (
                    <a
                      href={getExplorerUrl(destinationChainId, state.receiveTxHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 text-orange-600 hover:text-orange-700 text-sm block"
                    >
                      <span>View Receive Message Transaction</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={handleClose}
                className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {/* Error */}
          {state.step === 'error' && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 mb-2">Bridge Failed</p>
                <div className="text-sm text-red-600 mb-4 max-h-40 overflow-y-auto text-left bg-red-50 p-3 rounded-lg">
                  <p className="whitespace-pre-wrap break-words">{state.error}</p>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Check the browser console for detailed {selectedToken} contract address information.
                </p>
                <button
                  onClick={() => {
                    reset();
                    if (!initialAmount) {
                      setAmount('');
                    }
                  }}
                  className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
