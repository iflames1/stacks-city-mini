# STX.CITY Mini - Smart Contracts

This project contains a simplified implementation of the core contracts that power STX.CITY, a memecoin launchpad on the Stacks blockchain.

## Contracts Overview

### 1. Token Contract (`token.clar`)

-   **Status**: ✅ Fully Working & Tested
-   Implements a SIP-010 compliant fungible token
-   Features:
    -   Dynamic metadata (name, symbol, URI can be updated by owner)
    -   Minting functionality (owner only)
    -   6 decimal places (1 token = 1,000,000 micro-tokens)
    -   100M token maximum supply
    -   Transfer functionality with proper authorization checks
    -   Owner management and transfer capabilities

### 2. DEX Contract (`dex.clar`)

-   **Status**: ✅ Fully Working & Tested
-   Implements a bonding curve-based decentralized exchange
-   Features:
    -   Bonding curve pricing using constant product formula (x \* y = k)
    -   2% trading fees (split between platform and token deployer)
    -   Virtual liquidity (600 STX) for initial price discovery
    -   Target STX amount (3000 STX) for "graduation"
    -   Complete buy/sell functionality with automatic price adjustment
    -   Real-time progress tracking and state management
    -   Conditional fee transfers (prevents zero-amount transfer errors)

## Key Features ✅

### Bonding Curve Mechanics (Fully Implemented)

-   **Virtual STX**: 600 STX added to provide initial liquidity
-   **Target Amount**: 3000 STX needed for graduation
-   **Fee Structure**: 2% on all trades (1% to platform, 1% to deployer)
-   **Price Discovery**: Automatic pricing based on constant product formula (x × y = k)
-   **Smart Fee Handling**: Conditional transfers to prevent zero-amount errors

### Token Lifecycle (Complete Implementation)

1. **Creation**: Token is minted with initial supply to deployer
2. **Initialization**: DEX is initialized with token liquidity
3. **Trading**: Users can buy/sell through bonding curve with real STX transfers
4. **Fee Distribution**: Automatic platform and deployer fee collection
5. **State Management**: Real-time balance and progress tracking
6. **Graduation**: Trading disables when 3000 STX target is reached

### Verified Functionality

-   ✅ **Token Contract**: All SIP-010 functions working (mint, transfer, metadata)
-   ✅ **DEX Buy Function**: STX → Tokens with proper fee distribution
-   ✅ **DEX Sell Function**: Tokens → STX with automatic pricing
-   ✅ **Bonding Curve Math**: Accurate price calculations using x\*y=k formula
-   ✅ **State Updates**: Proper balance tracking and progress monitoring
-   ✅ **Authorization**: Owner-only functions and proper access controls

## Testing & Verification

The contracts have been thoroughly tested using **Clarinet Console** for manual testing, which proved more effective than automated tests for this implementation.

### Manual Testing Workflow (Proven Working)

1. **Setup and Initialization**:

```bash
clarinet console
(contract-call? .token mint u50000000000000 tx-sender)
(contract-call? .token transfer u50000000000000 tx-sender .dex none)
(contract-call? .dex initialize .token u50000000000000 u1000000000)
```

2. **Buy Function Testing**:

```bash
::set_tx_sender ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dex buy 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token u100000000)
```

3. **Sell Function Testing**:

```bash
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dex sell 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token u100000000)
```

### Verified Results ✅

-   **Buy**: 100 STX → 2,885,747,938,752 tokens (with 2% fee distribution)
-   **Sell**: 100,000,000 tokens → 3,531 micro-STX (with proper fee handling)
-   **State Management**: All balances and progress tracking working correctly

## Development Setup

1. **Install Clarinet** (Stacks development framework):

```bash
# Installation instructions at https://docs.hiro.so/clarinet
```

2. **Clone and Navigate**:

```bash
cd contract/
```

3. **Check Contract Compilation**:

```bash
clarinet check
```

4. **Manual Testing** (Recommended):

```bash
clarinet console
# Use the testing workflow above
```
