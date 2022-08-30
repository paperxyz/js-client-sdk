import { ethers } from "ethers";
import {
  CHECKOUT_WITH_ETH_IFRAME_URL,
  DEFAULT_BRAND_OPTIONS,
  PAPER_APP_URL,
} from "src/constants/settings";
import { ICustomizationOptions } from "src/interfaces/ICustomizationOptions";
import { Locale } from "src/interfaces/Locale";
import {
  PaperSDKError,
  PayWithCryptoErrorCode,
} from "src/interfaces/PaperSDKError";
import { addStylingOptions } from "src/utils/addStylingOptions";
import { handlePayWithCryptoError } from "src/utils/handleCheckoutWithEthError";
import { postMessageToIframe } from "src/utils/postMessageToIframe";

export interface ICheckoutWithEthMessageHandler {
  iFrame: HTMLIFrameElement;
  onSuccess?: ({
    transactionResponse,
    transactionId,
  }: {
    transactionResponse: ethers.providers.TransactionResponse;
    transactionId: string;
  }) => void;
  onError?: (error: PaperSDKError) => void;
  suppressErrorToast: boolean;
  setUpUserPayingWalletSigner?: (args: {
    chainId: number;
  }) => void | Promise<void>;
  payingWalletSigner: ethers.Signer;
}

export function checkoutWithEthMessageHandler({
  iFrame,
  onError,
  onSuccess,
  suppressErrorToast,
  setUpUserPayingWalletSigner,
  payingWalletSigner,
}: ICheckoutWithEthMessageHandler) {
  return async (event: MessageEvent) => {
    if (!event.origin.startsWith(PAPER_APP_URL)) {
      return;
    }
    const data = event.data;
    switch (data.eventType) {
      case "payWithEth": {
        // Allows Dev's to inject any chain switching for their custom signer here.
        if (setUpUserPayingWalletSigner) {
          try {
            console.log("setting up signer");
            await setUpUserPayingWalletSigner({ chainId: data.chainId });
          } catch (error) {
            console.log("error setting up signer", error);
            handlePayWithCryptoError(error as Error, onError, (errorObject) => {
              postMessageToIframe(iFrame, "payWithEthError", {
                error: errorObject,
                suppressErrorToast,
              });
            });
            return;
          }
        }

        // try switching network first if needed or supported
        const chainId = await payingWalletSigner.getChainId();
        if (chainId !== data.chainId) {
          console.log("error switching network");
          handlePayWithCryptoError(
            {
              isErrorObject: true,
              title: PayWithCryptoErrorCode.WrongChain,
              description: `Please change to ${data.chainName} to proceed.`,
            },
            onError,
            (errorObject) => {
              postMessageToIframe(iFrame, "payWithEthError", {
                error: errorObject,
                suppressErrorToast,
              });
            }
          );
          return;
        }

        // send the transaction
        try {
          console.log("sending funds");
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
            postMessageToIframe(iFrame, "paymentSuccess", {
              suppressErrorToast,
              transactionHash: result.hash,
            });
          }
        } catch (error) {
          console.log("error sending funds", error);
          handlePayWithCryptoError(error as Error, onError, (errorObject) => {
            postMessageToIframe(iFrame, "payWithEthError", {
              error: errorObject,
              suppressErrorToast,
            });
          });
        }
        break;
      }
      case "sizing": {
        iFrame.style.height = data.height + "px";
        iFrame.style.maxHeight = data.height + "px";
        break;
      }
      default:
        break;
    }
  };
}

export interface ICheckoutWithEthLink {
  sdkClientSecret: string;

  payingWalletSigner: ethers.Signer;
  receivingWalletType?:
    | "WalletConnect"
    | "MetaMask"
    | "Coinbase Wallet"
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
  locale,
  options = {
    ...DEFAULT_BRAND_OPTIONS,
  },
}: ICheckoutWithEthLink) {
  const checkoutWithEthUrl = new URL(
    CHECKOUT_WITH_ETH_IFRAME_URL,
    PAPER_APP_URL
  );
  checkoutWithEthUrl.searchParams.append("sdkClientSecret", sdkClientSecret);

  const address = await payingWalletSigner.getAddress();
  checkoutWithEthUrl.searchParams.append("payerWalletAddress", address);
  checkoutWithEthUrl.searchParams.append("recipientWalletAddress", address);

  checkoutWithEthUrl.searchParams.append(
    "showConnectWalletOptions",
    showConnectWalletOptions.toString()
  );
  checkoutWithEthUrl.searchParams.append(
    "walletType",
    receivingWalletType || "Preset"
  );

  checkoutWithEthUrl.searchParams.append(
    "locale",
    locale?.toString() || Locale.EN.toString()
  );
  addStylingOptions(checkoutWithEthUrl, options);

  // Add timestamp to prevent loading a cached page.
  checkoutWithEthUrl.searchParams.append("date", Date.now().toString());

  return checkoutWithEthUrl;
}

export type CreateCheckoutWithEthType = Omit<
  ICheckoutWithEthMessageHandler,
  "iFrame"
> &
  ICheckoutWithEthLink & {
    onLoad?: (event?: Event) => void;
  };

export async function createCheckoutWithEth(
  {
    sdkClientSecret,
    onSuccess,
    suppressErrorToast,
    onError,
    onLoad,
    setUpUserPayingWalletSigner,
    payingWalletSigner,
    receivingWalletType,
    showConnectWalletOptions,
    locale,
    options,
  }: CreateCheckoutWithEthType,
  elementOrId?: string | HTMLElement
): Promise<HTMLIFrameElement> {
  const iFrame = document.createElement("iframe");
  window.addEventListener(
    "message",
    checkoutWithEthMessageHandler({
      iFrame,
      setUpUserPayingWalletSigner,
      payingWalletSigner,
      onSuccess,
      onError,
      suppressErrorToast,
    })
  );
  const checkoutWithEthUrl = await createCheckoutWithEthLink({
    payingWalletSigner,
    sdkClientSecret,
    locale,
    options,
    receivingWalletType,
    showConnectWalletOptions,
  });
  iFrame.src = checkoutWithEthUrl.href;
  iFrame.id = "checkout-with-eth-iframe";
  iFrame.allow = "transparency";
  iFrame.setAttribute(
    "style",
    "margin-left:auto; margin-right:auto; height:350px; width:100%; transition-property:all; transition-timing-function:cubic-bezier(0.4, 0, 0.2, 1); transition-duration:150ms;"
  );
  iFrame.onload = (event: Event) => {
    if (onLoad) {
      onLoad(event);
    }
  };

  if (!elementOrId) {
    return iFrame;
  }
  let container: HTMLElement | string = elementOrId;
  if (typeof container === "string") {
    const domElement = document.getElementById(container);
    if (!domElement) {
      throw new Error("Invalid id given");
    }
    container = domElement;
  }

  return container.appendChild(iFrame);
}
