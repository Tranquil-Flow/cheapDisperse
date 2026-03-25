import { ethers } from "hardhat";
import { BigNumber } from "ethers";

describe("Gas usage", function () {
  const gasPrice = BigNumber.from("1000000000"); // Update this to your desired gas price in wei
  const arrayLength = 10; // Update this to your desired array length

  it("Should calculate gas cost for ether disperse", async function () {
    const [, ...recipients] = await ethers.getSigners();
    const recipientsAddresses = recipients.slice(0, arrayLength).map(recipient => recipient.address);
    const values = Array(arrayLength).fill(1);

    const LegacyDisperse = await ethers.getContractFactory("Disperse");
    const legacyDisperse = await LegacyDisperse.deploy();
    await legacyDisperse.deployed();

    const tx1 = await legacyDisperse.disperseEther(recipientsAddresses, values, { value: arrayLength });
    const receipt1 = await tx1.wait();
    const oldGasUsed = receipt1.gasUsed;
    const oldGasCost = oldGasUsed.mul(gasPrice);
    console.log(`Gas used for ether disperse in LegacyDisperse: ${oldGasUsed.toString()}`);
    console.log(
      `Gas cost for ether disperse in LegacyDisperse: ${ethers.utils.formatEther(oldGasCost.toString())} ether`,
    );

    const CheapDisperse = await ethers.getContractFactory("CheapDisperse");
    const cheapDisperse = await CheapDisperse.deploy();
    await cheapDisperse.deployed();

    const tx2 = await cheapDisperse.disperseEther(recipientsAddresses, values, { value: arrayLength });
    const receipt2 = await tx2.wait();
    const newGasUsed = receipt2.gasUsed;
    const newGasCost = newGasUsed.mul(gasPrice);
    console.log(`Gas used for ether disperse in CheapDisperse: ${newGasUsed.toString()}`);
    console.log(
      `Gas cost for ether disperse in CheapDisperse: ${ethers.utils.formatEther(newGasCost.toString())} ether`,
    );

    const gasUsedSaved = oldGasUsed.sub(newGasUsed);
    const gasCostSaved = oldGasCost.sub(newGasCost);
    console.log(`Gas used saved by using CheapDisperse: ${gasUsedSaved.toString()}`);
    console.log(`Gas cost saved by using CheapDisperse: ${ethers.utils.formatEther(gasCostSaved.toString())} ether`);
  });

  it("Should calculate gas cost for token disperse", async function () {
    const [deployer, ...recipients] = await ethers.getSigners();
    const recipientsAddresses = recipients.slice(0, arrayLength).map(recipient => recipient.address);
    const values = Array(arrayLength).fill(100);

    // Assume you have a token contract deployed and the deployer has enough balance.
    const Token = await ethers.getContractFactory("Token");
    const token = await Token.deploy();
    await token.deployed();
    await token.transfer(deployer.address, arrayLength * 100);

    const LegacyDisperse = await ethers.getContractFactory("Disperse");
    const legacyDisperse = await LegacyDisperse.deploy();
    await legacyDisperse.deployed();

    await token.approve(legacyDisperse.address, arrayLength * 100);
    const tx1 = await legacyDisperse.disperseToken(token.address, recipientsAddresses, values);
    const receipt1 = await tx1.wait();
    const oldGasUsed = receipt1.gasUsed;
    const oldGasCost = oldGasUsed.mul(gasPrice);
    console.log(`Gas used for token disperse in LegacyDisperse: ${oldGasUsed.toString()}`);
    console.log(
      `Gas cost for token disperse in LegacyDisperse: ${ethers.utils.formatEther(oldGasCost.toString())} ether`,
    );

    const CheapDisperse = await ethers.getContractFactory("CheapDisperse");
    const cheapDisperse = await CheapDisperse.deploy();
    await cheapDisperse.deployed();

    await token.approve(cheapDisperse.address, arrayLength * 100);
    const tx2 = await cheapDisperse.disperseToken(token.address, recipientsAddresses, values);
    const receipt2 = await tx2.wait();
    const newGasUsed = receipt2.gasUsed;
    const newGasCost = newGasUsed.mul(gasPrice);
    console.log(`Gas used for token disperse in CheapDisperse: ${newGasUsed.toString()}`);
    console.log(
      `Gas cost for token disperse in CheapDisperse: ${ethers.utils.formatEther(newGasCost.toString())} ether`,
    );

    const gasUsedSaved = oldGasUsed.sub(newGasUsed);
    const gasCostSaved = oldGasCost.sub(newGasCost);
    console.log(`Gas used saved by using CheapDisperse: ${gasUsedSaved.toString()}`);
    console.log(`Gas cost saved by using CheapDisperse: ${ethers.utils.formatEther(gasCostSaved.toString())} ether`);
  });
});
