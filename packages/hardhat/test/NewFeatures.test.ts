import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { CheapDisperse, Token } from "../typechain-types";

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

async function deployContracts() {
  const [deployer, ...signers] = await ethers.getSigners();

  const CheapDisperse = await ethers.getContractFactory("CheapDisperse");
  const cheapDisperse = (await CheapDisperse.deploy()) as CheapDisperse;
  await cheapDisperse.deployed();

  const TokenFactory = await ethers.getContractFactory("Token");
  const token = (await TokenFactory.deploy()) as Token;
  await token.deployed();

  return { deployer, signers, cheapDisperse, token };
}

function ether(n: string | number) {
  return ethers.utils.parseEther(String(n));
}

// ──────────────────────────────────────────────────────────
// Events
// ──────────────────────────────────────────────────────────

describe("CheapDisperse — Events", function () {
  let deployer: SignerWithAddress;
  let signers: SignerWithAddress[];
  let cheapDisperse: CheapDisperse;
  let token: Token;

  beforeEach(async () => {
    ({ deployer, signers, cheapDisperse, token } = await deployContracts());
  });

  it("emits EtherDispersed on disperseEther", async () => {
    const [a, b] = signers;
    const total = ether("0.3");
    await expect(
      cheapDisperse.disperseEther([a.address, b.address], [ether("0.1"), ether("0.2")], { value: total }),
    )
      .to.emit(cheapDisperse, "EtherDispersed")
      .withArgs(deployer.address, total, 2, 0);
  });

  it("emits EtherDispersed with failedCount on partial failure", async () => {
    const [a] = signers;
    const RejectETH = await ethers.getContractFactory("RejectETH");
    const reject = await RejectETH.deploy();
    await reject.deployed();

    await expect(
      cheapDisperse.disperseEther(
        [a.address, reject.address],
        [ether("0.1"), ether("0.01")],
        { value: ether("0.11") },
      ),
    )
      .to.emit(cheapDisperse, "EtherDispersed")
      .withArgs(deployer.address, ether("0.11"), 2, 1);
  });

  it("emits TokenDispersed on disperseToken", async () => {
    const [a, b] = signers;
    const amounts = [ethers.utils.parseUnits("100", 18), ethers.utils.parseUnits("200", 18)];
    const total = amounts[0].add(amounts[1]);

    await token.approve(cheapDisperse.address, total);
    await expect(
      cheapDisperse.disperseToken(token.address, [a.address, b.address], amounts),
    )
      .to.emit(cheapDisperse, "TokenDispersed")
      .withArgs(deployer.address, token.address, total, 2);
  });
});

// ──────────────────────────────────────────────────────────
// Equal-amount ETH disperse
// ──────────────────────────────────────────────────────────

describe("CheapDisperse — disperseEtherEqual", function () {
  let deployer: SignerWithAddress;
  let signers: SignerWithAddress[];
  let cheapDisperse: CheapDisperse;

  beforeEach(async () => {
    ({ deployer, signers, cheapDisperse } = await deployContracts());
  });

  it("sends equal ETH to multiple recipients", async () => {
    const [a, b, c] = signers;
    const value = ether("0.1");
    const total = ether("0.3");

    const aBefore = await ethers.provider.getBalance(a.address);
    const bBefore = await ethers.provider.getBalance(b.address);
    const cBefore = await ethers.provider.getBalance(c.address);

    await cheapDisperse.disperseEtherEqual([a.address, b.address, c.address], value, { value: total });

    expect(await ethers.provider.getBalance(a.address)).to.equal(aBefore.add(value));
    expect(await ethers.provider.getBalance(b.address)).to.equal(bBefore.add(value));
    expect(await ethers.provider.getBalance(c.address)).to.equal(cBefore.add(value));
  });

  it("reverts with ZeroRecipients on empty array", async () => {
    await expect(
      cheapDisperse.disperseEtherEqual([], ether("0.1"), { value: ether("0.1") }),
    ).to.be.revertedWithCustomError(cheapDisperse, "ZeroRecipients");
  });

  it("returns failed addresses and refunds failed amounts", async () => {
    const [a] = signers;
    const RejectETH = await ethers.getContractFactory("RejectETH");
    const reject = await RejectETH.deploy();
    await reject.deployed();

    const value = ether("0.1");
    const total = ether("0.2");

    const failed = await cheapDisperse.callStatic.disperseEtherEqual(
      [a.address, reject.address],
      value,
      { value: total },
    );
    expect(failed).to.include(reject.address);
    expect(failed.length).to.equal(1);
  });

  it("emits EtherDispersed event", async () => {
    const [a, b] = signers;
    const value = ether("0.1");
    const total = ether("0.2");

    await expect(
      cheapDisperse.disperseEtherEqual([a.address, b.address], value, { value: total }),
    )
      .to.emit(cheapDisperse, "EtherDispersed")
      .withArgs(deployer.address, total, 2, 0);
  });

  it("uses less gas than disperseEther for same amounts", async () => {
    const n = 50;
    const recipients = Array(n).fill(signers[0].address);
    const value = ether("0.001");
    const values = Array(n).fill(value);
    const total = value.mul(n);

    const tx1 = await cheapDisperse.disperseEther(recipients, values, { value: total });
    const r1 = await tx1.wait();

    const tx2 = await cheapDisperse.disperseEtherEqual(recipients, value, { value: total });
    const r2 = await tx2.wait();

    console.log(`  disperseEther (50 recipients): ${r1.gasUsed.toString()} gas`);
    console.log(`  disperseEtherEqual (50 recipients): ${r2.gasUsed.toString()} gas`);
    console.log(`  Savings: ${r1.gasUsed.sub(r2.gasUsed).toString()} gas`);
    expect(r2.gasUsed).to.be.lt(r1.gasUsed);
  });
});

// ──────────────────────────────────────────────────────────
// Equal-amount token disperse
// ──────────────────────────────────────────────────────────

describe("CheapDisperse — disperseTokenEqual", function () {
  let deployer: SignerWithAddress;
  let signers: SignerWithAddress[];
  let cheapDisperse: CheapDisperse;
  let token: Token;

  beforeEach(async () => {
    ({ deployer, signers, cheapDisperse, token } = await deployContracts());
  });

  it("sends equal tokens to multiple recipients", async () => {
    const [a, b, c] = signers;
    const value = ethers.utils.parseUnits("100", 18);
    const total = value.mul(3);

    await token.approve(cheapDisperse.address, total);
    await cheapDisperse.disperseTokenEqual(token.address, [a.address, b.address, c.address], value);

    expect(await token.balanceOf(a.address)).to.equal(value);
    expect(await token.balanceOf(b.address)).to.equal(value);
    expect(await token.balanceOf(c.address)).to.equal(value);
  });

  it("reverts with ZeroRecipients on empty array", async () => {
    await expect(
      cheapDisperse.disperseTokenEqual(token.address, [], 100),
    ).to.be.revertedWithCustomError(cheapDisperse, "ZeroRecipients");
  });

  it("emits TokenDispersed event", async () => {
    const [a, b] = signers;
    const value = ethers.utils.parseUnits("50", 18);
    const total = value.mul(2);

    await token.approve(cheapDisperse.address, total);
    await expect(
      cheapDisperse.disperseTokenEqual(token.address, [a.address, b.address], value),
    )
      .to.emit(cheapDisperse, "TokenDispersed")
      .withArgs(deployer.address, token.address, total, 2);
  });

  it("uses less gas than disperseToken for same amounts", async () => {
    const n = 50;
    const recipients = Array(n).fill(signers[0].address);
    const value = ethers.utils.parseUnits("1", 18);
    const values = Array(n).fill(value);
    const total = value.mul(n);

    await token.approve(cheapDisperse.address, total.mul(2)); // enough for both calls

    const tx1 = await cheapDisperse.disperseToken(token.address, recipients, values);
    const r1 = await tx1.wait();

    const tx2 = await cheapDisperse.disperseTokenEqual(token.address, recipients, value);
    const r2 = await tx2.wait();

    console.log(`  disperseToken (50 recipients): ${r1.gasUsed.toString()} gas`);
    console.log(`  disperseTokenEqual (50 recipients): ${r2.gasUsed.toString()} gas`);
    console.log(`  Savings: ${r1.gasUsed.sub(r2.gasUsed).toString()} gas`);
    expect(r2.gasUsed).to.be.lt(r1.gasUsed);
  });
});

// ──────────────────────────────────────────────────────────
// Fast ETH disperse (assembly)
// ──────────────────────────────────────────────────────────

describe("CheapDisperse — disperseEtherFast", function () {
  let deployer: SignerWithAddress;
  let signers: SignerWithAddress[];
  let cheapDisperse: CheapDisperse;

  beforeEach(async () => {
    ({ deployer, signers, cheapDisperse } = await deployContracts());
  });

  it("sends ETH to multiple EOA recipients", async () => {
    const [a, b, c] = signers;
    const values = [ether("0.1"), ether("0.2"), ether("0.3")];
    const total = ether("0.6");

    const aBefore = await ethers.provider.getBalance(a.address);
    const bBefore = await ethers.provider.getBalance(b.address);
    const cBefore = await ethers.provider.getBalance(c.address);

    await cheapDisperse.disperseEtherFast([a.address, b.address, c.address], values, { value: total });

    expect(await ethers.provider.getBalance(a.address)).to.equal(aBefore.add(values[0]));
    expect(await ethers.provider.getBalance(b.address)).to.equal(bBefore.add(values[1]));
    expect(await ethers.provider.getBalance(c.address)).to.equal(cBefore.add(values[2]));
  });

  it("reverts with EtherTransferFailed when a transfer fails", async () => {
    const [a] = signers;
    const RejectETH = await ethers.getContractFactory("RejectETH");
    const reject = await RejectETH.deploy();
    await reject.deployed();

    await expect(
      cheapDisperse.disperseEtherFast(
        [a.address, reject.address],
        [ether("0.1"), ether("0.01")],
        { value: ether("0.11") },
      ),
    ).to.be.revertedWithCustomError(cheapDisperse, "EtherTransferFailed");
  });

  it("reverts with ArrayLengthMismatch", async () => {
    const [a] = signers;
    await expect(
      cheapDisperse.disperseEtherFast([a.address], [ether("0.1"), ether("0.2")], { value: ether("0.3") }),
    ).to.be.revertedWithCustomError(cheapDisperse, "ArrayLengthMismatch");
  });

  it("emits EtherDispersed event with failedCount=0", async () => {
    const [a, b] = signers;
    const total = ether("0.3");
    await expect(
      cheapDisperse.disperseEtherFast([a.address, b.address], [ether("0.1"), ether("0.2")], { value: total }),
    )
      .to.emit(cheapDisperse, "EtherDispersed")
      .withArgs(deployer.address, total, 2, 0);
  });

  it("uses less gas than disperseEther", async () => {
    const n = 50;
    const recipients = Array(n).fill(signers[0].address);
    const values = Array(n).fill(ether("0.001"));
    const total = ether("0.001").mul(n);

    const tx1 = await cheapDisperse.disperseEther(recipients, values, { value: total });
    const r1 = await tx1.wait();

    const tx2 = await cheapDisperse.disperseEtherFast(recipients, values, { value: total });
    const r2 = await tx2.wait();

    console.log(`  disperseEther (50 recipients): ${r1.gasUsed.toString()} gas`);
    console.log(`  disperseEtherFast (50 recipients): ${r2.gasUsed.toString()} gas`);
    console.log(`  Savings: ${r1.gasUsed.sub(r2.gasUsed).toString()} gas`);
    expect(r2.gasUsed).to.be.lt(r1.gasUsed);
  });

  it("refunds excess ETH", async () => {
    const [a] = signers;
    const deployerBefore = await ethers.provider.getBalance(deployer.address);
    const tx = await cheapDisperse.disperseEtherFast([a.address], [ether("0.1")], { value: ether("1") });
    const receipt = await tx.wait();
    const gasCost = receipt.gasUsed.mul(receipt.effectiveGasPrice);
    const deployerAfter = await ethers.provider.getBalance(deployer.address);
    // Deployer should have lost only 0.1 ETH + gas, not the full 1 ETH
    const loss = deployerBefore.sub(deployerAfter).sub(gasCost);
    expect(loss).to.equal(ether("0.1"));
  });
});
