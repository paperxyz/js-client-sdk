export type CheckoutSuccessResult = {
  transactionId: string;
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
