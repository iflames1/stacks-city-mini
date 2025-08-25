"use client";

import { useState, useEffect } from "react";
import WalletConnect from "@/components/WalletConnect";
import TokenDeployForm from "@/components/TokenDeployForm";
import TokenCard from "@/components/TokenCard";
import TradingDialog from "@/components/TradingDialog";
import { DeployedToken } from "@/types";
import { dbManager } from "@/lib/indexeddb";
import { getUserData } from "@/lib/stacks";

export default function Home() {
	const [deployedTokens, setDeployedTokens] = useState<DeployedToken[]>([]);
	const [selectedToken, setSelectedToken] = useState<DeployedToken | null>(
		null
	);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	// Load deployed tokens from IndexedDB
	useEffect(() => {
		const loadTokens = async () => {
			try {
				const userData = getUserData();
				if (userData) {
					const tokens = await dbManager.getTokensByOwner(
						userData.profile.stxAddress.testnet
					);
					setDeployedTokens(tokens);
				}
			} catch (error) {
				console.error("Error loading tokens:", error);
			} finally {
				setIsLoading(false);
			}
		};

		loadTokens();
	}, []);

	const handleTokenDeployed = (newToken: DeployedToken) => {
		setDeployedTokens((prev) => [newToken, ...prev]);
	};

	const handleTokenClick = (token: DeployedToken) => {
		setSelectedToken(token);
		setIsDialogOpen(true);
	};

	const handleTradeComplete = (updatedToken: DeployedToken) => {
		setDeployedTokens((prev) =>
			prev.map((token) =>
				token.id === updatedToken.id ? updatedToken : token
			)
		);
	};

	const handleDialogClose = () => {
		setIsDialogOpen(false);
		setSelectedToken(null);
	};

	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<header className="border-b border-border bg-card">
				<div className="container mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-2xl font-bold">
								STX.CITY Mini
							</h1>
							<p className="text-sm text-muted-foreground">
								Deploy and trade memecoins with bonding curves
							</p>
						</div>
						<WalletConnect />
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="container mx-auto px-4 py-8 space-y-12">
				{/* Deploy Section */}
				<section>
					<div className="text-center mb-8">
						<h2 className="text-3xl font-bold mb-4">
							Launch Your Token
						</h2>
						<p className="text-muted-foreground max-w-2xl mx-auto">
							Create your own memecoin with an automated bonding
							curve DEX. No upfront liquidity required - trading
							starts immediately!
						</p>
					</div>
					<TokenDeployForm onTokenDeployed={handleTokenDeployed} />
				</section>

				{/* Deployed Tokens Section */}
				<section>
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-2xl font-bold">
							Your Deployed Tokens
						</h2>
						{deployedTokens.length > 0 && (
							<p className="text-sm text-muted-foreground">
								{deployedTokens.length} token
								{deployedTokens.length !== 1 ? "s" : ""}
							</p>
						)}
					</div>

					{isLoading ? (
						<div className="flex items-center justify-center py-12">
							<div className="text-center space-y-3">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
								<p className="text-muted-foreground">
									Loading your tokens...
								</p>
							</div>
						</div>
					) : deployedTokens.length === 0 ? (
						<div className="text-center py-12">
							<div className="space-y-3">
								<div className="text-4xl">🚀</div>
								<h3 className="text-lg font-semibold">
									No tokens deployed yet
								</h3>
								<p className="text-muted-foreground">
									Deploy your first token above to get started
									trading!
								</p>
							</div>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{deployedTokens.map((token) => (
								<TokenCard
									key={token.id}
									token={token}
									onClick={handleTokenClick}
								/>
							))}
						</div>
					)}
				</section>
			</main>

			{/* Trading Dialog */}
			<TradingDialog
				token={selectedToken}
				isOpen={isDialogOpen}
				onClose={handleDialogClose}
				onTradeComplete={handleTradeComplete}
			/>

			{/* Footer */}
			<footer className="border-t border-border bg-card mt-16">
				<div className="container mx-auto px-4 py-6">
					<div className="text-center text-sm text-muted-foreground">
						<p>
							STX.CITY Mini - A simplified memecoin launchpad on
							Stacks
						</p>
						<p className="mt-1">
							Built for educational purposes • Testnet only
						</p>
					</div>
				</div>
			</footer>
		</div>
	);
}
