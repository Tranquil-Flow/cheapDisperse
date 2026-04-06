import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploy CheapDisperse to the network specified via --network flag.
 * e.g. yarn deploy --network sepolia
 *       yarn deploy --network mainnet
 */
const deployCheapDisperse: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  console.log(`🚀 Deploying CheapDisperse to ${hre.network.name} from ${deployer}`);

  const result = await deploy("CheapDisperse", {
    from: deployer,
    log: true,
    autoMine: true,
  });

  console.log(`✅ CheapDisperse deployed to: ${result.address}`);
};

export default deployCheapDisperse;
deployCheapDisperse.tags = ["CheapDisperse"];
