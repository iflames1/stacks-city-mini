import {
	connect,
	disconnect,
	isConnected,
	getLocalStorage,
	request,
} from "@stacks/connect";
import { Cl } from "@stacks/transactions";
import { BondingCurveData } from "@/types";
import { getTokenContract, getDexContract } from "./contracts";

// Contract constants (matching your smart contracts)
export const CONSTANTS = {
	TARGET_STX: 3000000000, // 3000 STX in micro-STX
	VIRTUAL_STX: 600000000, // 600 STX in micro-STX
	FEE_PERCENTAGE: 2, // 2% fee
	TOKEN_DECIMALS: 6, // 6 decimal places
	MAX_SUPPLY: 100000000000000, // 100M tokens
};

// Wallet connection functions
export const connectWallet = async () => {
	try {
		const response = await connect({
			forceWalletSelect: true,
		});
		return response;
	} catch (error) {
		console.error("Failed to connect wallet:", error);
		throw error;
	}
};

export const disconnectWallet = () => {
	disconnect();
	window.location.reload();
};

export const getUserData = () => {
	if (typeof window === "undefined") return null;

	if (isConnected()) {
		const data = getLocalStorage();
		if (data?.addresses?.stx?.[0]) {
			return {
				profile: {
					stxAddress: {
						testnet: data.addresses.stx[0].address,
						mainnet: data.addresses.stx[0].address,
					},
				},
			};
		}
	}
	return null;
};

// Contract deployment functions
export const deployTokenContract = async (
	name: string,
	symbol: string
): Promise<{ contractId: string; txId: string }> => {
	const userData = getUserData();
	if (!userData) throw new Error("No wallet connected");

	try {
		// Get the Clarity code from the contract template
		const clarityCode = getTokenContract(name, symbol);
		const contractName = `${symbol.toLowerCase()}-token`;

		const response = await request("stx_deployContract", {
			name: contractName,
			clarityCode,
			network: "testnet",
		});

		const contractId = `${userData.profile.stxAddress.testnet}.${contractName}`;
		const txId = response.txid;

		if (!txId) {
			throw new Error("No transaction ID returned from deployment");
		}

		return { contractId, txId };
	} catch (error) {
		console.error("Failed to deploy token contract:", error);
		throw error;
	}
};

export const deployDexContract = async (tokenName: string): Promise<{ contractId: string; txId: string }> => {
	const userData = getUserData();
	if (!userData) throw new Error("No wallet connected");

	try {
		// Get the Clarity code from the contract template
		const clarityCode = getDexContract();
		const contractName = `${tokenName.toLowerCase()}-dex`;

		const response = await request("stx_deployContract", {
			name: contractName,
			clarityCode,
			network: "testnet",
		});

		const contractId = `${userData.profile.stxAddress.testnet}.${contractName}`;
		const txId = response.txid;

		if (!txId) {
			throw new Error("No transaction ID returned from deployment");
		}

		return { contractId, txId };
	} catch (error) {
		console.error("Failed to deploy DEX contract:", error);
		throw error;
	}
};

// Contract interaction functions
export const initializeDex = async (
	dexContract: string,
	tokenContract: string,
	initialTokenAmount: number,
	initialStxAmount: number
): Promise<string> => {
	const userData = getUserData();
	if (!userData) throw new Error("No wallet connected");

	try {
		const response = await request("stx_callContract", {
			contract: dexContract as `${string}.${string}`,
			functionName: "initialize",
			functionArgs: [
				Cl.contractPrincipal(
					tokenContract.split(".")[0],
					tokenContract.split(".")[1]
				),
				Cl.uint(initialTokenAmount),
				Cl.uint(initialStxAmount),
			],
			network: "testnet",
		});

		return response.txid || "";
	} catch (error) {
		console.error("Failed to initialize DEX:", error);
		throw error;
	}
};

export const buyTokens = async (
	dexContract: string,
	tokenContract: string,
	stxAmount: number
): Promise<string> => {
	const userData = getUserData();
	if (!userData) throw new Error("No wallet connected");

	try {
		const response = await request("stx_callContract", {
			contract: dexContract as `${string}.${string}`,
			functionName: "buy",
			functionArgs: [
				Cl.contractPrincipal(
					tokenContract.split(".")[0],
					tokenContract.split(".")[1]
				),
				Cl.uint(stxAmount),
			],
			network: "testnet",
		});

		return response.txid || "";
	} catch (error) {
		console.error("Failed to buy tokens:", error);
		throw error;
	}
};

export const sellTokens = async (
	dexContract: string,
	tokenContract: string,
	tokenAmount: number
): Promise<string> => {
	const userData = getUserData();
	if (!userData) throw new Error("No wallet connected");

	try {
		const response = await request("stx_callContract", {
			contract: dexContract as `${string}.${string}`,
			functionName: "sell",
			functionArgs: [
				Cl.contractPrincipal(
					tokenContract.split(".")[0],
					tokenContract.split(".")[1]
				),
				Cl.uint(tokenAmount),
			],
			network: "testnet",
		});

		return response.txid || "";
	} catch (error) {
		console.error("Failed to sell tokens:", error);
		throw error;
	}
};

// Data fetching functions
export const getBondingCurveData = async (
	dexContract: string
): Promise<BondingCurveData> => {
	try {
		// In a real implementation, you'd call the read-only functions on the contract
		// For this demo, we'll return mock data based on the contract
		console.log("Fetching data for contract:", dexContract);

		const currentStx = 1500000000; // 1500 STX
		const targetStx = CONSTANTS.TARGET_STX;
		const progress = (currentStx / targetStx) * 100;

		return {
			currentStx,
			targetStx,
			currentTokens: 45000000000000, // 45M tokens remaining
			virtualStx: CONSTANTS.VIRTUAL_STX,
			price: calculateCurrentPrice(
				currentStx + CONSTANTS.VIRTUAL_STX,
				45000000000000
			),
			progress,
		};
	} catch (error) {
		console.error("Error fetching bonding curve data:", error);
		throw error;
	}
};

export const calculateBuyPreview = (
	stxAmount: number,
	currentStx: number,
	currentTokens: number
): { tokensOut: number; fee: number; newPrice: number } => {
	const fee = Math.floor((stxAmount * CONSTANTS.FEE_PERCENTAGE) / 100);
	const stxAfterFee = stxAmount - fee;

	const totalStx = currentStx + CONSTANTS.VIRTUAL_STX;
	const k = currentTokens * totalStx;
	const newStxBalance = totalStx + stxAfterFee;
	const newTokenBalance = Math.floor(k / newStxBalance);
	const tokensOut = currentTokens - newTokenBalance;

	const newPrice = calculateCurrentPrice(newStxBalance, newTokenBalance);

	return { tokensOut, fee, newPrice };
};

export const calculateSellPreview = (
	tokenAmount: number,
	currentStx: number,
	currentTokens: number
): { stxOut: number; fee: number; newPrice: number } => {
	const totalStx = currentStx + CONSTANTS.VIRTUAL_STX;
	const k = currentTokens * totalStx;
	const newTokenBalance = currentTokens + tokenAmount;
	const newStxBalance = Math.floor(k / newTokenBalance);
	const stxOut = totalStx - newStxBalance - 1; // -1 for rounding

	const fee = Math.floor((stxOut * CONSTANTS.FEE_PERCENTAGE) / 100);
	const stxReceive = stxOut - fee;

	const newPrice = calculateCurrentPrice(newStxBalance, newTokenBalance);

	return { stxOut: stxReceive, fee, newPrice };
};

export const calculateCurrentPrice = (
	stxBalance: number,
	tokenBalance: number
): number => {
	if (tokenBalance === 0) return 0;
	return stxBalance / tokenBalance;
};

// Utility functions
export const formatStx = (microStx: number): string => {
	return (microStx / 1000000).toFixed(2);
};

export const formatTokens = (microTokens: number): string => {
	return (microTokens / 1000000).toFixed(2);
};

export const parseStx = (stx: string): number => {
	return Math.floor(parseFloat(stx) * 1000000);
};

export const parseTokens = (tokens: string): number => {
	return Math.floor(parseFloat(tokens) * 1000000);
};
