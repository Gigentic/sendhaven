# SendHaven

> A cross-chain escrow protocol with AI-assisted dispute resolution for secure peer-to-peer transactions

SendHaven enables trust-minimized P2P transactions with built-in dispute resolution, specifically targeting emerging markets where traditional banking infrastructure is limited. All escrows are deployed on Arc Testnet, with cross-chain USDC deposits powered by Circle's Bridge Kit (CCTP).

## Features

- **Cross-Chain USDC Deposits**: Bridge USDC from Ethereum Sepolia, Base Sepolia, or Arbitrum Sepolia to Arc Testnet via Circle's CCTP protocol
- **Arc Testnet Integration**: Deploy escrows on Arc's USDC-native gas fee structure for cost-effective transactions
- **Wallet Authentication**: Sign-In With Ethereum (SIWE) via NextAuth for secure, wallet-based authentication
- **Hash-Based Deliverables**: On-chain hash verification with off-chain document storage in Upstash Redis KV
- **4-State Escrow Lifecycle**: `CREATED → DISPUTED → COMPLETED/REFUNDED` with transparent state transitions
- **AI-Assisted Dispute Resolution**: Arbiter dashboard with AI-powered resolution helpers (coming in WP2)
- **Bidirectional Bridging**: Bridge USDC to Arc for escrow creation, or back to origin chains after completion

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router) with TypeScript
- **Monorepo**: Turborepo with pnpm workspaces
- **Web3**: RainbowKit + wagmi v2 + viem + ethers v6
- **Authentication**: NextAuth with SIWE provider
- **UI**: Radix UI primitives, Tailwind CSS, shadcn/ui components
- **Cross-Chain**: Circle Bridge Kit for CCTP-based USDC bridging

### Backend & Storage
- **Database**: Upstash Redis (KV store for deliverables, disputes, resolutions, profiles)
- **Smart Contracts**: Foundry-based Solidity contracts (separate repo at `/sendhaven-arc`)

### Supported Chains
- **Arc Testnet** (Chain ID: 5042002) - Primary escrow deployment chain
- **Ethereum Sepolia** (Chain ID: 11155111) - Bridge source
- **Base Sepolia** (Chain ID: 84532) - Bridge source
- **Arbitrum Sepolia** (Chain ID: 421614) - Bridge source

## Quick Start

### Prerequisites
- Node.js >= 18.0.0
- pnpm >= 8.0.0 (required, npm/yarn not supported)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/sendhaven.git
cd sendhaven

# Install dependencies
pnpm install
```

### Environment Setup

Create `apps/web/.env.local` with the following variables:

```bash
# WalletConnect Project ID (get from https://cloud.walletconnect.com)
NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_project_id

# Upstash Redis (get from https://console.upstash.com)
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Contract Address (Arc Testnet)
NEXT_PUBLIC_MASTER_FACTORY_ADDRESS_ARC=0xe94A1cD5Ca165f4420024De3Fa3ca8940Bc25b64

# Admin Wallet (for dispute resolution)
ADMIN_WALLET_ADDRESS=your_admin_wallet_address
```

See `apps/web/.env.example` for a complete list of environment variables.

### Development

```bash
# Start Next.js dev server (runs on http://localhost:3000)
pnpm dev

# Build for production
pnpm build

# Type checking
pnpm type-check

# Linting
pnpm lint
```

## Project Structure

```
sendhaven/
├── apps/
│   └── web/                      # Next.js application
│       ├── src/
│       │   ├── app/              # Next.js App Router pages
│       │   │   ├── api/          # API routes (document storage, admin)
│       │   │   ├── bridge/       # Standalone bridge page
│       │   │   ├── create/       # Escrow creation (with bridge prompt)
│       │   │   ├── dashboard/    # User's escrow list
│       │   │   ├── escrow/[address]/  # Escrow details page
│       │   │   └── profile/[address]/ # User profiles
│       │   ├── components/       # React components
│       │   │   ├── bridge/       # Bridge UI components
│       │   │   ├── escrow/       # Escrow-specific components
│       │   │   ├── ui/           # shadcn/ui primitives
│       │   │   └── wallet/       # Wallet connection components
│       │   ├── hooks/            # Custom React hooks
│       │   │   ├── use-bridge.ts # Cross-chain bridging logic
│       │   │   ├── use-create-escrow.ts
│       │   │   ├── use-dispute-escrow.ts
│       │   │   └── ...
│       │   ├── lib/              # Utilities and configuration
│       │   │   ├── auth.ts       # NextAuth configuration
│       │   │   ├── bridge-config.ts  # Token addresses & chain config
│       │   │   ├── escrow-config.ts  # Factory ABI & helpers
│       │   │   ├── kv.ts         # Upstash Redis client
│       │   │   ├── queries.ts    # Server-side data fetching
│       │   │   ├── types.ts      # TypeScript type definitions
│       │   │   └── wagmi-ssr.ts  # SSR-safe wagmi config
│       │   └── ...
│       └── ...
├── docs/                         # Documentation
├── CLAUDE.md                     # Claude Code guidance
├── package.json                  # Root package.json
├── pnpm-workspace.yaml           # pnpm workspace config
└── turbo.json                    # Turborepo configuration
```

## Architecture Overview

### Smart Contract Pattern
SendHaven uses a **factory pattern** for escrow deployment:

- **MasterFactory**: Deploys individual `EscrowContract` instances via `createEscrow()`
- **EscrowContract**: 4-state escrow with hash-based deliverable verification
- **Factory Address**: `0xe94A1cD5Ca165f4420024De3Fa3ca8940Bc25b64` (Arc Testnet only)

### Data Storage Model
**Hybrid on-chain/off-chain storage**:

**On-Chain (Smart Contract)**:
- Escrow financial data (amounts, fees, bonds)
- State transitions and participant addresses
- Hashes only (deliverable, dispute, resolution)

**Off-Chain (Upstash Redis KV)**:
- Full deliverable documents (title, description, criteria)
- Dispute reason text
- Resolution documents (arbiter rationale, evidence)
- User profiles (name, bio, verification)

**Pattern**: Contracts store `keccak256` hashes, frontend stores/retrieves full documents using hashes as keys.

### Cross-Chain Bridge Flow

1. User on Sepolia/Base/Arbitrum visits `/create` page
2. App detects user is not on Arc Testnet
3. Shows `BridgePrompt` with explanation + "Open Bridge" button
4. User opens `BridgeModal` with pre-set direction (current chain → Arc)
5. Bridge Kit handles: USDC approval → burn on source → attestation → mint on Arc
6. After successful bridge, user can create escrow on Arc Testnet

Users can also bridge USDC back to origin chains via the `/bridge` page.

### Authentication Flow

1. User connects wallet via RainbowKit
2. Frontend requests SIWE message from NextAuth
3. User signs message with wallet
4. NextAuth verifies signature and creates JWT session
5. Session stored with wallet address as `token.sub`

Auto-logout occurs if wallet address changes (see `use-sync-wallet-with-session.ts`).

## Key Concepts

### USDC Token Addresses
All chains use 6-decimal USDC:

- **Arc Testnet**: `0x3600000000000000000000000000000000000000` (native ERC-20)
- **Ethereum Sepolia**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- **Base Sepolia**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Arbitrum Sepolia**: `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`

All addresses are centralized in `apps/web/src/lib/bridge-config.ts`.

### Escrow Lifecycle

```
CREATED → DISPUTED → COMPLETED/REFUNDED
```

- **CREATED**: Funds locked, deliverable submitted
- **DISPUTED**: Either party raises dispute (4% bond required)
- **COMPLETED**: Funds released to recipient
- **REFUNDED**: Funds returned to depositor

### Fee Structure

- **Platform Fee**: 1% of escrow amount
- **Dispute Bond**: 4% of escrow amount (refundable to winning party)
- **Gas Fees**: Paid in USDC on Arc Testnet (cost-effective)

## Custom Hooks

Transaction hooks return `MutationState` with granular step tracking:

- `use-create-escrow.ts`: IDLE → APPROVING → CREATING → CONFIRMING → STORING → IDLE
- `use-dispute-escrow.ts`: Bond approval → Raise dispute → Store reason
- `use-complete-escrow.ts`: Release funds to recipient
- `use-bridge.ts`: Cross-chain USDC bridging with balance fetching

Query hooks:
- `use-escrow-details.ts`: Fetch on-chain + off-chain escrow data
- `use-user-escrows.ts`: List user's escrows from factory events
- `use-profile.ts`: Fetch user profile from KV

## Development Notes

### SSR-Safe wagmi Configuration
The app uses **two wagmi configs** to prevent hydration mismatches:

1. `wagmiSsrConfig` (server-side): Empty connectors for `cookieToInitialState()`
2. Client config (in `WalletProvider`): Full RainbowKit connectors

See `apps/web/src/app/layout.tsx:31-37` and `apps/web/src/components/wallet/wallet-provider.tsx`.

### KV Key Namespacing
Keys include chain name to prevent collisions:

```typescript
kvKeys.deliverable(chainId, escrowAddress) // "arc:deliverable:0x123..."
kvKeys.dispute(chainId, hash) // "arc:dispute:0xabc..."
kvKeys.profile(address) // "profile:0x456..." (global)
```

## Smart Contracts

Smart contracts are maintained in a separate repository at `/sendhaven-arc`. See that repo for:

- Solidity source code (`src/`)
- Deployment scripts (`script/`)
- Contract tests (`test/`)
- Foundry configuration

## Roadmap

### Completed (WP1)
- Circle Bridge Kit integration for cross-chain USDC deposits
- Bidirectional bridging (Sepolia, Base Sepolia, Arbitrum Sepolia ↔ Arc)
- USDC-only approach (removed Celo support)
- 6-decimal USDC integration across all escrow operations

### Next (WP2) - Dispute Resolution Improvements
- Pre-arbitration negotiation period between parties
- Evidence submission for both parties before arbiter decision
- AI-powered resolution helper for arbiters
- Address arbiter incentive asymmetry

### Future Enhancements
- Mainnet support (Base, Arbitrum, Ethereum, Polygon)
- Bridge transaction history tracking
- "Auto-bridge and create" flow for smoother UX

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- **Smart Contracts**: [sendhaven-arc](../sendhaven-arc)
- **Arc Testnet Explorer**: https://testnet.arcscan.app
- **Circle Bridge Kit**: https://www.circle.com/en/cross-chain-transfer-protocol

## Support

For issues and questions:
- Open an issue on GitHub
- Review the [CLAUDE.md](CLAUDE.md) file for development guidance
