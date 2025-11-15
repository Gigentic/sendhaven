'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, Loader2, CheckCircle, AlertCircle, ExternalLink, Clock, ArrowLeftRight } from 'lucide-react';
import { useAccount, useSwitchChain } from 'wagmi';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

interface BridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDirection?: BridgeDirection;
  initialAmount?: string;
}

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
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bridge USDC</DialogTitle>
          <DialogDescription>Transfer USDC across chains</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {state.step === 'idle' && (
            <>
              {/* Chain Display with Swap Button */}
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <p className="text-xs text-muted-foreground mb-1">From</p>
                    <p className="font-bold">{sourceChainName}</p>
                    <p className="text-xs text-muted-foreground mt-1">Chain ID: {sourceChainId}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setDirection(toggleDirection(direction))}
                    disabled={state.isLoading}
                    title="Swap chains"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </Button>
                  <div className="text-center flex-1">
                    <p className="text-xs text-muted-foreground mb-1">To</p>
                    <p className="font-bold">{destinationChainName}</p>
                    <p className="text-xs text-muted-foreground mt-1">Chain ID: {destinationChainId}</p>
                  </div>
                </div>
              </Card>

              {/* Token Balance Display */}
              {isConnected && address && (
                <Card className="p-4 bg-accent">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs font-medium mb-1">
                        {sourceChainName} {selectedToken} Balance
                      </p>
                      {isLoadingBalance ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Loading...</span>
                        </div>
                      ) : (
                        <p className="text-lg font-bold">
                          {parseFloat(tokenBalance) > 0
                            ? `${parseFloat(tokenBalance).toFixed(2)} ${selectedToken}`
                            : `0.00 ${selectedToken}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {CHAIN_TOKENS[sourceChainId] && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {CHAIN_TOKENS[sourceChainId][selectedToken].contractAddress.slice(0, 6)}
                          ...
                          {CHAIN_TOKENS[sourceChainId][selectedToken].contractAddress.slice(-4)}
                        </p>
                      )}
                    </div>
                  </div>
                  {balanceError && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-destructive">⚠️ {balanceError}</p>
                    </div>
                  )}
                  {parseFloat(tokenBalance) === 0 && !isLoadingBalance && !balanceError && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs mb-2">
                        ⚠️ You need {selectedToken} at the Bridge Kit contract address to bridge
                      </p>
                      <a
                        href="https://faucet.circle.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-xs text-primary hover:underline font-medium"
                      >
                        <span>Get {selectedToken} from Circle Faucet</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </Card>
              )}

              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ({selectedToken})</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  disabled={state.isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the {selectedToken} amount you want to bridge to {destinationChainName}
                </p>
              </div>

              {/* Warning if not on source chain */}
              {isConnected && chainId !== sourceChainId && (
                <Card className="p-3 bg-destructive/10 border-destructive/20">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">Switch to {sourceChainName}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        You'll need to switch to {sourceChainName} network to bridge tokens. We'll
                        prompt you during the bridge process.
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Connect Wallet Prompt */}
              {!isConnected && (
                <Card className="p-4 bg-muted text-center">
                  <p className="text-sm">Please connect your wallet to bridge tokens</p>
                </Card>
              )}

              {/* Bridge Button */}
              <Button
                onClick={handleBridge}
                disabled={
                  !isConnected || !amount || parseFloat(amount) <= 0 || state.isLoading
                }
                className="w-full"
                size="lg"
              >
                {state.isLoading ? 'Processing...' : `Bridge ${selectedToken}`}
              </Button>
            </>
          )}

          {/* Bridge In Progress */}
          {state.step !== 'idle' && state.step !== 'success' && state.step !== 'error' && (
            <Card className="p-6 text-center">
              <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4 text-primary" />

              {/* Timer Display */}
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-1">Bridge in Progress</p>
                <div className="flex items-center justify-center space-x-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <p className="text-2xl font-bold font-mono">
                    {formatTime(elapsedTime)}
                  </p>
                </div>
              </div>

              {/* Status Message */}
              <div className="space-y-2">
                <p className="text-lg font-bold">
                  {state.step === 'switching-network' ? 'Switching Network' : 'Processing Bridge'}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {state.step === 'switching-network'
                    ? `You will be asked to switch to ${sourceChainName} network in your wallet.`
                    : `You will be asked to approve transactions in your wallet. Please approve each transaction as it appears. The bridge will automatically handle the transfer and receive message confirmation.`}
                </p>
              </div>
            </Card>
          )}

          {/* Success */}
          {state.step === 'success' && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold mb-2">Bridge Successful!</p>
                <p className="text-sm text-muted-foreground mb-4">
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
                      className="inline-flex items-center space-x-2 text-primary hover:underline text-sm block"
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
                      className="inline-flex items-center space-x-2 text-primary hover:underline text-sm block"
                    >
                      <span>View Receive Message Transaction</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Switch Network Prompt (if bridged to Arc and not currently on Arc) */}
              {destinationChainId === CHAIN_IDS.ARC_TESTNET && chainId !== CHAIN_IDS.ARC_TESTNET && (
                <Card className="p-4 bg-muted/50 text-left">
                  <p className="text-sm font-medium mb-2">Ready to create an escrow?</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Switch to Arc Testnet to start creating escrows with your bridged USDC.
                  </p>
                  <Button
                    onClick={() => switchChain({ chainId: CHAIN_IDS.ARC_TESTNET })}
                    disabled={isSwitchingChain}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    {isSwitchingChain ? 'Switching...' : 'Switch to Arc Testnet'}
                  </Button>
                </Card>
              )}

              <Button onClick={handleClose} size="lg" className="w-full">
                Close
              </Button>
            </div>
          )}

          {/* Error */}
          {state.step === 'error' && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10 text-destructive" />
              </div>
              <div>
                <p className="text-lg font-bold mb-2">Bridge Failed</p>
                <Card className="p-3 bg-destructive/10 border-destructive/20 mb-4 max-h-40 overflow-y-auto text-left">
                  <p className="text-sm text-destructive whitespace-pre-wrap break-words">{state.error}</p>
                </Card>
                <p className="text-xs text-muted-foreground mb-4">
                  Check the browser console for detailed {selectedToken} contract address information.
                </p>
                <Button
                  onClick={() => {
                    reset();
                    if (!initialAmount) {
                      setAmount('');
                    }
                  }}
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
