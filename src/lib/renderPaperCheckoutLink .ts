import { PAPER_APP_URL } from '../constants/settings';
import { CheckoutSuccessResult } from '../interfaces/CheckoutSuccessResult';
import { PaperSDKError, PaperSDKErrorCode } from '../interfaces/PaperSDKError';
import { Drawer } from './Drawer';

async function sleepForSeconds(seconds: number) {
  return new Promise((res) => {
    setTimeout(() => {
      res(0);
    }, seconds * 1000);
  });
}
const PaperCheckoutResult: CheckoutSuccessResult = { transactionId: '' };
function getPaperCheckoutResult() {
  return PaperCheckoutResult;
}

export async function renderPaperCheckoutLink({
  checkoutLinkUrl,
}: // type = 'DRAWER',
{
  checkoutLinkUrl: string;
  // type: 'MODAL' | 'DRAWER';
}): Promise<CheckoutSuccessResult> {
  const promiseToReturn = new Promise<CheckoutSuccessResult>(
    async (resolve, rej) => {
      const drawer = new Drawer();

      drawer.setOnCloseCallback(() => {
        const checkoutResult = getPaperCheckoutResult();
        if (!!checkoutResult.transactionId) {
          resolve(checkoutResult);
        } else {
          rej({
            code: PaperSDKErrorCode.UserAbandonedCheckout,
            error: new Error(PaperSDKErrorCode.UserAbandonedCheckout),
          } as PaperSDKError);
        }
      });

      const formattedCheckoutLinkUrl = new URL(checkoutLinkUrl);
      formattedCheckoutLinkUrl.searchParams.set('display', 'DRAWER');
      drawer.open({ iframeUrl: formattedCheckoutLinkUrl.href });

      const messageHandler = async (e: MessageEvent) => {
        if (e.origin !== PAPER_APP_URL) {
          return;
        }
        const result = e.data;
        switch (result.eventType) {
          case 'paymentSuccess': {
            const transactionId = e.data.id;
            PaperCheckoutResult.transactionId = transactionId;
            // TODO: Maybe we can resolve early if the user's want
            break;
          }
          case 'claimSuccessful': {
            const { id: transactionId, claimedTokens } = e.data;
            PaperCheckoutResult.transactionId = transactionId;
            PaperCheckoutResult.claimedTokens = claimedTokens;
            // let the user see the completed NFT for some short time before closing it
            await sleepForSeconds(3.5);
            resolve(result);
            drawer.close();
            break;
          }
          case 'modalClosed': {
            const checkoutResult = getPaperCheckoutResult();
            if (checkoutResult.transactionId) {
              resolve(checkoutResult);
            } else {
              rej({
                code: PaperSDKErrorCode.UserAbandonedCheckout,
                error: new Error(PaperSDKErrorCode.UserAbandonedCheckout),
              } as PaperSDKError);
            }
            break;
          }
          default:
            throw new Error(`Unsupported eventType ${result.eventType}`);
        }
      };
      window.addEventListener('message', messageHandler);
    },
  );
  return promiseToReturn;
}
