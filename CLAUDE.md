# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SendHaven is a cross-chain escrow protocol. It enables secure peer-to-peer transactions with AI-assisted dispute resolution, targeting emerging markets where traditional banking is limited.

**Key Technologies:**
- Frontend: Next.js 14 (App Router) with Turborepo monorepo
- Package Manager: pnpm (required)
- Web3: RainbowKit + wagmi v2 + viem + ethers v6
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
The app supports multiple chains configured in `apps/web/src/config/wagmi-ssr.ts`:
- **Arc Testnet** (Chain ID: 5042002) - Primary deployment target
- **Celo Mainnet** (Chain ID: 42220)
- **Celo Sepolia** (Chain ID: 11142220) - Testing

Factory contract addresses are environment-specific and configured in `.env.local`:
- `NEXT_PUBLIC_MASTER_FACTORY_ADDRESS_ARC`
- `NEXT_PUBLIC_MASTER_FACTORY_ADDRESS_CELO`
- `NEXT_PUBLIC_MASTER_FACTORY_ADDRESS_SEPOLIA`

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

### Component Architecture
The app follows **Next.js App Router** conventions:

**Pages (apps/web/src/app/):**
- `/` - Landing page
- `/create` - Create new escrow
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

### Multi-Chain Contract Address Resolution
Factory addresses vary by chain. Use this helper pattern:
```typescript
// apps/web/src/lib/contract-helpers.ts
export function getFactoryAddress(chainId: number): Address {
  switch (chainId) {
    case 5042002: return process.env.NEXT_PUBLIC_MASTER_FACTORY_ADDRESS_ARC!;
    case 42220: return process.env.NEXT_PUBLIC_MASTER_FACTORY_ADDRESS_CELO!;
    case 11142220: return process.env.NEXT_PUBLIC_MASTER_FACTORY_ADDRESS_SEPOLIA!;
    default: throw new Error(`Unsupported chain: ${chainId}`);
  }
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

# Contract Addresses (multi-chain)
NEXT_PUBLIC_MASTER_FACTORY_ADDRESS_ARC=
NEXT_PUBLIC_MASTER_FACTORY_ADDRESS_CELO=
NEXT_PUBLIC_MASTER_FACTORY_ADDRESS_SEPOLIA=

# Admin (server-side only)
ADMIN_WALLET_ADDRESS=
```

See `apps/web/.env.example` for complete list including Self Protocol verification.

## Current TODOs

**WP1 (High Priority):**
- Integrate Circle's Bridge Kit for cross-chain USDC deposits (enable deposits from Base, Arbitrum, Ethereum, Polygon → Arc escrows)

**WP2 (Dispute Resolution Improvements):**
- Add pre-arbitration negotiation period between parties (see `docs/Traditional-Escrow-Dispute-Resolution-Comparison.md`)
- Allow both parties to submit evidence before arbiter decision
- Integrate AI-powered resolution helper for arbiters
- Address arbiter incentive asymmetry (current 5x compensation differential doesn't align with industry standards)
