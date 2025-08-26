"use client";

import { useState, useEffect } from "react";
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
	initializeDex,
	transferTokens,
	getUserData,
} from "@/lib/stacks";
import { dbManager } from "@/lib/indexeddb";
import { waitForTxConfirmed } from "@/lib/transaction-monitor";
import { DeployedToken, TransactionState, IncompleteDeployment } from "@/types";
import { Loader2, AlertCircle } from "lucide-react";

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
	const [incompleteDeployments, setIncompleteDeployments] = useState<
		IncompleteDeployment[]
	>([]);

	const userData = getUserData();
	const isConnected = !!userData;

	// Load incomplete deployments on mount
	useEffect(() => {
		const loadIncompleteDeployments = async () => {
			if (!isConnected) return;

			try {
				const incomplete =
					await dbManager.getIncompleteDeploymentsByOwner(
						userData!.profile.stxAddress.testnet
					);
				setIncompleteDeployments(incomplete);
			} catch (error) {
				console.error("Failed to load incomplete deployments:", error);
			}
		};

		loadIncompleteDeployments();
	}, [isConnected, userData]);

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

	const continueDeployment = async (
		incompleteDeployment: IncompleteDeployment
	) => {
		setTxState({ loading: true, error: undefined });

		try {
			// Deploy DEX contract
			console.log("🚀 Continuing deployment - deploying DEX contract...");
			setTxState({ loading: true, message: "Deploying DEX contract..." });
			const dexResult = await deployDexContract(
				incompleteDeployment.symbol
			);

			console.log("⏳ Waiting for DEX contract confirmation...");
			setTxState({
				loading: true,
				message: "Waiting for DEX contract confirmation...",
			});
			await waitForTxConfirmed(dexResult.txId);

			// Initialize DEX contract with token and liquidity
			console.log("🔧 Initializing DEX with token and liquidity...");
			setTxState({
				loading: true,
				message: "Initializing DEX with token and liquidity...",
			});
			const initTokenAmount = 90000000000000; // 90M tokens to DEX (90% of supply)
			const initStxAmount = 0; // Start with 0 STX
			const initTxId = await initializeDex(
				dexResult.contractId,
				incompleteDeployment.tokenContract,
				initTokenAmount,
				initStxAmount
			);

			console.log("⏳ Waiting for DEX initialization confirmation...");
			setTxState({
				loading: true,
				message: "Waiting for DEX initialization confirmation...",
			});
			await waitForTxConfirmed(initTxId);

			// Transfer tokens to DEX contract for trading
			console.log("💰 Transferring tokens to DEX contract...");
			setTxState({
				loading: true,
				message: "Transferring tokens to DEX contract...",
			});
			const transferTxId = await transferTokens(
				incompleteDeployment.tokenContract,
				initTokenAmount,
				dexResult.contractId.split(".")[0] // DEX contract address
			);

			console.log("⏳ Waiting for token transfer confirmation...");
			setTxState({
				loading: true,
				message: "Waiting for token transfer confirmation...",
			});
			await waitForTxConfirmed(transferTxId);

			// Create complete token record
			const token: DeployedToken = {
				id: `${userData!.profile.stxAddress.testnet}.${incompleteDeployment.symbol.toLowerCase()}`,
				name: incompleteDeployment.name,
				symbol: incompleteDeployment.symbol,
				description: incompleteDeployment.description,
				tokenContract: incompleteDeployment.tokenContract,
				dexContract: dexResult.contractId,
				deployedBy: userData!.profile.stxAddress.testnet,
				deployedAt: Date.now(),
				targetStx: 3000000000, // 3000 STX in micro-STX
				currentStx: 0,
				currentPrice: 0,
				progress: 0,
			};

			// Save complete token and remove incomplete deployment
			console.log("💾 Saving complete token to database...");
			setTxState({
				loading: true,
				message: "Finalizing deployment...",
			});
			await dbManager.saveToken(token);
			await dbManager.deleteIncompleteDeployment(incompleteDeployment.id);

			// Update local state
			setIncompleteDeployments((prev) =>
				prev.filter(
					(deployment) => deployment.id !== incompleteDeployment.id
				)
			);

			setTxState({
				loading: false,
				success: true,
			});

			// Notify parent component
			onTokenDeployed(token);

			// Reset success state after a delay
			setTimeout(() => {
				setTxState({ loading: false });
			}, 3000);
		} catch (error) {
			console.error("Continue deployment error:", error);
			setTxState({
				loading: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to continue deployment",
			});
		}
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

			// Save incomplete deployment after token is confirmed
			const incompleteDeployment: IncompleteDeployment = {
				id: `${userData!.profile.stxAddress.testnet}.${formData.symbol.toLowerCase()}-incomplete`,
				name: formData.name,
				symbol: formData.symbol,
				description: formData.description,
				tokenContract: tokenResult.contractId,
				tokenTxId: tokenResult.txId,
				deployedBy: userData!.profile.stxAddress.testnet,
				createdAt: Date.now(),
				step: "token-deployed",
			};

			console.log("💾 Saving incomplete deployment...");
			await dbManager.saveIncompleteDeployment(incompleteDeployment);
			setIncompleteDeployments((prev) => [...prev, incompleteDeployment]);

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

			// Initialize DEX contract with token and liquidity
			console.log("🔧 Initializing DEX with token and liquidity...");
			setTxState({
				loading: true,
				message: "Initializing DEX with token and liquidity...",
			});
			const initTokenAmount = 90000000000000; // 90M tokens to DEX (90% of supply)
			const initStxAmount = 0; // Start with 0 STX
			const initTxId = await initializeDex(
				dexResult.contractId,
				tokenResult.contractId,
				initTokenAmount,
				initStxAmount
			);

			console.log("⏳ Waiting for DEX initialization confirmation...");
			setTxState({
				loading: true,
				message: "Waiting for DEX initialization confirmation...",
			});
			await waitForTxConfirmed(initTxId);

			// Transfer tokens to DEX contract for trading
			console.log("💰 Transferring tokens to DEX contract...");
			setTxState({
				loading: true,
				message: "Transferring tokens to DEX contract...",
			});
			const transferTxId = await transferTokens(
				tokenResult.contractId,
				initTokenAmount,
				dexResult.contractId.split(".")[0] // DEX contract address
			);

			console.log("⏳ Waiting for token transfer confirmation...");
			setTxState({
				loading: true,
				message: "Waiting for token transfer confirmation...",
			});
			await waitForTxConfirmed(transferTxId);

			// Create complete token record
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

			// Save complete token and remove incomplete deployment
			console.log("💾 Saving token to database...");
			setTxState({
				loading: true,
				message: "Finalizing deployment...",
			});
			await dbManager.saveToken(token);
			await dbManager.deleteIncompleteDeployment(incompleteDeployment.id);

			// Update local state
			setIncompleteDeployments((prev) =>
				prev.filter(
					(deployment) => deployment.id !== incompleteDeployment.id
				)
			);

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
		<div className="space-y-6">
			{/* Incomplete Deployments Section */}
			{incompleteDeployments.length > 0 && (
				<Card className="w-full max-w-2xl mx-auto border-orange-200 bg-orange-50">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-orange-800">
							<AlertCircle className="h-5 w-5" />
							Resume Incomplete Deployment
						</CardTitle>
						<CardDescription className="text-orange-700">
							You have incomplete token deployments. Continue
							where you left off.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{incompleteDeployments.map((deployment) => (
							<div
								key={deployment.id}
								className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200"
							>
								<div>
									<h4 className="font-medium">
										{deployment.name} ({deployment.symbol})
									</h4>
									<p className="text-sm text-muted-foreground">
										Token contract deployed, DEX contract
										pending
									</p>
								</div>
								<Button
									onClick={() =>
										continueDeployment(deployment)
									}
									disabled={txState.loading}
									size="sm"
									variant="outline"
									className="border-orange-300 text-orange-700 hover:bg-orange-100"
								>
									{txState.loading ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										"Continue"
									)}
								</Button>
							</div>
						))}
					</CardContent>
				</Card>
			)}

			{/* Main Deploy Form */}
			<Card className="w-full max-w-2xl mx-auto">
				<CardHeader>
					<CardTitle>Deploy Your Token</CardTitle>
					<CardDescription>
						Create a new memecoin with an automated bonding curve
						DEX
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
						<Label htmlFor="description">
							Description (Optional)
						</Label>
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
								✅ Token deployed successfully! Check your
								deployed tokens below.
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
		</div>
	);
}
