import {
	CHECKOUT_WITH_CARD_IFRAME_URL,
	DEFAULT_BRAND_OPTIONS,
	PAPER_APP_URL,
	PAPER_APP_URL_ALT,
} from "../constants/settings";
import { KycModal, ReviewResult } from "../interfaces/CheckoutWithCard";
import {
	ICustomizationOptions,
	Locale,
} from "../interfaces/CommonCheckoutElementTypes";
import { PaperSDKError, PaperSDKErrorCode } from "../interfaces/PaperSDKError";
import { openCenteredPopup } from "../utils/device";
import { LinksManager } from "../utils/LinksManager";
import { postMessageToIframe } from "../utils/postMessageToIframe";
import {
	PaperPaymentElement,
	PaperPaymentElementConstructorArgs,
} from "./CreatePaymentElement";

export interface CheckoutWithCardLinkArgs {
	sdkClientSecret: string;
	appName?: string;
	options?: ICustomizationOptions;
	locale?: Locale;

	/**
	 * If true, loads the SDK domain 'withpaper.com', else loads 'paper.xyz'.
	 * The alt domain is useful because some restricted networks blanket block all *.xyz requests.
	 * Certain features (e.g. Apple Pay) may only work if the domain matches the parent window.
	 *
	 * Defaults to true.
	 */
	useAltDomain?: boolean;
}

export function createCheckoutWithCardLink({
	sdkClientSecret,
	appName,
	options = { ...DEFAULT_BRAND_OPTIONS },
	locale,
	useAltDomain,
}: CheckoutWithCardLinkArgs) {
	const paperDomain = !useAltDomain ? PAPER_APP_URL : PAPER_APP_URL_ALT;

	const CheckoutWithCardUrlBase = new URL(
		CHECKOUT_WITH_CARD_IFRAME_URL,
		paperDomain
	);

	const checkoutWithCardLink = new LinksManager(CheckoutWithCardUrlBase);
	checkoutWithCardLink.addClientSecret(sdkClientSecret);
	checkoutWithCardLink.addStylingOptions(options);
	checkoutWithCardLink.addLocale(locale);
	checkoutWithCardLink.addAppName(appName);

	return checkoutWithCardLink.getLink();
}

export interface CheckoutWithCardMessageHandlerArgs {
	iframe: HTMLIFrameElement;
	onPaymentSuccess?: ({ id }: { id: string }) => void;
	onReview?: (result: ReviewResult) => void;
	onError?: (error: PaperSDKError) => void;
	onOpenKycModal: (props: KycModal) => void;
	onCloseKycModal: () => void;
	useAltDomain?: boolean;
}

export function createCheckoutWithCardMessageHandler({
	iframe,
	onError,
	onOpenKycModal,
	onCloseKycModal,
	onReview,
	onPaymentSuccess,
	useAltDomain,
}: CheckoutWithCardMessageHandlerArgs) {
	const paperDomain = !useAltDomain ? PAPER_APP_URL : PAPER_APP_URL_ALT;

	return (event: MessageEvent) => {
		if (!event.origin.startsWith(paperDomain)) {
			return;
		}

		const { data } = event;
		switch (data.eventType) {
			case "checkoutWithCardError":
				if (onError) {
					onError({
						code: data.code as PaperSDKErrorCode,
						error: data.error,
					});
				}
				break;

			case "paymentSuccess":
				if (onPaymentSuccess) {
					onPaymentSuccess({ id: data.id });
				}

				if (data.postToIframe) {
					postMessageToIframe(iframe, data.eventType, data);
				}
				break;

			case "reviewComplete":
				if (onReview) {
					onReview({
						id: data.id,
						cardholderName: data.cardholderName,
					});
				}
				break;

			case "openModalWithUrl":
				onOpenKycModal({ iframeLink: data.url });
				break;

			case "completedSDKModal":
				onCloseKycModal();

				if (data.postToIframe) {
					postMessageToIframe(iframe, data.eventType, data);
				}
				break;

			case "requestedPopup":
				// The iframe requested a popup.
				// The reference to this window is not stored so the popup cannot
				// be programmatically closed.
				const popupRef = openCenteredPopup({
					url: data.url,
					width: data.width,
					height: data.height,
				});
				if (!popupRef) {
					console.error("CheckoutWithCard: Unable to open popup.");
				}
				break;

			case "sizing":
				iframe.style.height = data.height + "px";
				iframe.style.maxHeight = data.height + "px";
				break;

			default:
			// Ignore unrecognized event
		}
	};
}

export type CheckoutWithCardElementArgs = Omit<
	CheckoutWithCardMessageHandlerArgs,
	"iframe"
> &
	CheckoutWithCardLinkArgs &
	PaperPaymentElementConstructorArgs;

export function createCheckoutWithCardElement({
	onCloseKycModal,
	onOpenKycModal,
	sdkClientSecret,
	appName,
	elementOrId,
	onLoad,
	onError,
	locale,
	options,
	onPaymentSuccess,
	onReview,
	useAltDomain = true,
}: CheckoutWithCardElementArgs) {
	const checkoutWithCardId = "checkout-with-card-iframe";
	const checkoutWithCardMessageHandler = (iframe: HTMLIFrameElement) =>
		createCheckoutWithCardMessageHandler({
			iframe,
			onCloseKycModal,
			onOpenKycModal,
			onError,
			onPaymentSuccess,
			onReview,
			useAltDomain,
		});

	const checkoutWithCardUrl = createCheckoutWithCardLink({
		sdkClientSecret,
		appName,
		locale,
		options,
		useAltDomain,
	});

	const paymentElement = new PaperPaymentElement({
		onLoad,
		elementOrId,
	});
	return paymentElement.createPaymentElement({
		handler: checkoutWithCardMessageHandler,
		iframeId: checkoutWithCardId,
		link: checkoutWithCardUrl,
	});
}
