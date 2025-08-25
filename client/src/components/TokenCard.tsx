"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DeployedToken } from "@/types";
import { formatStx, getBondingCurveData } from "@/lib/stacks";

interface TokenCardProps {
	token: DeployedToken;
	onClick: (token: DeployedToken) => void;
}

export default function TokenCard({ token, onClick }: TokenCardProps) {
	const [isLoading, setIsLoading] = useState(false);
	const [currentData, setCurrentData] = useState({
		currentStx: token.currentStx || 0,
		progress: token.progress || 0,
		price: token.currentPrice || 0,
	});

	useEffect(() => {
		const updateTokenData = async () => {
			try {
				setIsLoading(true);
				const bondingData = await getBondingCurveData(
					token.dexContract
				);
				setCurrentData({
					currentStx: bondingData.currentStx,
					progress: bondingData.progress,
					price: bondingData.price,
				});
			} catch (error) {
				console.error("Error fetching token data:", error);
			} finally {
				setIsLoading(false);
			}
		};

		updateTokenData();
	}, [token.dexContract]);

	const formatDate = (timestamp: number) => {
		return new Date(timestamp).toLocaleDateString();
	};

	return (
		<Card
			className="cursor-pointer hover:shadow-md transition-shadow"
			onClick={() => onClick(token)}
		>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-lg">{token.name}</CardTitle>
					<Badge variant="secondary">{token.symbol}</Badge>
				</div>
				{token.description && (
					<p className="text-sm text-muted-foreground line-clamp-2">
						{token.description}
					</p>
				)}
			</CardHeader>

			<CardContent className="space-y-4">
				<div className="space-y-2">
					<div className="flex justify-between text-sm">
						<span>Progress to Target</span>
						<span>{Math.round(currentData.progress)}%</span>
					</div>
					<Progress value={currentData.progress} className="h-2" />
					<div className="flex justify-between text-xs text-muted-foreground">
						<span>{formatStx(currentData.currentStx)} STX</span>
						<span>{formatStx(token.targetStx)} STX</span>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-4 text-sm">
					<div>
						<p className="text-muted-foreground">Current Price</p>
						<p className="font-mono">
							{isLoading
								? "..."
								: `${(currentData.price * 1000000).toFixed(6)} STX`}
						</p>
					</div>
					<div>
						<p className="text-muted-foreground">Market Cap</p>
						<p className="font-mono">
							{isLoading
								? "..."
								: `${formatStx(currentData.currentStx)} STX`}
						</p>
					</div>
				</div>

				<div className="pt-2 border-t border-border">
					<div className="flex justify-between text-xs text-muted-foreground">
						<span>Deployed: {formatDate(token.deployedAt)}</span>
						<span>Click to trade</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
