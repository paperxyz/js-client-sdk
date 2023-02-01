import {
  CHECKOUT_WITH_CARD_IFRAME_URL,
  DEFAULT_BRAND_OPTIONS,
  PAPER_APP_URL,
} from '../constants/settings';
import { KycModal, ReviewResult } from '../interfaces/CheckoutWithCard';
import {
  ICustomizationOptions,
  Locale,
} from '../interfaces/CommonCheckoutElementTypes';
import { PaperSDKError, PaperSDKErrorCode } from '../interfaces/PaperSDKError';
import { openCenteredPopup } from '../utils/device';
import { LinksManager } from '../utils/LinksManager';
import { postMessageToIframe } from '../utils/postMessageToIframe';
import {
  PaperPaymentElement,
  PaperPaymentElementConstructorArgs,
} from './CreatePaymentElement';
import { Modal } from './Modal';

export interface CheckoutWithCardLinkArgs {
  sdkClientSecret: string;
  appName?: string;
  options?: ICustomizationOptions;
  locale?: Locale;

  /**
   * @deprecated: No longer used. Domain is set to "withpaper.com".
   */
  useAltDomain?: boolean;
}

export function createCheckoutWithCardLink({
  sdkClientSecret,
  appName,
  options = { ...DEFAULT_BRAND_OPTIONS },
  locale,
}: CheckoutWithCardLinkArgs) {
  const CheckoutWithCardUrlBase = new URL(
    CHECKOUT_WITH_CARD_IFRAME_URL,
    PAPER_APP_URL,
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
  onOpenKycModal?: (props: KycModal) => void;
  onCloseKycModal?: () => void;
  useAltDomain?: boolean;
}

export function createCheckoutWithCardMessageHandler({
  iframe,
  onError,
  onOpenKycModal,
  onCloseKycModal,
  onReview,
  onPaymentSuccess,
}: CheckoutWithCardMessageHandlerArgs) {
  let modal: Modal;
  const modalBody = {
    backgroundColor: 'transparent',
    borderRadius: '0px',
    maxWidth: 'none',
    height: '100vh',
    maxHeight: 'none',
    padding: '0px',
  };

  return (event: MessageEvent) => {
    if (!event.origin.startsWith(PAPER_APP_URL)) {
      return;
    }

    const { data } = event;
    switch (data.eventType) {
      case 'checkoutWithCardError':
        if (onError) {
          onError({
            code: data.code as PaperSDKErrorCode,
            error: data.error,
          });
        }
        break;

      case 'paymentSuccess':
        if (onPaymentSuccess) {
          onPaymentSuccess({ id: data.id });
        }

        if (data.postToIframe) {
          postMessageToIframe(iframe, data.eventType, data);
        }
        break;

      case 'reviewComplete':
        if (onReview) {
          onReview({
            id: data.id,
            cardholderName: data.cardholderName,
          });
        }
        break;

      case 'openModalWithUrl':
        modal = new Modal(undefined, {
          body: modalBody,
        });

        modal.open({ iframeUrl: data.url });

        if (onOpenKycModal) {
          onOpenKycModal({ iframeLink: data.url });
        }
        break;

      case 'completedSDKModal':
        modal.close();

        if (onCloseKycModal) {
          onCloseKycModal();
        }

        if (data.postToIframe) {
          postMessageToIframe(iframe, data.eventType, data);
        }
        break;

      case 'requestedPopup':
        // The iframe requested a popup.
        // The reference to this window is not stored so the popup cannot
        // be programmatically closed.
        const popupRef = openCenteredPopup({
          url: data.url,
          width: data.width,
          height: data.height,
        });
        if (!popupRef) {
          console.error('CheckoutWithCard: Unable to open popup.');
        }
        break;

      case 'sizing':
        iframe.style.height = data.height + 'px';
        iframe.style.maxHeight = data.height + 'px';
        break;

      default:
      // Ignore unrecognized event
    }
  };
}

export type CheckoutWithCardElementArgs = Omit<
  CheckoutWithCardMessageHandlerArgs,
  'iframe'
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
  const checkoutWithCardId = 'checkout-with-card-iframe';
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
