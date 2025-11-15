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
        <div className="bg-gradient-to-br from-orange-50 to-emerald-50 border border-orange-200 rounded-2xl p-8 text-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-orange-600" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Bridge to Arc Testnet</h2>

          {/* Description */}
          <div className="text-gray-600 mb-6 space-y-2">
            <p>
              To create an escrow on SendHaven, you need USDC on <strong>Arc Testnet</strong>.
            </p>
            {isConnected && chainId && chainId !== CHAIN_IDS.ARC_TESTNET ? (
              <p>
                You're currently connected to <strong>{currentChainName}</strong>. Bridge your USDC
                to Arc Testnet to get started.
              </p>
            ) : (
              <p>Bridge your USDC from Ethereum, Base, or Arbitrum to Arc Testnet.</p>
            )}
          </div>

          {/* Features */}
          <div className="bg-white rounded-xl p-4 mb-6 text-left space-y-3">
            <h3 className="font-semibold text-gray-900 mb-2">How it works:</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start space-x-2">
                <ArrowRight className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <p>Select the amount of USDC you want to bridge to Arc Testnet</p>
              </div>
              <div className="flex items-start space-x-2">
                <ArrowRight className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <p>
                  Approve the bridge transactions in your wallet (typically 2-3 transactions total)
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <ArrowRight className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <p>
                  Your USDC will arrive on Arc Testnet in a few minutes (usually 2-5 minutes)
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <ArrowRight className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <p>Once complete, you can create your escrow on Arc Testnet!</p>
              </div>
            </div>
          </div>

          {/* Bridge Button */}
          <button
            onClick={handleOpenBridge}
            disabled={!isConnected}
            className={`w-full py-3 px-6 rounded-xl font-bold transition-all duration-300 ${
              !isConnected
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 to-emerald-500 text-white hover:shadow-lg hover:scale-105'
            }`}
          >
            {!isConnected ? 'Connect Wallet to Bridge' : 'Open Bridge'}
          </button>

          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              SendHaven escrows are deployed on Arc Testnet. Arc uses USDC as the native token for
              gas fees, making transactions seamless and cost-effective.
            </p>
          </div>
        </div>
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
