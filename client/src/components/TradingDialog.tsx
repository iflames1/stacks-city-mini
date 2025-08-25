"use client";

import { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DeployedToken, TransactionState, BondingCurveData } from "@/types";
import {
	formatStx,
	formatTokens,
	parseStx,
	parseTokens,
	buyTokens,
	sellTokens,
	calculateBuyPreview,
	calculateSellPreview,
	getBondingCurveData,
	getUserData,
} from "@/lib/stacks";
import { waitForTxConfirmed } from "@/lib/transaction-monitor";
import { dbManager } from "@/lib/indexeddb";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";

interface TradePreview {
	tokensOut?: number;
	stxOut?: number;
	fee: number;
	newPrice: number;
}

interface TradingDialogProps {
	token: DeployedToken | null;
	isOpen: boolean;
	onClose: () => void;
	onTradeComplete: (token: DeployedToken) => void;
}

export default function TradingDialog({
	token,
	isOpen,
	onClose,
	onTradeComplete,
}: TradingDialogProps) {
	const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
	const [buyAmount, setBuyAmount] = useState("");
	const [sellAmount, setSellAmount] = useState("");
	const [txState, setTxState] = useState<TransactionState>({
		loading: false,
	});
	const [bondingData, setBondingData] = useState<BondingCurveData | null>(
		null
	);
	const [preview, setPreview] = useState<TradePreview | null>(null);

	const userData = getUserData();
	const isConnected = !!userData;

	// Fetch bonding curve data when dialog opens
	useEffect(() => {
		if (token && isOpen) {
			const fetchData = async () => {
				try {
					const data = await getBondingCurveData(token.dexContract);
					setBondingData(data);
				} catch (error) {
					console.error("Error fetching bonding data:", error);
				}
			};
			fetchData();
		}
	}, [token, isOpen]);

	// Calculate preview when amounts change
	useEffect(() => {
		if (!bondingData) return;

		if (activeTab === "buy" && buyAmount) {
			try {
				const stxAmount = parseStx(buyAmount);
				const result = calculateBuyPreview(
					stxAmount,
					bondingData.currentStx,
					bondingData.currentTokens
				);
				setPreview(result);
			} catch {
				setPreview(null);
			}
		} else if (activeTab === "sell" && sellAmount) {
			try {
				const tokenAmount = parseTokens(sellAmount);
				const result = calculateSellPreview(
					tokenAmount,
					bondingData.currentStx,
					bondingData.currentTokens
				);
				setPreview(result);
			} catch {
				setPreview(null);
			}
		} else {
			setPreview(null);
		}
	}, [activeTab, buyAmount, sellAmount, bondingData]);

	const handleBuy = async () => {
		if (!token || !buyAmount || !isConnected) return;

		setTxState({ loading: true });

		try {
			const stxAmount = parseStx(buyAmount);
			const txId = await buyTokens(
				token.dexContract,
				token.tokenContract,
				stxAmount
			);

			setTxState({ loading: true, txId });
			await waitForTxConfirmed(txId);

			// Update token data in IndexedDB
			const updatedBondingData = await getBondingCurveData(
				token.dexContract
			);
			await dbManager.updateToken(token.id, {
				currentStx: updatedBondingData.currentStx,
				currentPrice: updatedBondingData.price,
				progress: updatedBondingData.progress,
			});

			setTxState({ loading: false, success: true });
			setBuyAmount("");

			// Notify parent of successful trade
			const updatedToken = { ...token, ...updatedBondingData };
			onTradeComplete(updatedToken);

			setTimeout(() => {
				setTxState({ loading: false });
			}, 3000);
		} catch (error) {
			console.error("Buy error:", error);
			setTxState({
				loading: false,
				error:
					error instanceof Error
						? error.message
						: "Buy transaction failed",
			});
		}
	};

	const handleSell = async () => {
		if (!token || !sellAmount || !isConnected) return;

		setTxState({ loading: true });

		try {
			const tokenAmount = parseTokens(sellAmount);
			const txId = await sellTokens(
				token.dexContract,
				token.tokenContract,
				tokenAmount
			);

			setTxState({ loading: true, txId });
			await waitForTxConfirmed(txId);

			// Update token data in IndexedDB
			const updatedBondingData = await getBondingCurveData(
				token.dexContract
			);
			await dbManager.updateToken(token.id, {
				currentStx: updatedBondingData.currentStx,
				currentPrice: updatedBondingData.price,
				progress: updatedBondingData.progress,
			});

			setTxState({ loading: false, success: true });
			setSellAmount("");

			// Notify parent of successful trade
			const updatedToken = { ...token, ...updatedBondingData };
			onTradeComplete(updatedToken);

			setTimeout(() => {
				setTxState({ loading: false });
			}, 3000);
		} catch (error) {
			console.error("Sell error:", error);
			setTxState({
				loading: false,
				error:
					error instanceof Error
						? error.message
						: "Sell transaction failed",
			});
		}
	};

	const resetDialog = () => {
		setBuyAmount("");
		setSellAmount("");
		setTxState({ loading: false });
		setPreview(null);
		setActiveTab("buy");
	};

	const handleClose = () => {
		resetDialog();
		onClose();
	};

	if (!token) return null;

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<span>Trade {token.name}</span>
						<Badge variant="secondary">{token.symbol}</Badge>
					</DialogTitle>
				</DialogHeader>

				{bondingData && (
					<div className="space-y-3 mb-4">
						<div className="flex justify-between text-sm">
							<span>Progress to Target</span>
							<span>{Math.round(bondingData.progress)}%</span>
						</div>
						<Progress
							value={bondingData.progress}
							className="h-2"
						/>
						<div className="flex justify-between text-xs text-muted-foreground">
							<span>
								{formatStx(bondingData.currentStx)} STX raised
							</span>
							<span>
								{formatStx(bondingData.targetStx)} STX target
							</span>
						</div>
					</div>
				)}

				<Tabs
					value={activeTab}
					onValueChange={(v) => setActiveTab(v as "buy" | "sell")}
				>
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger
							value="buy"
							className="flex items-center gap-2"
						>
							<TrendingUp className="h-4 w-4" />
							Buy
						</TabsTrigger>
						<TabsTrigger
							value="sell"
							className="flex items-center gap-2"
						>
							<TrendingDown className="h-4 w-4" />
							Sell
						</TabsTrigger>
					</TabsList>

					<TabsContent value="buy" className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="buy-amount">STX Amount</Label>
							<Input
								id="buy-amount"
								type="number"
								placeholder="0.00"
								value={buyAmount}
								onChange={(e) => setBuyAmount(e.target.value)}
								disabled={txState.loading}
							/>
						</div>

						{preview && (
							<div className="p-3 rounded-md bg-muted/50 space-y-2 text-sm">
								<div className="flex justify-between">
									<span>You&apos;ll receive:</span>
									<span className="font-mono">
										{formatTokens(preview.tokensOut || 0)}{" "}
										{token.symbol}
									</span>
								</div>
								<div className="flex justify-between">
									<span>Trading fee:</span>
									<span className="font-mono">
										{formatStx(preview.fee)} STX
									</span>
								</div>
								<div className="flex justify-between">
									<span>New price:</span>
									<span className="font-mono">
										{(preview.newPrice * 1000000).toFixed(
											6
										)}{" "}
										STX
									</span>
								</div>
							</div>
						)}

						<Button
							onClick={handleBuy}
							disabled={
								!isConnected || !buyAmount || txState.loading
							}
							className="w-full"
						>
							{txState.loading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									{txState.txId
										? "Confirming..."
										: "Buying..."}
								</>
							) : (
								`Buy ${token.symbol}`
							)}
						</Button>
					</TabsContent>

					<TabsContent value="sell" className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="sell-amount">Token Amount</Label>
							<Input
								id="sell-amount"
								type="number"
								placeholder="0.00"
								value={sellAmount}
								onChange={(e) => setSellAmount(e.target.value)}
								disabled={txState.loading}
							/>
						</div>

						{preview && (
							<div className="p-3 rounded-md bg-muted/50 space-y-2 text-sm">
								<div className="flex justify-between">
									<span>You&apos;ll receive:</span>
									<span className="font-mono">
										{formatStx(preview.stxOut || 0)} STX
									</span>
								</div>
								<div className="flex justify-between">
									<span>Trading fee:</span>
									<span className="font-mono">
										{formatStx(preview.fee)} STX
									</span>
								</div>
								<div className="flex justify-between">
									<span>New price:</span>
									<span className="font-mono">
										{(preview.newPrice * 1000000).toFixed(
											6
										)}{" "}
										STX
									</span>
								</div>
							</div>
						)}

						<Button
							onClick={handleSell}
							disabled={
								!isConnected || !sellAmount || txState.loading
							}
							className="w-full"
							variant="outline"
						>
							{txState.loading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									{txState.txId
										? "Confirming..."
										: "Selling..."}
								</>
							) : (
								`Sell ${token.symbol}`
							)}
						</Button>
					</TabsContent>
				</Tabs>

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
							✅ Transaction completed successfully!
						</p>
					</div>
				)}

				{!isConnected && (
					<p className="text-sm text-muted-foreground text-center">
						Connect your wallet to trade
					</p>
				)}
			</DialogContent>
		</Dialog>
	);
}
