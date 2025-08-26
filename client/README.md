# STX.City Mini - Frontend

A modern Next.js application for deploying and trading tokens on the Stacks blockchain with bonding curve mechanics.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Stacks wallet (Leather or Xverse browser extension)
- Testnet STX for transactions

### Installation & Development

```bash
# Install dependencies
npm install
# or
bun install

# Start development server
npm run dev
# or
bun dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🏗️ Project Structure

```
client/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── layout.tsx       # Root layout with providers
│   │   ├── page.tsx         # Main application page
│   │   └── globals.css      # Global styles
│   ├── components/          # React components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── TokenCard.tsx    # Token display component
│   │   ├── TokenDeployForm.tsx  # Main deployment form
│   │   ├── TradingDialog.tsx    # Buy/sell interface
│   │   └── WalletConnect.tsx    # Wallet connection
│   ├── lib/                 # Core libraries
│   │   ├── stacks.ts        # Blockchain interactions
│   │   ├── contracts.ts     # Contract templates
│   │   ├── indexeddb.ts     # Persistent storage
│   │   ├── transaction-monitor.ts  # TX monitoring
│   │   └── utils.ts         # Utility functions
│   └── types/
│       └── index.ts         # TypeScript definitions
├── public/                  # Static assets
└── package.json
```

## 🔧 Core Features

### 🎯 Token Deployment

- **One-Click Creation**: Deploy token + DEX in single workflow
- **Recovery System**: Resume interrupted deployments from checkpoints
- **Real-time Progress**: Live status updates with transaction monitoring
- **Error Handling**: Comprehensive error management and user feedback

### 🔄 Trading Interface

- **Bonding Curve Trading**: Buy/sell with automatic pricing
- **Post-Condition Security**: Transaction validation for safe trading
- **Live Data**: Real-time price and liquidity updates
- **Progress Tracking**: Visual progress towards graduation target

### 💾 State Management

- **Persistent Storage**: IndexedDB for deployment recovery
- **Granular Checkpoints**: Resume from token-deployed/dex-deployed/initialized states
- **Error Recovery**: Robust handling of failed transactions

## 🔐 Security Features

### Post-Condition Validation

All trading functions include post-conditions for security:

```typescript
// Buy tokens: Ensure STX spent and tokens received
const postConditions = [
	{ type: "stx-postcondition", condition: "eq", amount: stxAmount },
	{ type: "ft-postcondition", condition: "gte", amount: 1 },
];

// Sell tokens: Ensure tokens sent and STX received
const postConditions = [
	{ type: "ft-postcondition", condition: "eq", amount: tokenAmount },
	{ type: "stx-postcondition", condition: "gte", amount: 1 },
];
```

### Transaction Monitoring

Reliable transaction confirmation with WebSocket + polling fallback:

```typescript
const result = await waitForTxConfirmed(txId, {
	timeout: 300000, // 5 minute timeout
	pollingInterval: 3000, // 3 second polling
});
```

## 📚 API Reference

### Core Functions (`src/lib/stacks.ts`)

#### Wallet Management

```typescript
connectWallet(): Promise<WalletResponse>
disconnectWallet(): void
getUserData(): UserData | null
```

#### Contract Deployment

```typescript
deployTokenContract(name: string, symbol: string): Promise<{contractId: string, txId: string}>
deployDexContract(tokenName: string): Promise<{contractId: string, txId: string}>
initializeDex(dexContract: string, tokenContract: string, tokenAmount: number, stxAmount: number): Promise<string>
```

#### Trading Functions

```typescript
buyTokens(dexContract: string, tokenContract: string, stxAmount: number): Promise<string>
sellTokens(dexContract: string, tokenContract: string, tokenAmount: number): Promise<string>
transferTokens(tokenContract: string, amount: number, recipient: string): Promise<string>
```

#### Data Fetching

```typescript
getBondingCurveData(dexContract: string): Promise<BondingCurveData>
calculateBuyPreview(stxAmount: number, currentStx: number, currentTokens: number): BuyPreview
calculateSellPreview(tokenAmount: number, currentStx: number, currentTokens: number): SellPreview
```

### Recovery System (`src/lib/indexeddb.ts`)

```typescript
saveIncompleteDeployment(deployment: IncompleteDeployment): Promise<void>
getIncompleteDeploymentsByOwner(owner: string): Promise<IncompleteDeployment[]>
deleteIncompleteDeployment(id: string): Promise<void>
```

## 🎨 Component Architecture

### TokenDeployForm.tsx

Main deployment interface with multi-step workflow:

- **Form Validation**: Real-time input validation
- **Progress Tracking**: Visual progress with step indicators
- **Recovery UI**: Resume interrupted deployments
- **Error Handling**: User-friendly error messages

### TradingDialog.tsx

Trading interface with bonding curve visualization:

- **Buy/Sell Interface**: Tabbed trading panel
- **Price Preview**: Real-time price calculations
- **Progress Visualization**: Bonding curve progress bar
- **Transaction Status**: Live transaction monitoring

### WalletConnect.tsx

Wallet integration component:

- **Connection Management**: Connect/disconnect wallet
- **Account Display**: Show connected address
- **Network Handling**: Testnet/mainnet awareness

## 🧪 Testing Workflow

### Local Development Testing

1. **Start Development Server**: `npm run dev`
2. **Connect Wallet**: Use Leather or Xverse on testnet
3. **Deploy Token**: Create test token with DEX
4. **Test Trading**: Buy/sell tokens through interface
5. **Test Recovery**: Interrupt deployment and resume

### Manual Contract Testing

```bash
# In contract directory
cd ../contract
clarinet console

# Test full workflow
(contract-call? .token mint u50000000000000 tx-sender)
(contract-call? .token transfer u50000000000000 tx-sender .dex none)
(contract-call? .dex initialize .token u50000000000000 u1000000000)
```

## 🔧 Configuration

### Environment Variables

```bash
# .env.local (optional)
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_API_URL=https://api.testnet.hiro.so
```

### Bonding Curve Constants

```typescript
export const CONSTANTS = {
	TARGET_STX: 3000000000, // 3000 STX target
	VIRTUAL_STX: 600000000, // 600 STX virtual liquidity
	FEE_PERCENTAGE: 2, // 2% trading fee
	TOKEN_DECIMALS: 6, // 6 decimal places
	MAX_SUPPLY: 100000000000000, // 100M token max supply
};
```

## 🐛 Troubleshooting

### Common Issues

**Wallet Connection Issues**:

- Ensure wallet extension is installed and unlocked
- Check network setting (testnet required)
- Refresh page if connection fails

**Transaction Failures**:

- Verify sufficient STX balance for fees
- Check post-condition requirements
- Monitor transaction status in explorer

**Deployment Recovery**:

- Check IndexedDB for saved state
- Verify contract addresses are correct
- Resume from appropriate checkpoint

## 📦 Dependencies

### Core Dependencies

- **Next.js 15**: React framework with App Router
- **@stacks/connect**: Wallet integration
- **@stacks/transactions**: Transaction building
- **React 18**: UI library
- **TypeScript**: Type safety

### UI Dependencies

- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Modern component library
- **Lucide React**: Icon library
- **Radix UI**: Headless UI primitives

### Development Tools

- **ESLint**: Code linting
- **PostCSS**: CSS processing
- **TypeScript**: Type checking

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Connect to Vercel
npx vercel

# Deploy
npx vercel --prod
```

### Other Platforms

- **Netlify**: Static site deployment
- **Railway**: Full-stack deployment
- **Self-hosted**: Build and serve static files

## 🤝 Contributing

1. **Development Setup**: Follow installation instructions
2. **Code Style**: Use ESLint configuration
3. **Testing**: Test wallet integration and trading flows
4. **Documentation**: Update README for new features
5. **Pull Requests**: Include clear description of changes

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
