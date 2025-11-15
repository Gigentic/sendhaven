'use client';

import { useState } from 'react';
import { ArrowLeftRight, Info, Shield, Zap, Coins } from 'lucide-react';
import BridgeModal from '@/components/bridge/bridge-modal';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function BridgePage() {
  const [isBridgeModalOpen, setIsBridgeModalOpen] = useState(false);

  return (
    <div className="flex-1 bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ArrowLeftRight className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Bridge USDC</h1>
          <p className="text-lg text-muted-foreground">
            Transfer USDC seamlessly across Ethereum, Base, Arbitrum, and Arc Testnet
          </p>
        </div>

        {/* Main Card */}
        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Info Section */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <Info className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-2">About Cross-Chain Bridging</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      SendHaven uses Circle's Bridge Kit to enable secure, trust-minimized USDC
                      transfers across chains. Bridge Kit uses Circle's Cross-Chain Transfer
                      Protocol (CCTP) which burns USDC on the source chain and mints native USDC on
                      the destination chain.
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• No wrapped tokens or liquidity pools required</li>
                      <li>• Native USDC on every chain</li>
                      <li>• Typically completes in 2-5 minutes</li>
                      <li>
                        • Supported chains: Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia, and
                        Arc Testnet
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bridge Button */}
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold">Ready to bridge?</h2>
              <p className="text-muted-foreground">
                Connect your wallet and select the chains you want to bridge between. You can
                bridge USDC to Arc Testnet to create escrows, or bridge back to your preferred
                chain after completing transactions.
              </p>
              <Button onClick={() => setIsBridgeModalOpen(true)} size="lg">
                <ArrowLeftRight className="w-5 h-5 mr-2" />
                Open Bridge
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold mb-2">Secure</h3>
              <p className="text-sm text-muted-foreground">
                Circle's CCTP is a permissionless protocol that enables secure cross-chain USDC
                transfers without intermediaries.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold mb-2">Fast</h3>
              <p className="text-sm text-muted-foreground">
                Bridges typically complete in 2-5 minutes. Track your transaction in real-time with
                detailed status updates.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Coins className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold mb-2">Native USDC</h3>
              <p className="text-sm text-muted-foreground">
                Receive native USDC on the destination chain, not wrapped tokens. Full liquidity and
                composability everywhere.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">What chains are supported for bridging?</h3>
              <p className="text-sm text-muted-foreground">
                Currently, you can bridge USDC between Ethereum Sepolia, Base Sepolia, Arbitrum
                Sepolia, and Arc Testnet. Mainnet support (Ethereum, Base, Arbitrum, Polygon) will
                be added in a future update.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">How long does bridging take?</h3>
              <p className="text-sm text-muted-foreground">
                Most bridges complete in 2-5 minutes, but during periods of high network congestion
                it may take longer. You'll be able to track the transaction status in real-time.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Are there any fees?</h3>
              <p className="text-sm text-muted-foreground">
                Circle's Bridge Kit protocol itself doesn't charge bridge fees. However, you'll need
                to pay gas fees on both the source chain (for the burn transaction) and destination
                chain (for the mint transaction). Make sure you have enough native tokens for gas on
                both chains.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Why do I need to bridge to Arc Testnet?</h3>
              <p className="text-sm text-muted-foreground">
                SendHaven escrows are deployed on Arc Testnet. Arc is optimized for USDC
                transactions, using USDC as the native token for gas fees, which makes it
                cost-effective and seamless for peer-to-peer payments.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">
                Can I bridge USDC back to my original chain?
              </h3>
              <p className="text-sm text-muted-foreground">
                Yes! The bridge is bidirectional. After completing an escrow, you can bridge your
                USDC back to Ethereum, Base, Arbitrum, or any other supported chain.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bridge Modal */}
      <BridgeModal isOpen={isBridgeModalOpen} onClose={() => setIsBridgeModalOpen(false)} />
    </div>
  );
}
