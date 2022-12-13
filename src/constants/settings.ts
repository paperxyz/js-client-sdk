export const PAPER_APP_URL =
	// Use `localhost:3000` on dev.
	process?.env?.NEXT_PUBLIC_NODE_ENV === "development" ||
	process?.env?.NODE_ENV === "development"
		? "http://localhost:3000"
		: // Use current window host on staging.
		process?.env?.NEXT_PUBLIC_NODE_ENV === "staging" &&
		  typeof window !== "undefined"
		? window.location.origin
		: // Use "paper.xyz" if currently on that domain (deprecated).
		typeof window !== "undefined" &&
		  window.location.origin === "https://paper.xyz"
		? "https://paper.xyz"
		: // Fall back to the canonical hostname "withpaper.com".
		  "https://withpaper.com";

export const CHECKOUT_WITH_ETH_IFRAME_URL = "/sdk/2022-08-12/checkout-with-eth";
export const CHECKOUT_WITH_CARD_IFRAME_URL =
	"/sdk/2022-08-12/checkout-with-card";
export const CREATE_WALLET_IFRAME_URL = "/sdk/v2/verify-email";

export const DEFAULT_BRAND_OPTIONS = {
	colorPrimary: "#cf3781",
	colorBackground: "#ffffff",
	colorText: "#1a202c",
	borderRadius: 12,
	fontFamily: "Open Sans",
};
