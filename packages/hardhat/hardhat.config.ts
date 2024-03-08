import * as dotenv from "dotenv";
dotenv.config();
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
import "@matterlabs/hardhat-zksync-solc";
import "@matterlabs/hardhat-zksync-verify";

// If not set, it uses ours Alchemy's default API key.
// You can get your own at https://dashboard.alchemyapi.io
const providerApiKey = process.env.ALCHEMY_API_KEY || "oKxs-03sij-U_N0iOlrSsZFr29-IqbuF";
// If not set, it uses the hardhat account 0 private key.
const deployerPrivateKey =
  process.env.DEPLOYER_PRIVATE_KEY ?? "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
// If not set, it uses ours Etherscan default API key.
const etherscanApiKey = process.env.ETHERSCAN_API_KEY || "DNXJA8RX2Q3VZ4URQIWP7Z68CJXQZSC6AW";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.23",
    settings: {
      optimizer: {
        enabled: true,
        // https://docs.soliditylang.org/en/latest/using-the-compiler.html#optimizer-options
        runs: 200,
      },
    },
  },
  defaultNetwork: "localhost",
  namedAccounts: {
    deployer: {
      // By default, it will take the first Hardhat account as the deployer
      default: 0,
    },
  },
  networks: {
    // View the networks that are pre-configured.
    // If the network you are looking for is not here you can add new network settings
    hardhat: {
      forking: {
        url: `https://eth-mainnet.alchemyapi.io/v2/${providerApiKey}`,
        enabled: process.env.MAINNET_FORKING_ENABLED === "true",
      },
    },
    mainnet: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${providerApiKey}`,
      accounts: [deployerPrivateKey],
    },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`,
      accounts: [deployerPrivateKey],
    },
    goerli: {
      url: `https://eth-goerli.alchemyapi.io/v2/${providerApiKey}`,
      accounts: [deployerPrivateKey],
    },
    arbitrum: {
      url: `https://arb-mainnet.g.alchemy.com/v2/${providerApiKey}`,
      accounts: [deployerPrivateKey],
    },
    arbitrumGoerli: {
      url: `https://arb-goerli.g.alchemy.com/v2/${providerApiKey}`,
      accounts: [deployerPrivateKey],
    },
    optimism: {
      url: `https://opt-mainnet.g.alchemy.com/v2/${providerApiKey}`,
      accounts: [deployerPrivateKey],
    },
    optimismGoerli: {
      url: `https://opt-goerli.g.alchemy.com/v2/${providerApiKey}`,
      accounts: [deployerPrivateKey],
    },
    polygon: {
      url: `https://polygon-mainnet.g.alchemy.com/v2/${providerApiKey}`,
      accounts: [deployerPrivateKey],
    },
    polygonMumbai: {
      url: `https://polygon-mumbai.g.alchemy.com/v2/${providerApiKey}`,
      accounts: [deployerPrivateKey],
    },
    polygonZkEvm: {
      url: `https://polygonzkevm-mainnet.g.alchemy.com/v2/${providerApiKey}`,
      accounts: [deployerPrivateKey],
    },
    polygonZkEvmTestnet: {
      url: `https://polygonzkevm-testnet.g.alchemy.com/v2/${providerApiKey}`,
      accounts: [deployerPrivateKey],
    },
    zkSyncTestnet: {
      url: "https://testnet.era.zksync.dev",
      zksync: true,
      accounts: [deployerPrivateKey],
      verifyURL: "https://zksync2-testnet-explorer.zksync.dev/contract_verification",
    },
    zkSync: {
      url: "https://mainnet.era.zksync.io",
      zksync: true,
      accounts: [deployerPrivateKey],
      verifyURL: "https://zksync2-mainnet-explorer.zksync.io/contract_verification",
    },
    gnosis: {
      url: "https://rpc.gnosischain.com",
      accounts: [deployerPrivateKey],
    },
    chiado: {
      url: "https://rpc.chiadochain.net",
      accounts: [deployerPrivateKey],
    },
    base: {
      url: "https://mainnet.base.org",
      accounts: [deployerPrivateKey],
    },
    baseGoerli: {
      url: "https://goerli.base.org",
      accounts: [deployerPrivateKey],
    },
    scrollSepolia: {
      url: "https://sepolia-rpc.scroll.io",
      accounts: [deployerPrivateKey],
    },
    scroll: {
      url: "https://rpc.scroll.io",
      accounts: [deployerPrivateKey],
    },
    pgn: {
      url: "https://rpc.publicgoods.network",
      accounts: [deployerPrivateKey],
    },
    pgnTestnet: {
      url: "https://sepolia.publicgoods.network",
      accounts: [deployerPrivateKey],
    },
    linea: {
      url: "https://rpc.linea.build",
      accounts: [deployerPrivateKey],
    },
    mode: {
      url: "https://mainnet.mode.network",
      accounts: [deployerPrivateKey],
    },
    taiko: {
      url: "https://rpc.katla.taiko.xyz",
      accounts: [deployerPrivateKey],
    },
    zkFair: {
      url: "https://rpc.zkfair.io",
      accounts: [deployerPrivateKey],
    },
    kroma: {
      url: "https://api.kroma.network",
      accounts: [deployerPrivateKey],
    },
    fraxtal: {
      url: "https://rpc.frax.com",
      accounts: [deployerPrivateKey],
    },
    orderly: {
      url: "https://rpc.orderly.network",
      accounts: [deployerPrivateKey],
    },
    hypdra: {
      url: "https://rpc.hypra.network",
      accounts: [deployerPrivateKey],
    },
    publicgoods: {
      url: "https://rpc.publicgoods.network",
      accounts: [deployerPrivateKey],
    },
    ancient8: {
      url: "https://rpc.ancient8.gg",
      accounts: [deployerPrivateKey],
    },
    asterzk: {
      url: "https://rpc.startale.com/astar-zkevm",
      accounts: [deployerPrivateKey],
    },
    canto: {
      url: "https://canto.slingshot.finance",
      accounts: [deployerPrivateKey],
    },
    parallel: {
      url: "https://rpc.parallel.fi/",
      accounts: [deployerPrivateKey],
    },
    reddio: {
      url: "https://starknet-madara.reddio.com",
      accounts: [deployerPrivateKey],
    },
    bob: {
      url: "https://testnet.rpc.gobob.xyz/",
      accounts: [deployerPrivateKey],
    },
    eclipse: {
      url: "https://subnets.avax.network/eclipse/testnet/rpc",
      accounts: [deployerPrivateKey],
    },
    frame: {
      url: "https://rpc-frame.syndicate.io",
      accounts: [deployerPrivateKey],
    },
    kinto: {
      url: "https://rpc.kinto.xyz/http",
      accounts: [deployerPrivateKey],
    },
    lisk: {
      url: "https://rpc.sepolia-api.lisk.com",
      accounts: [deployerPrivateKey],
    },
    metal: {
      url: "https://api.metalblockchain.org/ext/bc/C/rpc",
      accounts: [deployerPrivateKey],
    },
    morph: {
      url: "https://rpc-testnet.morphl2.io",
      accounts: [deployerPrivateKey],
    },
    magma: {
      url: "https://unidex-sepolia.rpc.caldera.xyz/http",
      accounts: [deployerPrivateKey],
    },
    palm: {
      url: "https://palm-mainnet.public.blastapi.io",
      accounts: [deployerPrivateKey],
    },
    okx: {
      url: "https://1rpc.io/oktc",
      accounts: [deployerPrivateKey],
    },
    zenta: {
      url: "https://rpc-sepolia.zentachain.io",
      accounts: [deployerPrivateKey],
    },
    ten: {
      url: "https://testnet.ten.xyz/v1",
      accounts: [deployerPrivateKey],
    },
    specular: {
      url: "https://sepolia.specular.network",
      accounts: [deployerPrivateKey],
    },
    orb3: {
      url: "https://rpc.orb3.tech/",
      accounts: [deployerPrivateKey],
    },
    mint: {
      url: "https://testnet-rpc.mintchain.io",
      accounts: [deployerPrivateKey],
    },
    debank: {
      url: "https://rpc.testnet.debank.com",
      accounts: [deployerPrivateKey],
    },
  },
  verify: {
    etherscan: {
      apiKey: `${etherscanApiKey}`,
    },
  },
};

export default config;
