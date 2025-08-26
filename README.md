# STX.CITY Mini

A simplified implementation of STX.CITY - a memecoin launchpad on the Stacks blockchain featuring bonding curve mechanics and secure token trading.

## 🚀 Project Overview

STX.City Mini demonstrates the core functionality of a decentralized token launchpad with:

-   **Token Creation**: Deploy custom SIP-010 compliant tokens
-   **Bonding Curve DEX**: Automated market maker with constant product formula
-   **Secure Trading**: Buy/sell tokens with post-condition validation
-   **Recovery System**: Resume interrupted deployments from checkpoints
-   **Real-time Monitoring**: Track deployment progress and trading metrics

## 📁 Project Structure

```
stacks-city-mini/
├── client/          # Next.js frontend application
├── contract/        # Clarinet smart contracts
└── README.md       # This file
```

## 🏗️ Architecture

### Smart Contracts (`/contract`)

-   **Token Contract** (`token.clar`): SIP-010 fungible token with dynamic metadata
-   **DEX Contract** (`dex.clar`): Bonding curve exchange with 2% trading fees

### Frontend (`/client`)

-   **Next.js 15**: React framework with App Router
-   **@stacks/connect**: Wallet integration and transaction handling
-   **TypeScript**: Type-safe development
-   **Tailwind CSS**: Utility-first styling
-   **shadcn/ui**: Modern UI components

## 🔧 Quick Start

### 1. Smart Contracts

```bash
cd contract/
clarinet check
clarinet console  # For manual testing
```

### 2. Frontend Application

```bash
cd client/
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## ✨ Key Features

### 🎯 Core Functionality

-   **One-Click Token Deployment**: Create and deploy tokens with DEX initialization
-   **Bonding Curve Trading**: Automatic pricing with virtual liquidity (600 STX)
-   **Graduated Launch**: Target 3000 STX for full liquidity pool migration
-   **Fee Distribution**: 2% trading fees split between platform and deployer

### 🔒 Security Features

-   **Post-Condition Validation**: Secure transactions with amount verification
-   **Deployment Recovery**: Resume from token-deployed/dex-deployed/dex-initialized states
-   **Error Handling**: Comprehensive error management and user feedback
-   **Persistent State**: IndexedDB storage for deployment progress

### 📊 Advanced Features

-   **Real-time Progress**: Live bonding curve data and trading metrics
-   **Multi-step Deployment**: Granular checkpoints with recovery capability
-   **Transaction Monitoring**: WebSocket + polling for reliable confirmation
-   **Responsive UI**: Mobile-friendly design with loading states

## 🧪 Testing

### Manual Contract Testing (Proven Workflow)

```bash
clarinet console

# 1. Setup
(contract-call? .token mint u50000000000000 tx-sender)
(contract-call? .token transfer u50000000000000 tx-sender .dex none)
(contract-call? .dex initialize .token u50000000000000 u1000000000)

# 2. Buy tokens
::set_tx_sender ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5
(contract-call? .dex buy .token u100000000)

# 3. Sell tokens
(contract-call? .dex sell .token u100000000)
```

### Frontend Testing

-   Connect Stacks wallet (Leather/Xverse)
-   Deploy test token with DEX
-   Test buy/sell functionality
-   Verify recovery system with interrupted deployments

## 📚 Documentation

-   **Smart Contracts**: See `/contract/README.md` for detailed contract documentation
-   **Frontend**: See `/client/README.md` for development setup and API reference
-   **Architecture**: Comprehensive bonding curve implementation with security features

## 🔗 Key Technologies

-   **Blockchain**: Stacks blockchain (Bitcoin L2)
-   **Smart Contracts**: Clarity language with Clarinet framework
-   **Frontend**: Next.js 15, TypeScript, Tailwind CSS
-   **Wallet Integration**: @stacks/connect with Leather/Xverse support
-   **State Management**: IndexedDB for persistent deployment state

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
