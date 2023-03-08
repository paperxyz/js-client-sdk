export async function importWagmiLibraries() {
  // Wagmi only supports esm modules which we cannot really use bcause we compile down to cjs too (for now).
  // One of the way aside from cutting out cjs is to use dynamic import as below
  const {
    fetchSigner,
    configureChains,
    connect,
    createClient,
    goerli,
    mainnet,
  } = await import('@wagmi/core');
  const { MetaMaskConnector } = await import('@wagmi/core/connectors/metaMask');
  const { WalletConnectLegacyConnector } = await import(
    '@wagmi/core/connectors/walletConnectLegacy'
  );
  const { CoinbaseWalletConnector } = await import(
    '@wagmi/core/connectors/coinbaseWallet'
  );
  return {
    fetchSigner,
    configureChains,
    connect,
    createClient,
    goerli,
    mainnet,
    MetaMaskConnector,
    WalletConnectLegacyConnector,
    CoinbaseWalletConnector,
  };
}
