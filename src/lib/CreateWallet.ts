import { CREATE_WALLET_IFRAME_URL, PAPER_APP_URL } from "../constants/settings";
import { Locale } from "../interfaces/CommonCheckoutElementTypes";
import { PaperSDKError, PaperSDKErrorCode } from "../interfaces/PaperSDKError";
import { PaperUser } from "../interfaces/PaperUser";
import { SupportedChainName } from "../interfaces/SupportedChainName";
import { LinksManager } from "../utils/LinksManager";
import { postMessageToIframe } from "../utils/postMessageToIframe";
var packageJson = require("./package.json");

export function createWalletLink({ locale }: { locale?: Locale }) {
	const iframeUrlBase = new URL(CREATE_WALLET_IFRAME_URL, PAPER_APP_URL);
	const iframeUrl = new LinksManager(iframeUrlBase);
	iframeUrl.addLocale(locale);

	return iframeUrl.getLink();
}

function createWalletMessageHandler({
	onSuccess,
	onEmailVerificationInitiated,
	onError,
}: {
	onSuccess: (user: PaperUser) => void;
	onEmailVerificationInitiated?: () => void;
	onError?: (error: PaperSDKError) => void;
}) {
	return (event: MessageEvent) => {
		if (event.origin !== PAPER_APP_URL) return;

		const data = event.data;
		switch (data.eventType) {
			case "verifyEmailEmailVerificationInitiated": {
				if (onEmailVerificationInitiated) {
					onEmailVerificationInitiated();
				}
				break;
			}
			case "verifyEmailError": {
				console.error("Error in Paper SDK VerifyEmail", data.error);
				if (onError) {
					onError({
						code: PaperSDKErrorCode.EmailNotVerified,
						error: data.error,
					});
				}
				break;
			}
			case "verifyEmailSuccess": {
				onSuccess({
					emailAddress: data.emailAddress,
					walletAddress: data.walletAddress,
					accessCode: data.accessCode,
				});
				break;
			}
		}
	};
}

const CREATE_WALLET_IFRAME_ID = "paper-create-wallet-iframe";
export async function initialiseCreateWallet({
	onSuccess,
	locale,
	onEmailVerificationInitiated,
	onError,
}: {
	onSuccess: (user: PaperUser) => void;
	onEmailVerificationInitiated?: () => void;
	onError?: (error: PaperSDKError) => void;
	locale?: Locale;
}) {
	let iframe = document.getElementById(
		CREATE_WALLET_IFRAME_ID
	) as HTMLIFrameElement | null;

	if (!iframe) {
		iframe = document.createElement("iframe");
		iframe.src = createWalletLink({ locale }).href;
		iframe.setAttribute(
			"style",
			"width: 0px; height: 0px; visibility: hidden;"
		);
		iframe.setAttribute("id", CREATE_WALLET_IFRAME_ID);
		iframe.setAttribute(
			"data-paper-sdk-version",
			`@paperxyz/js-client-sdk@${packageJson.version}`
		);
		document.body.appendChild(iframe);

		const messageHandler = createWalletMessageHandler({
			onSuccess,
			onEmailVerificationInitiated,
			onError,
		});
		window.addEventListener("message", messageHandler);
	}
}

export async function createWallet({
	chainName,
	emailAddress,
	clientId,
	redirectUrl,
}: {
	emailAddress: string;
	chainName: SupportedChainName;
	redirectUrl?: string;
	clientId?: string;
}) {
	let iframe = document.getElementById(
		CREATE_WALLET_IFRAME_ID
	) as HTMLIFrameElement | null;

	if (!iframe) {
		throw new Error(
			'Error: You likely forgot to call "initialiseCreateWallet" on your component mount before calling "createWallet"'
		);
	}

	postMessageToIframe(iframe, "verifyEmail", {
		email: emailAddress,
		chainName,
		redirectUrl,
		clientId,
	});
}
