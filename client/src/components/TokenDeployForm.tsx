"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	deployTokenContract,
	deployDexContract,
	getUserData,
} from "@/lib/stacks";
import { dbManager } from "@/lib/indexeddb";
import { waitForTxConfirmed } from "@/lib/transaction-monitor";
import { DeployedToken, TransactionState } from "@/types";
import { Loader2 } from "lucide-react";

interface TokenDeployFormProps {
	onTokenDeployed: (token: DeployedToken) => void;
}

export default function TokenDeployForm({
	onTokenDeployed,
}: TokenDeployFormProps) {
	const [formData, setFormData] = useState({
		name: "",
		symbol: "",
		description: "",
	});
	const [txState, setTxState] = useState<TransactionState>({
		loading: false,
	});

	const userData = getUserData();
	const isConnected = !!userData;

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const validateForm = () => {
		if (!formData.name.trim() || !formData.symbol.trim()) {
			setTxState({
				loading: false,
				error: "Token name and symbol are required",
			});
			return false;
		}

		if (formData.symbol.length > 10) {
			setTxState({
				loading: false,
				error: "Symbol must be 10 characters or less",
			});
			return false;
		}

		if (!/^[A-Za-z0-9]+$/.test(formData.symbol)) {
			setTxState({
				loading: false,
				error: "Symbol can only contain letters and numbers",
			});
			return false;
		}

		return true;
	};

	const handleDeploy = async () => {
		if (!isConnected) {
			setTxState({
				loading: false,
				error: "Please connect your wallet first",
			});
			return;
		}

		if (!validateForm()) return;

		setTxState({ loading: true, error: undefined });

		try {
			// Deploy token contract
			console.log("🚀 Deploying token contract...");
			setTxState({
				loading: true,
				message: "Deploying token contract...",
			});
			const tokenResult = await deployTokenContract(
				formData.name,
				formData.symbol
			);

			console.log("⏳ Waiting for token contract confirmation...");
			setTxState({
				loading: true,
				message: "Waiting for token contract confirmation...",
			});
			await waitForTxConfirmed(tokenResult.txId);

			// Deploy DEX contract
			console.log("🚀 Deploying DEX contract...");
			setTxState({ loading: true, message: "Deploying DEX contract..." });
			const dexResult = await deployDexContract(formData.symbol);

			console.log("⏳ Waiting for DEX contract confirmation...");
			setTxState({
				loading: true,
				message: "Waiting for DEX contract confirmation...",
			});
			await waitForTxConfirmed(dexResult.txId);

			// Create token record
			const token: DeployedToken = {
				id: `${userData!.profile.stxAddress.testnet}.${formData.symbol.toLowerCase()}`,
				name: formData.name,
				symbol: formData.symbol,
				description: formData.description,
				tokenContract: tokenResult.contractId,
				dexContract: dexResult.contractId,
				deployedBy: userData!.profile.stxAddress.testnet,
				deployedAt: Date.now(),
				targetStx: 3000000000, // 3000 STX in micro-STX
				currentStx: 0,
				currentPrice: 0,
				progress: 0,
			};

			// Save to IndexedDB
			console.log("💾 Saving token to database...");
			setTxState({
				loading: true,
				message: "Saving token to database...",
			});
			await dbManager.saveToken(token);

			setTxState({
				loading: false,
				success: true,
			});

			// Reset form
			setFormData({
				name: "",
				symbol: "",
				description: "",
			});

			// Notify parent component
			onTokenDeployed(token);

			// Reset success state after a delay
			setTimeout(() => {
				setTxState({ loading: false });
			}, 3000);
		} catch (error) {
			console.error("Deployment error:", error);
			setTxState({
				loading: false,
				error:
					error instanceof Error
						? error.message
						: "Deployment failed",
			});
		}
	};

	return (
		<Card className="w-full max-w-2xl mx-auto">
			<CardHeader>
				<CardTitle>Deploy Your Token</CardTitle>
				<CardDescription>
					Create a new memecoin with an automated bonding curve DEX
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="name">Token Name</Label>
						<Input
							id="name"
							placeholder="My Awesome Token"
							value={formData.name}
							onChange={(e) =>
								handleInputChange("name", e.target.value)
							}
							disabled={txState.loading}
							maxLength={32}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="symbol">Symbol</Label>
						<Input
							id="symbol"
							placeholder="MAT"
							value={formData.symbol}
							onChange={(e) =>
								handleInputChange(
									"symbol",
									e.target.value.toUpperCase()
								)
							}
							disabled={txState.loading}
							maxLength={10}
						/>
					</div>
				</div>

				<div className="space-y-2">
					<Label htmlFor="description">Description (Optional)</Label>
					<Input
						id="description"
						placeholder="A revolutionary memecoin that will change everything..."
						value={formData.description}
						onChange={(e) =>
							handleInputChange("description", e.target.value)
						}
						disabled={txState.loading}
						maxLength={200}
					/>
				</div>

				{txState.error && (
					<div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
						<p className="text-sm text-destructive">
							{txState.error}
						</p>
					</div>
				)}

				{txState.success && (
					<div className="p-3 rounded-md bg-green-50 border border-green-200">
						<p className="text-sm text-green-700">
							✅ Token deployed successfully! Check your deployed
							tokens below.
						</p>
					</div>
				)}

				{txState.loading && txState.message && (
					<div className="p-3 rounded-md bg-blue-50 border border-blue-200">
						<p className="text-sm text-blue-700">
							{txState.message}
						</p>
					</div>
				)}

				<Button
					onClick={handleDeploy}
					disabled={
						!isConnected ||
						txState.loading ||
						!formData.name ||
						!formData.symbol
					}
					className="w-full"
				>
					{txState.loading ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							{txState.message || "Deploying..."}
						</>
					) : (
						"Deploy Token & DEX"
					)}
				</Button>

				{!isConnected && (
					<p className="text-sm text-muted-foreground text-center">
						Connect your wallet to deploy tokens
					</p>
				)}
			</CardContent>
		</Card>
	);
}
