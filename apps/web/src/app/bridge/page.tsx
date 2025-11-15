'use client';

import { useState } from 'react';
import { ArrowLeftRight, Info } from 'lucide-react';
import BridgeModal from '@/components/bridge/bridge-modal';

export default function BridgePage() {
  const [isBridgeModalOpen, setIsBridgeModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <ArrowLeftRight className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Bridge USDC</h1>
          <p className="text-lg text-gray-600">
            Transfer USDC seamlessly across Ethereum, Base, Arbitrum, and Arc Testnet
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
          {/* Info Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
            <div className="flex items-start space-x-3">
              <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">About Cross-Chain Bridging</h3>
                <p className="text-sm text-blue-800 mb-3">
                  SendHaven uses Circle's Bridge Kit to enable secure, trust-minimized USDC
                  transfers across chains. Bridge Kit uses Circle's Cross-Chain Transfer Protocol
                  (CCTP) which burns USDC on the source chain and mints native USDC on the
                  destination chain.
                </p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• No wrapped tokens or liquidity pools required</li>
                  <li>• Native USDC on every chain</li>
                  <li>• Typically completes in 2-5 minutes</li>
                  <li>• Supported chains: Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia, and Arc Testnet</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bridge Button */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to bridge?</h2>
            <p className="text-gray-600 mb-6">
              Connect your wallet and select the chains you want to bridge between. You can bridge
              USDC to Arc Testnet to create escrows, or bridge back to your preferred chain after
              completing transactions.
            </p>
            <button
              onClick={() => setIsBridgeModalOpen(true)}
              className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-emerald-500 text-white font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              <ArrowLeftRight className="w-5 h-5" />
              <span>Open Bridge</span>
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Secure</h3>
            <p className="text-sm text-gray-600">
              Circle's CCTP is a permissionless protocol that enables secure cross-chain USDC
              transfers without intermediaries.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Fast</h3>
            <p className="text-sm text-gray-600">
              Bridges typically complete in 2-5 minutes. Track your transaction in real-time with
              detailed status updates.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                />
              </svg>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Native USDC</h3>
            <p className="text-sm text-gray-600">
              Receive native USDC on the destination chain, not wrapped tokens. Full liquidity and
              composability everywhere.
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 bg-white rounded-2xl shadow border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                What chains are supported for bridging?
              </h3>
              <p className="text-sm text-gray-600">
                Currently, you can bridge USDC between Ethereum Sepolia, Base Sepolia, Arbitrum
                Sepolia, and Arc Testnet. Mainnet support (Ethereum, Base, Arbitrum, Polygon) will
                be added in a future update.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">How long does bridging take?</h3>
              <p className="text-sm text-gray-600">
                Most bridges complete in 2-5 minutes, but during periods of high network congestion
                it may take longer. You'll be able to track the transaction status in real-time.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Are there any fees?</h3>
              <p className="text-sm text-gray-600">
                Circle's Bridge Kit protocol itself doesn't charge bridge fees. However, you'll need
                to pay gas fees on both the source chain (for the burn transaction) and destination
                chain (for the mint transaction). Make sure you have enough native tokens for gas on
                both chains.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Why do I need to bridge to Arc Testnet?
              </h3>
              <p className="text-sm text-gray-600">
                SendHaven escrows are deployed on Arc Testnet. Arc is optimized for USDC
                transactions, using USDC as the native token for gas fees, which makes it
                cost-effective and seamless for peer-to-peer payments.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I bridge USDC back to my original chain?
              </h3>
              <p className="text-sm text-gray-600">
                Yes! The bridge is bidirectional. After completing an escrow, you can bridge your
                USDC back to Ethereum, Base, Arbitrum, or any other supported chain.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bridge Modal */}
      <BridgeModal isOpen={isBridgeModalOpen} onClose={() => setIsBridgeModalOpen(false)} />
    </div>
  );
}
