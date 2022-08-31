import {
  CHECKOUT_WITH_CARD_IFRAME_URL,
  DEFAULT_BRAND_OPTIONS,
  PAPER_APP_URL_ALT,
} from "../constants/settings";
import { KycModal, ReviewResult } from "../interfaces/CheckoutWithCard";
import {
  ICustomizationOptions,
  Locale,
} from "../interfaces/CommonCheckoutElementTypes";
import { PaperSDKError, PaperSDKErrorCode } from "../interfaces/PaperSDKError";
import { LinksManager } from "../utils/LinksManager";
import { postMessageToIframe } from "../utils/postMessageToIframe";
import {
  PaperPaymentElement,
  PaperPaymentElementConstructorArgs,
} from "./CreatePaymentElement";

const paperDomain = PAPER_APP_URL_ALT;

export interface CheckoutWithCardLinkArgs {
  sdkClientSecret: string;
  appName?: string;
  options?: ICustomizationOptions;
  locale?: Locale;
}

export function createCheckoutWithCardLink({
  sdkClientSecret,
  appName,
  locale,
  options = { ...DEFAULT_BRAND_OPTIONS },
}: CheckoutWithCardLinkArgs) {
  const CheckoutWithCardUrlBase = new URL(
    CHECKOUT_WITH_CARD_IFRAME_URL,
    paperDomain
  );

  const checkoutWithCardLink = new LinksManager(CheckoutWithCardUrlBase);
  checkoutWithCardLink.addClientSecret(sdkClientSecret);
  checkoutWithCardLink.addStylingOptions(options);
  checkoutWithCardLink.addLocale(locale);
  checkoutWithCardLink.addAppName(appName);
  checkoutWithCardLink.addDate();

  return checkoutWithCardLink.getLink();
}

export interface CheckoutWithCardMessageHandlerArgs {
  iframe: HTMLIFrameElement;
  onPaymentSuccess?: ({ id }: { id: string }) => void;
  onReview?: (result: ReviewResult) => void;
  onError?: (error: PaperSDKError) => void;
  onOpenKycModal: (props: KycModal) => void;
  onCloseKycModal: () => void;
}

export function createCheckoutWithCardMessageHandler({
  iframe,
  onError,
  onOpenKycModal,
  onCloseKycModal,
  onReview,
  onPaymentSuccess,
}: CheckoutWithCardMessageHandlerArgs) {
  return (event: MessageEvent) => {
    if (!event.origin.startsWith(paperDomain)) {
      return;
    }
    const data = event.data;
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
      case "sizing": {
        if (iframe) {
          iframe.style.height = data.height + "px";
          iframe.style.maxHeight = data.height + "px";
        }
        break;
      }
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
    });

  const checkoutWithCardUrl = createCheckoutWithCardLink({
    sdkClientSecret,
    appName,
    locale,
    options,
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
