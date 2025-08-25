"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { connectWallet, disconnectWallet, getUserData } from "@/lib/stacks";
import { isConnected } from "@stacks/connect";
import { WalletState } from "@/types";

export default function WalletConnect() {
	const [wallet, setWallet] = useState<WalletState>({
		isConnected: false,
	});

	useEffect(() => {
		const checkWalletConnection = () => {
			if (isConnected()) {
				const userData = getUserData();
				if (userData) {
					setWallet({
						isConnected: true,
						address: userData.profile.stxAddress.testnet,
						network: "testnet",
					});
				}
			} else {
				setWallet({ isConnected: false });
			}
		};

		checkWalletConnection();

		// Check periodically for auth changes
		const interval = setInterval(checkWalletConnection, 1000);
		return () => clearInterval(interval);
	}, []);

	const handleConnect = async () => {
		try {
			await connectWallet();
			// Connection state will be updated by the useEffect interval
		} catch (error) {
			console.error("Failed to connect wallet:", error);
		}
	};

	const handleDisconnect = () => {
		disconnectWallet();
		setWallet({ isConnected: false });
	};

	const formatAddress = (address: string) => {
		return `${address.slice(0, 6)}...${address.slice(-4)}`;
	};

	return (
		<div className="flex items-center gap-3">
			{wallet.isConnected ? (
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2">
						<Badge variant="secondary" className="text-xs">
							{wallet.network}
						</Badge>
						<span className="text-sm font-mono">
							{formatAddress(wallet.address!)}
						</span>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={handleDisconnect}
					>
						Disconnect
					</Button>
				</div>
			) : (
				<Button
					onClick={handleConnect}
					className="bg-primary hover:bg-primary/90"
				>
					Connect Wallet
				</Button>
			)}
		</div>
	);
}
