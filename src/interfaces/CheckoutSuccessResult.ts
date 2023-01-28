import { TransactionStatus } from './TransactionStatus';

export type CheckoutSuccessResult = {
  transactionId: string;
  status?: TransactionStatus;
  claimedTokens?: {
    collectionAddress: string;
    collectionTitle: string;
    tokens: Array<{
      quantity: number;
      tokenId: string;
      transferExplorerUrl: string;
      transferHash: string;
    }>;
  };
};
