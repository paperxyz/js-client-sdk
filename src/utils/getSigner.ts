import type { ethers } from 'ethers';
import { KJUR } from 'jsrsasign';

function isTestnet(chain: string) {
  switch (chain) {
    case 'Mumbai':
    case 'Goerli':
    case 'SolanaDevnet':
    case 'Rinkeby':
    case 'Ghostnet':
      return true;

    default:
      return false;
  }
}

export async function getSigner({
  container,
  sdkClientSecret,
  appName,
}: {
  container: HTMLElement;
  sdkClientSecret: string;
  appName?: string;
}) {
  try {
    // Wagmi only supports esm modules which we cannot really use bcause we compile down to cjs too (for now).
    // One of the way aside from cutting out cjs is to use dynamic import as below
    const {
      fetchSigner,
      configureChains,
      connect,
      createClient,
      goerli,
      mainnet,
      switchNetwork,
    } = await import('@wagmi/core');
    const { MetaMaskConnector } = await import(
      '@wagmi/core/connectors/metaMask'
    );
    const { WalletConnectLegacyConnector } = await import(
      '@wagmi/core/connectors/walletConnectLegacy'
    );
    const { CoinbaseWalletConnector } = await import(
      '@wagmi/core/connectors/coinbaseWallet'
    );
    const { alchemyProvider } = await import('@wagmi/core/providers/alchemy');

    const alchemyApiKey = 'k5d8RoDGOyxZmVWy2UPNowQlqFoZM3TX';
    const payloadObj = KJUR.jws.JWS.readSafeJSONString(
      Buffer.from(sdkClientSecret.split('.')[1], 'base64').toString('utf-8'),
    );
    if (!payloadObj) {
      throw new Error('Invalid sdkClientSecret given');
    }
    // TODO: Stop hacking LoL
    const chainName = (payloadObj as any).pricingDetails.chainName;
    const isTestnetChain = isTestnet(chainName);
    const chains = isTestnetChain ? [goerli] : [mainnet];
    const { provider, webSocketProvider } = configureChains(
      // wagmi typing needs at least a testnet LoL
      [mainnet, goerli],
      [
        alchemyProvider({
          apiKey: alchemyApiKey,
        }),
      ],
    );
    const metamaskConnector = new MetaMaskConnector({
      chains,
    });
    const walletConnectConnector = new WalletConnectLegacyConnector({
      options: {
        qrcode: true,
      },
    });
    const coinbaseConnector = new CoinbaseWalletConnector({
      options: {
        appName: appName ?? 'Paper',
        jsonRpcUrl: isTestnetChain
          ? `https://eth-goerli.alchemyapi.io/v2/${alchemyApiKey}`
          : `https://eth-mainnet.alchemyapi.io/v2/${alchemyApiKey}`,
      },
    });

    const client = createClient({
      provider,
      webSocketProvider,
      connectors: [
        metamaskConnector,
        walletConnectConnector,
        coinbaseConnector,
      ],
    });
    await client.autoConnect();
    const existingSigner = await fetchSigner();

    const connectWalletPageId = 'paper-connect-wallet-page';
    const existingPage = document.getElementById(connectWalletPageId);

    if (existingPage && existingSigner) {
      try {
        if ((await existingSigner.getChainId()) !== chains[0].id) {
          await switchNetwork({ chainId: chains[0].id });
        }
        existingPage.style.display = 'none';
        return existingSigner;
      } catch (e) {
        console.error(e);
        return;
      }
    } else if (existingPage) {
      return;
    }
    return new Promise<ethers.Signer>(async (res, rej) => {
      const connectWalletPage = document.createElement('div');
      connectWalletPage.id = connectWalletPageId;
      connectWalletPage.style.padding = '2em';
      connectWalletPage.style.display = 'flex';
      connectWalletPage.style.flexDirection = 'column';
      connectWalletPage.style.gap = '0.7em';

      container.appendChild(connectWalletPage);

      for (const connector of client.connectors) {
        const connectWalletButton = document.createElement('button');
        connectWalletButton.className = 'paper-js-sdk-connect-wallet-button';
        connectWalletButton.innerText = connector.name;
        connectWalletButton.onclick = async () => {
          console.log(connector.name, 'clicked');
          try {
            await connect({
              connector: connector,
            });
          } catch (e) {
            console.error(e);
          }
          const signer = await fetchSigner();
          if (signer) {
            if ((await signer.getChainId()) !== chains[0].id) {
              await switchNetwork({ chainId: chains[0].id });
            }
            connectWalletPage.style.display = 'none';
            res(signer);
          }
          rej('Error getting signer');
        };
        connectWalletPage.appendChild(connectWalletButton);
      }
    });
  } catch (err) {
    console.log('error on connect wallet page', err);
    throw err;
  }
}
