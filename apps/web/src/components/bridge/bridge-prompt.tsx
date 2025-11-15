'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ArrowRight, Zap } from 'lucide-react';
import BridgeModal from './bridge-modal';
import {
  CHAIN_IDS,
  getChainName,
  getBridgeDirection,
  type BridgeDirection,
} from '@/lib/bridge-config';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface BridgePromptProps {
  onBridgeComplete?: (amount: string) => void;
}

export default function BridgePrompt({ onBridgeComplete }: BridgePromptProps) {
  const { chainId, isConnected } = useAccount();
  const [isBridgeModalOpen, setIsBridgeModalOpen] = useState(false);

  // Determine bridge direction based on current chain
  let bridgeDirection: BridgeDirection | null = null;
  let currentChainName = 'your current chain';

  if (chainId) {
    currentChainName = getChainName(chainId);
    bridgeDirection = getBridgeDirection(chainId, CHAIN_IDS.ARC_TESTNET);
  }

  const handleOpenBridge = () => {
    setIsBridgeModalOpen(true);
  };

  const handleCloseBridge = () => {
    setIsBridgeModalOpen(false);
    // TODO: Implement onBridgeComplete callback if needed
    // This could trigger when bridge is successful to auto-fill the amount
  };

  return (
    <>
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Bridge to Arc Testnet</CardTitle>
            <CardDescription className="text-base">
              To create an escrow, you need USDC on <strong>Arc Testnet</strong>.
              {isConnected && chainId && chainId !== CHAIN_IDS.ARC_TESTNET ? (
                <>
                  {' '}
                  You're currently connected to <strong>{currentChainName}</strong>. Bridge your
                  USDC to Arc Testnet to get started.
                </>
              ) : (
                <> Bridge your USDC from Ethereum, Base, or Arbitrum to Arc Testnet.</>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Features */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">How it works:</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start space-x-2">
                    <ArrowRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <p>Select the amount of USDC you want to bridge to Arc Testnet</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <ArrowRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <p>
                      Approve the bridge transactions in your wallet (typically 2-3 transactions
                      total)
                    </p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <ArrowRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <p>
                      Your USDC will arrive on Arc Testnet in a few minutes (usually 2-5 minutes)
                    </p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <ArrowRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <p>Once complete, you can create your escrow on Arc Testnet!</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bridge Button */}
            <Button
              onClick={handleOpenBridge}
              disabled={!isConnected}
              className="w-full"
              size="lg"
            >
              {!isConnected ? 'Connect Wallet to Bridge' : 'Open Bridge'}
            </Button>

            {/* Additional Info */}
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center">
                SendHaven escrows are deployed on Arc Testnet. Arc uses USDC as the native token
                for gas fees, making transactions seamless and cost-effective.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bridge Modal */}
      {bridgeDirection && (
        <BridgeModal
          isOpen={isBridgeModalOpen}
          onClose={handleCloseBridge}
          initialDirection={bridgeDirection}
        />
      )}
    </>
  );
}
