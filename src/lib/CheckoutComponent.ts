import { PAPER_APP_URL } from '../constants/settings';
import { CheckoutSuccessType } from '../interfaces/CheckoutSuccessType';
import { PaperSDKError, PaperSDKErrorCode } from '../interfaces/PaperSDKError';
import { Drawer } from './Drawer';

async function sleepForSeconds(seconds: number) {
  return new Promise((res) => {
    setTimeout(() => {
      res(0);
    }, seconds * 1000);
  });
}
const PaperCheckoutResult: CheckoutSuccessType = { transactionId: '' };
function getPaperCheckoutResult() {
  return PaperCheckoutResult;
}

export async function renderPaperCheckoutLink({
  checkoutLinkUrl,
}: // type = 'DRAWER',
{
  checkoutLinkUrl: string;
  // type: 'MODAL' | 'DRAWER';
}): Promise<CheckoutSuccessType> {
  const promiseToReturn = new Promise<CheckoutSuccessType>(
    async (resolve, rej) => {
      const drawer = new Drawer();

      drawer.setOnCloseCallback(() => {
        const checkoutResult = getPaperCheckoutResult();
        if (!!checkoutResult.transactionId) {
          resolve(checkoutResult);
        } else {
          rej({
            code: PaperSDKErrorCode.UserCancelledOperation,
            error: new Error(PaperSDKErrorCode.UserCancelledOperation),
          } as PaperSDKError);
        }
      });

      const formattedCheckoutLinkUrl = new URL(checkoutLinkUrl);
      // formattedCheckoutLinkUrl.searchParams.set('display', type);
      drawer.open({ iframeUrl: formattedCheckoutLinkUrl.href });

      const messageHandler = async (e: MessageEvent) => {
        if (e.origin !== PAPER_APP_URL) {
          return;
        }
        const result = e.data;
        switch (result.eventType) {
          case 'paymentSuccess': {
            const transactionId = e.data.id;
            result.transactionId = transactionId;
            // TODO: Maybe we can resolve early is user's want
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
                code: PaperSDKErrorCode.UserCancelledOperation,
                error: new Error(PaperSDKErrorCode.UserCancelledOperation),
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
