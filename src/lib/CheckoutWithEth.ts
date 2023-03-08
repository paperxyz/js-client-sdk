import { ethers } from 'ethers';
import {
  CHECKOUT_WITH_ETH_IFRAME_URL,
  DEFAULT_BRAND_OPTIONS,
  PAPER_APP_URL,
} from '../constants/settings';
import {
  ICustomizationOptions,
  Locale,
} from '../interfaces/CommonCheckoutElementTypes';
import {
  PaperSDKError,
  PayWithCryptoErrorCode,
} from '../interfaces/PaperSDKError';
import { getSigner } from '../utils/getSigner';
import { handlePayWithCryptoError } from '../utils/handleCheckoutWithEthError';
import { LinksManager } from '../utils/LinksManager';
import { postMessageToIframe } from '../utils/postMessageToIframe';
import {
  PaperPaymentElement,
  PaperPaymentElementConstructorArgs,
} from './CreatePaymentElement';

export const PAY_WITH_ETH_ERROR = 'payWithEthError';

export async function checkAndSendEth({
  data,
  iframe,
  payingWalletSigner,
  suppressErrorToast,
  onError,
  onSuccess,
}: {
  payingWalletSigner: ethers.Signer;
  data: {
    chainId: number;
    chainName: string;
    blob: string;
    paymentAddress: string;
    value: string;
    transactionId: string;
  };
  suppressErrorToast: boolean;
  iframe: HTMLIFrameElement;
  onSuccess?: ({
    transactionResponse,
    transactionId,
  }: {
    transactionResponse: ethers.providers.TransactionResponse;
    transactionId: string;
  }) => void;
  onError?: (error: PaperSDKError) => void;
}) {
  try {
    const chainId = await payingWalletSigner.getChainId();
    if (chainId !== data.chainId) {
      throw {
        isErrorObject: true,
        title: PayWithCryptoErrorCode.WrongChain,
        description: `Please change to ${data.chainName} to proceed.`,
      };
    }
  } catch (e) {
    handlePayWithCryptoError(e as Error, onError, (errorObject) => {
      postMessageToIframe(iframe, PAY_WITH_ETH_ERROR, {
        error: errorObject,
        suppressErrorToast,
      });
    });
    return;
  }

  // send the transaction
  try {
    console.log('sending funds');
    const result = await payingWalletSigner.sendTransaction({
      chainId: data.chainId,
      data: data.blob,
      to: data.paymentAddress,
      value: data.value,
    });
    if (onSuccess && result) {
      onSuccess({
        transactionResponse: result,
        transactionId: data.transactionId,
      });
    }
    if (result) {
      postMessageToIframe(iframe, 'paymentSuccess', {
        suppressErrorToast,
        transactionHash: result.hash,
      });
    }
  } catch (error) {
    console.log('error sending funds', error);
    handlePayWithCryptoError(error as Error, onError, (errorObject) => {
      postMessageToIframe(iframe, PAY_WITH_ETH_ERROR, {
        error: errorObject,
        suppressErrorToast,
      });
    });
  }
}

export interface CheckoutWithEthMessageHandlerArgs {
  iframe: HTMLIFrameElement;
  onSuccess?: ({
    transactionResponse,
    transactionId,
  }: {
    transactionResponse: ethers.providers.TransactionResponse;
    transactionId: string;
  }) => void;
  onError?: (error: PaperSDKError) => void;
  suppressErrorToast?: boolean;
  setUpUserPayingWalletSigner?: (args: {
    chainId: number;
    chainName?: string;
  }) => void | Promise<void>;
  payingWalletSigner: ethers.Signer;
}

export function createCheckoutWithEthMessageHandler({
  iframe,
  onError,
  onSuccess,
  suppressErrorToast = false,
  setUpUserPayingWalletSigner,
  payingWalletSigner,
}: CheckoutWithEthMessageHandlerArgs) {
  return async (event: MessageEvent) => {
    if (!event.origin.startsWith(PAPER_APP_URL)) {
      return;
    }
    const data = event.data;
    switch (data.eventType) {
      case 'payWithEth': {
        if (data.error) {
          handlePayWithCryptoError(
            new Error(data.error) as Error,
            onError,
            (errorObject) => {
              postMessageToIframe(iframe, PAY_WITH_ETH_ERROR, {
                error: errorObject,
                suppressErrorToast,
              });
            },
          );
          return;
        }
        // Allows Dev's to inject any chain switching for their custom signer here.
        if (setUpUserPayingWalletSigner) {
          try {
            console.log('setting up signer');
            await setUpUserPayingWalletSigner({
              chainId: data.chainId,
              chainName: data.chainName,
            });
          } catch (error) {
            console.log('error setting up signer', error);
            handlePayWithCryptoError(error as Error, onError, (errorObject) => {
              postMessageToIframe(iframe, PAY_WITH_ETH_ERROR, {
                error: errorObject,
                suppressErrorToast,
              });
            });
            return;
          }
        }
        await checkAndSendEth({
          data,
          iframe,
          payingWalletSigner,
          suppressErrorToast,
          onError,
          onSuccess,
        });
        break;
      }
      case 'checkout-with-eth-sizing': {
        iframe.style.height = data.height + 'px';
        iframe.style.maxHeight = data.height + 'px';
        break;
      }
      default:
        break;
    }
  };
}

export interface CheckoutWithEthLinkArgs {
  sdkClientSecret: string;
  appName?: string;
  payingWalletSigner: ethers.Signer;
  receivingWalletType?:
    | 'WalletConnect'
    | 'MetaMask'
    | 'Coinbase Wallet'
    | string;
  showConnectWalletOptions?: boolean;

  locale?: Locale;
  options?: ICustomizationOptions;
}

export async function createCheckoutWithEthLink({
  sdkClientSecret,
  payingWalletSigner,
  receivingWalletType,
  showConnectWalletOptions = false,
  appName,
  locale,
  options = {
    ...DEFAULT_BRAND_OPTIONS,
  },
}: CheckoutWithEthLinkArgs) {
  const checkoutWithEthUrlBase = new URL(
    CHECKOUT_WITH_ETH_IFRAME_URL,
    PAPER_APP_URL,
  );
  const address = await payingWalletSigner.getAddress();

  const checkoutWithEthLink = new LinksManager(checkoutWithEthUrlBase);
  checkoutWithEthLink.addClientSecret(sdkClientSecret);
  checkoutWithEthLink.addRecipientWalletAddress(address);
  checkoutWithEthLink.addPayerWalletAddress(address);
  checkoutWithEthLink.addReceivingWalletType(receivingWalletType);
  checkoutWithEthLink.addAppName(appName);
  checkoutWithEthLink.addShowConnectWalletOptions(showConnectWalletOptions);
  checkoutWithEthLink.addStylingOptions(options);
  checkoutWithEthLink.addLocale(locale);

  return checkoutWithEthLink.getLink();
}

export type CheckoutWithEthElementArgs = Omit<
  Omit<CheckoutWithEthMessageHandlerArgs, 'iframe'>,
  'setUpUserPayingWalletSigner'
> &
  CheckoutWithEthLinkArgs &
  PaperPaymentElementConstructorArgs;

export async function createCheckoutWithEthElement({
  sdkClientSecret,
  onSuccess,
  suppressErrorToast,
  onError,
  onLoad,
  payingWalletSigner,
  receivingWalletType,
  appName,
  showConnectWalletOptions,
  locale,
  options,
  elementOrId,
}: CheckoutWithEthElementArgs): Promise<HTMLIFrameElement> {
  const checkoutWithEthId = 'checkout-with-eth-iframe';
  const checkoutWithEthMessageHandler = (iframe: HTMLIFrameElement) =>
    createCheckoutWithEthMessageHandler({
      iframe,
      payingWalletSigner,
      onSuccess,
      onError,
      suppressErrorToast,
    });
  const checkoutWithEthUrl = await createCheckoutWithEthLink({
    payingWalletSigner,
    sdkClientSecret,
    appName,
    locale,
    options,
    receivingWalletType,
    showConnectWalletOptions,
  });
  const paymentElement = new PaperPaymentElement({
    onLoad,
    elementOrId,
  });
  return paymentElement.createPaymentElement({
    handler: checkoutWithEthMessageHandler,
    iframeId: checkoutWithEthId,
    link: checkoutWithEthUrl,
  });
}

export async function renderCheckoutWithEth(
  args:
    | {
        haveExistingWalletConnected: false;
        containerId: string;
        sdkClientSecret: string;
        appName?: string;
      }
    | ({ haveExistingWalletConnected: true } & CheckoutWithEthElementArgs),
) {
  if (args.haveExistingWalletConnected) {
    return createCheckoutWithEthElement(args);
  }
  const container = document.getElementById(args.containerId);
  if (!container) {
    throw new Error('Invalid element ID given');
  }
  const signer = await getSigner({
    container,
    sdkClientSecret: args.sdkClientSecret,
    appName: args.appName,
  });
  console.log('signer', signer);
  if (signer) {
    return createCheckoutWithEthElement({
      payingWalletSigner: signer as ethers.Signer,
      sdkClientSecret: args.sdkClientSecret,
      appName: args.appName,
      elementOrId: args.containerId,
    });
  }
  return;
}
