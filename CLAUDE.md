# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SendHaven is a cross-chain escrow protocol. It enables secure peer-to-peer transactions with AI-assisted dispute resolution, targeting emerging markets where traditional banking is limited.

**Key Technologies:**
- Frontend: Next.js 14 (App Router) with Turborepo monorepo
- Package Manager: pnpm (required)
- Web3: RainbowKit + wagmi v2 + viem + ethers v6
- Cross-Chain: Circle Bridge Kit (CCTP for USDC bridging)
- Authentication: NextAuth with SIWE (Sign-In With Ethereum)
- Backend Storage: Upstash Redis (KV store for metadata)
- UI: Radix UI primitives + Tailwind CSS + shadcn/ui
- Smart Contracts: Foundry (Solidity 0.8.28) in separate repo at `/Users/marci/dev/Gigentic/sendhaven-arc`

## Development Commands

### Frontend (from repository root)
```bash
pnpm install          # Install dependencies
pnpm dev              # Start Next.js dev server (http://localhost:3000)
pnpm build            # Build for production
pnpm type-check       # TypeScript validation
pnpm lint             # Run ESLint
```

### Smart Contracts (from sendhaven-arc repo)
```bash
cd /Users/marci/dev/Gigentic/sendhaven-arc
forge build           # Compile contracts
forge test            # Run tests
source .env           # Load environment variables
forge script script/DeployFactory.s.sol --rpc-url $ARC_TESTNET_RPC_URL --broadcast  # Deploy
```

## Architecture

### Chain Configuration
SendHaven supports cross-chain USDC deposits via Circle Bridge Kit while all escrows are deployed on Arc Testnet.

**Supported Chains** (configured in `apps/web/src/config/wagmi-ssr.ts`):
- **Arc Testnet** (Chain ID: 5042002) - **Primary escrow deployment chain**
  - Uses USDC (6 decimals) as native gas token
  - Factory contract address: `NEXT_PUBLIC_MASTER_FACTORY_ADDRESS_ARC`
- **Ethereum Sepolia** (Chain ID: 11155111) - Bridge source chain
- **Base Sepolia** (Chain ID: 84532) - Bridge source chain
- **Arbitrum Sepolia** (Chain ID: 421614) - Bridge source chain

**Important**: Escrows can ONLY be created on Arc Testnet. Users on other chains will be prompted to bridge their USDC to Arc via the integrated Bridge Kit interface.

### Smart Contract Architecture
SendHaven uses a **factory pattern** for escrow deployment:

1. **MasterFactory** (`apps/web/src/lib/escrow-config.ts:4-164`): Factory contract that creates individual escrow instances
   - Deploys new EscrowContract instances via `createEscrow()`
   - Tracks all escrows in `allEscrows[]` array
   - Maintains global arbiter address
   - Emits `EscrowCreated` events for indexing

2. **EscrowContract**: Individual escrow instance with 4-state machine
   - States: `CREATED → DISPUTED → COMPLETED/REFUNDED`
   - Uses hash-based deliverable verification
   - 1% platform fee + 4% refundable dispute bond

### Data Storage Pattern
SendHaven uses a **hybrid on-chain/off-chain storage** model:

**On-Chain (Smart Contract State):**
- Escrow financial data (amounts, fees, bonds)
- State transitions (CREATED → DISPUTED → COMPLETED/REFUNDED)
- Participant addresses (depositor, recipient, arbiter)
- Hashes only (deliverable hash, dispute reason hash, resolution hash)

**Off-Chain (Upstash Redis KV):**
- Full deliverable documents (title, description, acceptance criteria)
- Dispute reason text
- Resolution documents (arbiter rationale, evidence)
- User profiles (name, bio, verification status)

**Key Pattern:** Contracts store `keccak256` hashes, frontend stores/retrieves full documents from KV using those hashes as keys.

Key files:
- `apps/web/src/lib/kv.ts`: KV client singleton and key generation helpers
- `apps/web/src/lib/types.ts`: TypeScript interfaces for all documents
- `apps/web/src/lib/queries.ts`: Server-side data fetching utilities

### Authentication Flow
NextAuth + SIWE for wallet-based authentication:

1. User connects wallet via RainbowKit
2. Frontend requests SIWE message from NextAuth
3. User signs message with wallet
4. NextAuth verifies signature and creates JWT session
5. Session stored in JWT with wallet address as `token.sub`

Key files:
- `apps/web/src/lib/auth.ts`: NextAuth configuration with SIWE provider
- `apps/web/src/app/api/auth/[...nextauth]/route.ts`: NextAuth API handler
- `apps/web/src/hooks/use-sync-wallet-with-session.ts`: Auto-logout on wallet change

Admin routes check `ADMIN_WALLET_ADDRESS` environment variable server-side.

### Bridge Kit Integration
SendHaven integrates Circle's Bridge Kit to enable cross-chain USDC deposits:

**Flow:**
1. User on Sepolia/Base Sepolia/Arbitrum Sepolia visits `/create`
2. App detects user is not on Arc Testnet
3. Shows `BridgePrompt` component with explanation + "Open Bridge" button
4. User clicks → Opens `BridgeModal` with pre-set direction (current chain → Arc)
5. User selects amount → Bridge Kit handles: approval, burn on source, attestation, mint on Arc
6. After successful bridge, user can create escrow on Arc

**Key Features:**
- **Bidirectional**: Users can bridge USDC to Arc (for escrows) or back to origin chains (after completing escrows)
- **Trust-minimized**: Uses Circle's CCTP protocol (burn on source, mint on destination)
- **Native USDC**: No wrapped tokens, always native USDC
- **Real-time tracking**: Shows elapsed time and transaction hashes

**Key Files:**
- `apps/web/src/lib/bridge-config.ts`: Token addresses, chain IDs, helper functions
- `apps/web/src/hooks/use-bridge.ts`: Core bridging logic with balance fetching
- `apps/web/src/components/bridge/bridge-modal.tsx`: Bridge UI with bidirectional toggle
- `apps/web/src/components/bridge/bridge-prompt.tsx`: Prompt shown on `/create` for non-Arc users
- `apps/web/src/app/bridge/page.tsx`: Standalone bridge page (accessible from navigation)

**Supported Bridge Directions:**
- Sepolia ↔ Arc Testnet
- Base Sepolia ↔ Arc Testnet
- Arbitrum Sepolia ↔ Arc Testnet

### Component Architecture
The app follows **Next.js App Router** conventions:

**Pages (apps/web/src/app/):**
- `/` - Landing page
- `/create` - Create new escrow (shows bridge prompt if not on Arc)
- `/bridge` - Standalone bridge page for USDC cross-chain transfers
- `/escrow/[address]` - View escrow details
- `/dashboard` - User's escrow list
- `/admin/disputes` - Admin dispute management
- `/profile/[address]` - User profiles

**API Routes (apps/web/src/app/api/):**
- `/api/documents/store` - Store deliverable/dispute/resolution docs to KV
- `/api/documents/[hash]` - Retrieve documents from KV
- `/api/admin/disputes` - List disputes (admin only)
- `/api/admin/resolve` - Resolve disputes (admin only)
- `/api/profile/[address]` - User profile CRUD

### Custom Hooks Pattern
Hooks in `apps/web/src/hooks/` encapsulate all Web3 interactions and follow a consistent pattern:

**Transaction Hooks** (return `MutationState` with granular steps):
- `use-create-escrow.ts`: Approve USDC → Create escrow → Store deliverable
- `use-dispute-escrow.ts`: Bond approval → Raise dispute → Store reason
- `use-complete-escrow.ts`: Release funds to recipient
- `use-approve-spending-cap.ts`: Generic ERC20 approval handler
- `use-bridge.ts`: **NEW** - Cross-chain USDC bridging via Circle Bridge Kit

**Query Hooks** (return data with loading/error states):
- `use-escrow-details.ts`: Fetch on-chain + off-chain escrow data
- `use-user-escrows.ts`: List user's escrows from factory events
- `use-profile.ts`: Fetch user profile from KV

**Auth Hooks:**
- `use-sync-wallet-with-session.ts`: Auto-logout when wallet changes
- `use-require-auth.ts`: Redirect to signin if not authenticated

### Type Safety
All types are centralized in `apps/web/src/lib/types.ts`:
- Event args types (`EscrowCreatedEventArgs`)
- Document types (`DeliverableDocument`, `DisputeDocument`, `ResolutionDocument`)
- Mutation state types (`MutationStep` enum, `MutationState`)
- Form parameter types (`CreateEscrowParams`, `DisputeParams`)

ABIs are in `apps/web/src/lib/escrow-config.ts` (extracted from Foundry builds).

## Important Patterns

### USDC Token Addresses
SendHaven now uses USDC exclusively (6 decimals) on all chains:

**Arc Testnet**: `0x3600000000000000000000000000000000000000` (native ERC-20 interface)
**Ethereum Sepolia**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` (Circle Bridge Kit USDC)
**Base Sepolia**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Circle Bridge Kit USDC)
**Arbitrum Sepolia**: `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` (Circle Bridge Kit USDC)

All USDC addresses are centralized in `apps/web/src/lib/bridge-config.ts` under `CHAIN_TOKENS`.

### Factory Contract Resolution
Only Arc Testnet supports escrow contracts:
```typescript
// apps/web/src/lib/escrow-config.ts
export function getMasterFactoryAddress(chainId: number): Address {
  if (chainId !== 5042002) {
    throw new Error(`Only Arc Testnet (5042002) is supported. Use the bridge feature to transfer USDC to Arc Testnet.`);
  }
  return process.env.NEXT_PUBLIC_MASTER_FACTORY_ADDRESS_ARC!;
}
```

### KV Key Namespacing
Keys include chain name to prevent cross-chain collisions:
```typescript
// Pattern: {chainName}:{type}:{identifier}
kvKeys.deliverable(chainId, escrowAddress) // "arc:deliverable:0x123..."
kvKeys.dispute(chainId, hash) // "arc:dispute:0xabc..."
kvKeys.profile(address) // "profile:0x456..." (global, no chain prefix)
```

### SSR-Safe wagmi Configuration
The app uses **two wagmi configs**:
1. `wagmiSsrConfig` (server-side): Empty connectors array for `cookieToInitialState()`
2. Client config (created in `WalletProvider`): Full RainbowKit connectors

This prevents hydration mismatches. See `apps/web/src/app/layout.tsx:31-37` and `apps/web/src/components/wallet/wallet-provider.tsx`.

### Transaction Mutation Steps
Use `MutationStep` enum for granular loading states:
```typescript
// Example from use-create-escrow.ts
IDLE → APPROVING → CREATING → CONFIRMING → STORING → IDLE
```

This provides better UX feedback than boolean `isLoading`.

## Environment Variables Required

```bash
# Wallet Connect
NEXT_PUBLIC_WC_PROJECT_ID=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# NextAuth
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Contract Address (Arc Testnet only)
NEXT_PUBLIC_MASTER_FACTORY_ADDRESS_ARC=

# Admin (server-side only)
ADMIN_WALLET_ADDRESS=
```

See `apps/web/.env.example` for complete list including Self Protocol verification.

## Current TODOs

**WP1 (Completed):**
- ✅ Integrated Circle's Bridge Kit for cross-chain USDC deposits
- ✅ Enabled bidirectional bridging (Sepolia, Base Sepolia, Arbitrum Sepolia ↔ Arc)
- ✅ Removed Celo chain support in favor of USDC-only approach
- ✅ Updated all escrow operations to use 6-decimal USDC

**WP2 (Dispute Resolution Improvements - Next Priority):**
- Add pre-arbitration negotiation period between parties (see `docs/Traditional-Escrow-Dispute-Resolution-Comparison.md`)
- Allow both parties to submit evidence before arbiter decision
- Integrate AI-powered resolution helper for arbiters
- Address arbiter incentive asymmetry (current 5x compensation differential doesn't align with industry standards)

**Future Enhancements:**
- Add mainnet support (Base, Arbitrum, Ethereum, Polygon) for Bridge Kit
- Add bridge transaction history tracking in user profile
- Implement "auto-bridge and create" flow for smoother UX
