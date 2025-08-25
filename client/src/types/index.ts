export interface DeployedToken {
	id: string;
	name: string;
	symbol: string;
	description: string;
	tokenContract: string;
	dexContract: string;
	deployedBy: string;
	deployedAt: number;
	targetStx: number;
	currentStx?: number;
	currentPrice?: number;
	tokenBalance?: number;
	totalSupply?: number;
	progress?: number;
}

export interface WalletState {
	isConnected: boolean;
	address?: string;
	network?: string;
}

export interface TransactionState {
	loading: boolean;
	error?: string;
	success?: boolean;
	txId?: string;
	message?: string;
}

export interface BondingCurveData {
	currentStx: number;
	targetStx: number;
	currentTokens: number;
	virtualStx: number;
	price: number;
	progress: number;
}

export interface TradePreview {
	inputAmount: number;
	outputAmount: number;
	fee: number;
	priceImpact: number;
	newPrice: number;
}
