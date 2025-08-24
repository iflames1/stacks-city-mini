
;; @title Bonding Curve DEX for STX.City Mini
;; @version 1.0
;; @summary A decentralized exchange facilitating token trading using bonding curve mechanism
;; @description This DEX allows users to buy and sell tokens through a bonding curve, with automatic liquidity provision

;; Import SIP-010 trait
(use-trait sip-010-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

;; Error constants
(define-constant ERR-UNAUTHORIZED (err u401))
(define-constant ERR-UNAUTHORIZED-TOKEN (err u402))
(define-constant ERR-TRADING-DISABLED (err u1001))
(define-constant DEX-HAS-NOT-ENOUGH-STX (err u1002))
(define-constant ERR-NOT-ENOUGH-STX-BALANCE (err u1003))
(define-constant ERR-NOT-ENOUGH-TOKEN-BALANCE (err u1004))
(define-constant BUY-INFO-ERROR (err u2001))
(define-constant SELL-INFO-ERROR (err u2002))

;; Token and DEX constants
(define-constant token-supply u100000000000000) ;; 100M tokens with 6 decimals
(define-constant BONDING-DEX-ADDRESS (as-contract tx-sender))

;; Bonding curve configuration
(define-constant STX_TARGET_AMOUNT u3000000000) ;; 3000 STX (6 decimals)
(define-constant VIRTUAL_STX_VALUE u600000000)  ;; 600 STX virtual liquidity
(define-constant COMPLETE_FEE u60000000)        ;; 60 STX completion fee

;; Fee wallets (using deployer for simplicity in mini version)
(define-constant PLATFORM_FEE_WALLET tx-sender)
(define-constant DEPLOYER_WALLET tx-sender)

;; Contract state variables
(define-data-var tradable bool false)
(define-data-var virtual-stx-amount uint u0)
(define-data-var token-balance uint u0)
(define-data-var stx-balance uint u0)
(define-data-var associated-token (optional principal) none)
(define-data-var deployer principal tx-sender)

;; Initialize the DEX with a token
(define-public (initialize (token-contract principal) (initial-token-amount uint) (initial-stx-amount uint))
	(begin
		(asserts! (is-eq tx-sender (var-get deployer)) ERR-UNAUTHORIZED)
		(asserts! (is-none (var-get associated-token)) ERR-UNAUTHORIZED)

		;; Set the associated token
		(var-set associated-token (some token-contract))

		;; Set initial values
		(var-set virtual-stx-amount VIRTUAL_STX_VALUE)
		(var-set token-balance initial-token-amount)
		(var-set stx-balance initial-stx-amount)
		(var-set tradable true)

		(ok true)
	)
)

;; Buy tokens with STX
(define-public (buy (token-trait <sip-010-trait>) (stx-amount uint))
	(begin
		(asserts! (var-get tradable) ERR-TRADING-DISABLED)
		(asserts! (> stx-amount u0) ERR-NOT-ENOUGH-STX-BALANCE)
		;; Simplified token check - just ensure we have an associated token
		(asserts! (is-some (var-get associated-token)) ERR-UNAUTHORIZED-TOKEN)

		(let (
			(buy-info (unwrap! (get-buyable-tokens stx-amount) BUY-INFO-ERROR))
			(stx-fee (get fee buy-info))
			(stx-after-fee (get stx-buy buy-info))
			(tokens-out (get buyable-token buy-info))
			(new-token-balance (get new-token-balance buy-info))
			(recipient tx-sender)
			(new-stx-balance (+ (var-get stx-balance) stx-after-fee))
		)
			;; Transfer STX fee to platform and deployer
			(try! (stx-transfer? (/ stx-fee u2) tx-sender PLATFORM_FEE_WALLET))
			(try! (stx-transfer? (/ stx-fee u2) tx-sender DEPLOYER_WALLET))

			;; Transfer remaining STX to DEX
			(try! (stx-transfer? stx-after-fee tx-sender (as-contract tx-sender)))

			;; Transfer tokens to buyer (DEX contract sends tokens to the buyer)
			(try! (as-contract (contract-call? token-trait transfer tokens-out tx-sender recipient none)))

			;; Update state
			(var-set stx-balance new-stx-balance)
			(var-set token-balance new-token-balance)

			;; Check if target reached (simplified - no auto-listing in mini version)
			(if (>= new-stx-balance STX_TARGET_AMOUNT)
			(begin
				(var-set tradable false)
				(print {event: "target-reached", stx-balance: new-stx-balance})
				(ok tokens-out)
			)
			(begin
				(print {event: "buy", tokens-out: tokens-out, stx-fee: stx-fee, new-stx-balance: new-stx-balance})
				(ok tokens-out)
			)
			)
		)
	)
)

;; Sell tokens for STX
(define-public (sell (token-trait <sip-010-trait>) (tokens-in uint))
	(begin
		(asserts! (var-get tradable) ERR-TRADING-DISABLED)
		(asserts! (> tokens-in u0) ERR-NOT-ENOUGH-TOKEN-BALANCE)
		;; Simplified token check - just ensure we have an associated token
		(asserts! (is-some (var-get associated-token)) ERR-UNAUTHORIZED-TOKEN)

		(let (
				(sell-info (unwrap! (get-sellable-stx tokens-in) SELL-INFO-ERROR))
				(stx-fee (get fee sell-info))
				(stx-receive (get stx-receive sell-info))
				(stx-out (get stx-out sell-info))
				(new-token-balance (get new-token-balance sell-info))
				(recipient tx-sender)
			)
			(asserts! (>= (var-get stx-balance) stx-receive) DEX-HAS-NOT-ENOUGH-STX)

		;; Transfer tokens from user to DEX
		(try! (contract-call? token-trait transfer tokens-in tx-sender BONDING-DEX-ADDRESS none))

		;; Transfer STX to user
		(try! (as-contract (stx-transfer? stx-receive tx-sender recipient)))

		;; Transfer fees (only if fee > 0)
		(if (> stx-fee u0)
			(begin
				(try! (as-contract (stx-transfer? (/ stx-fee u2) tx-sender PLATFORM_FEE_WALLET)))
				(try! (as-contract (stx-transfer? (/ stx-fee u2) tx-sender DEPLOYER_WALLET)))
			)
			true
		)			;; Update state
			(var-set stx-balance (- (var-get stx-balance) stx-out))
			(var-set token-balance new-token-balance)

			(print {event: "sell", stx-receive: stx-receive, stx-fee: stx-fee, new-token-balance: new-token-balance})
			(ok stx-receive)
		)
	)
)

;; Calculate buyable tokens for given STX amount
(define-read-only (get-buyable-tokens (stx-amount uint))
	(let
		(
			(current-stx-balance (+ (var-get stx-balance) (var-get virtual-stx-amount)))
			(current-token-balance (var-get token-balance))
			(stx-fee (/ (* stx-amount u2) u100)) ;; 2% fee
			(stx-after-fee (- stx-amount stx-fee))
			(k (* current-token-balance current-stx-balance)) ;; k = x*y
			(new-stx-balance (+ current-stx-balance stx-after-fee))
			(new-token-balance (/ k new-stx-balance)) ;; x' = k / y'
			(tokens-out (- current-token-balance new-token-balance))
			(recommend-stx-amount (- STX_TARGET_AMOUNT (var-get stx-balance)))
			(recommend-stx-amount-after-fee (/ (* recommend-stx-amount u103) u100)) ;; 3% (including 2% fee)
		)
		(ok {
			fee: stx-fee,
			buyable-token: tokens-out,
			stx-buy: stx-after-fee,
			new-token-balance: new-token-balance,
			stx-balance: (var-get stx-balance),
			recommend-stx-amount: recommend-stx-amount-after-fee,
			token-balance: (var-get token-balance)
		}
		)
	)
)

;; Calculate sellable STX for given token amount
(define-read-only (get-sellable-stx (token-amount uint))
	(let
		(
			(tokens-in token-amount)
			(current-stx-balance (+ (var-get stx-balance) (var-get virtual-stx-amount)))
			(current-token-balance (var-get token-balance))
			(k (* current-token-balance current-stx-balance)) ;; k = x*y
			(new-token-balance (+ current-token-balance tokens-in))
			(new-stx-balance (/ k new-token-balance)) ;; y' = k / x'
			(stx-out (- (- current-stx-balance new-stx-balance) u1)) ;; prevent rounding issues
			(stx-fee (/ (* stx-out u2) u100)) ;; 2% fee
			(stx-receive (- stx-out stx-fee))
		)
		(ok {
			fee: stx-fee,
			stx-receive: stx-receive,
			stx-out: stx-out,
			new-token-balance: new-token-balance,
			stx-balance: (var-get stx-balance),
			token-balance: (var-get token-balance)
		}
		)
	)
)

;; Read-only functions
(define-read-only (get-tradable)
	(ok (var-get tradable))
)

(define-read-only (get-token-balance)
	(ok (var-get token-balance))
)

(define-read-only (get-stx-balance)
	(ok (var-get stx-balance))
)

(define-read-only (get-virtual-stx-amount)
	(ok (var-get virtual-stx-amount))
)

(define-read-only (get-associated-token)
	(ok (var-get associated-token))
)

(define-read-only (get-progress)
	(ok {
		current-stx: (var-get stx-balance),
		target-stx: STX_TARGET_AMOUNT,
		progress-percent: (/ (* (var-get stx-balance) u100) STX_TARGET_AMOUNT),
		tradable: (var-get tradable)
	})
)

(define-read-only (get-initialized)
	(ok (is-some (var-get associated-token)))
)
