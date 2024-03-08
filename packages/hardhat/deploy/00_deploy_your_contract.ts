import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import dotenv from "dotenv";

dotenv.config();

const networks = ["goerli", "sepolia"]; // Add your networks here

const deployCheapDisperse: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deploy } = hre.deployments;

  for (const network of networks) {
    console.log(`🚀 Deploying to ${network}`);

    // Dynamically set the network
    await hre.network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: `https://eth-${network}.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
            blockNumber: await ethers.provider.getBlockNumber(),
          },
        },
      ],
    });

    try {
      const { deployer } = await hre.getNamedAccounts();

      await deploy("CheapDisperse", {
        from: deployer,
        log: true,
      });

      console.log(`✅ Deployment on ${network} was successful!`);
    } catch (error: any) {
      console.log(`❌ Deployment on ${network} failed: ${error.message}`);
    }
  }
};

export default deployCheapDisperse;

deployCheapDisperse.tags = ["CheapDisperse"];
