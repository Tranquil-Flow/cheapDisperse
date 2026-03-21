import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { CheapDisperse, Token } from "../typechain-types";
import { BigNumber } from "ethers";

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
// ETH disperse tests
// ──────────────────────────────────────────────────────────

describe("CheapDisperse — ETH disperse", function () {
  let deployer: SignerWithAddress;
  let signers: SignerWithAddress[];
  let cheapDisperse: CheapDisperse;

  beforeEach(async () => {
    ({ deployer, signers, cheapDisperse } = await deployContracts());
  });

  it("happy path: sends ETH to multiple recipients", async () => {
    const [a, b, c] = signers;
    const recipients = [a.address, b.address, c.address];
    const values = [ether("0.1"), ether("0.2"), ether("0.3")];
    const total = ether("0.6");

    const aBefore = await ethers.provider.getBalance(a.address);
    const bBefore = await ethers.provider.getBalance(b.address);
    const cBefore = await ethers.provider.getBalance(c.address);

    const failed = await cheapDisperse.callStatic.disperseEther(recipients, values, { value: total });
    await cheapDisperse.disperseEther(recipients, values, { value: total });

    expect(failed).to.deep.equal([]);
    expect(await ethers.provider.getBalance(a.address)).to.equal(aBefore.add(values[0]));
    expect(await ethers.provider.getBalance(b.address)).to.equal(bBefore.add(values[1]));
    expect(await ethers.provider.getBalance(c.address)).to.equal(cBefore.add(values[2]));
  });

  it("mismatched array lengths reverts with ArrayLengthMismatch", async () => {
    const [a] = signers;
    await expect(
      cheapDisperse.disperseEther([a.address], [ether("0.1"), ether("0.2")], { value: ether("0.3") }),
    ).to.be.revertedWithCustomError(cheapDisperse, "ArrayLengthMismatch");
  });

  it("zero-value transfers succeed without moving funds", async () => {
    const [a] = signers;
    const aBefore = await ethers.provider.getBalance(a.address);
    await cheapDisperse.disperseEther([a.address], [0], { value: 0 });
    expect(await ethers.provider.getBalance(a.address)).to.equal(aBefore);
  });

  it("single recipient receives full amount", async () => {
    const [a] = signers;
    const aBefore = await ethers.provider.getBalance(a.address);
    await cheapDisperse.disperseEther([a.address], [ether("0.5")], { value: ether("0.5") });
    expect(await ethers.provider.getBalance(a.address)).to.equal(aBefore.add(ether("0.5")));
  });
});

// ──────────────────────────────────────────────────────────
// ERC-20 disperse tests
// ──────────────────────────────────────────────────────────

describe("CheapDisperse — ERC-20 disperse", function () {
  let deployer: SignerWithAddress;
  let signers: SignerWithAddress[];
  let cheapDisperse: CheapDisperse;
  let token: Token;

  beforeEach(async () => {
    ({ deployer, signers, cheapDisperse, token } = await deployContracts());
  });

  it("happy path: transfers tokens to multiple recipients", async () => {
    const [a, b] = signers;
    const amounts = [ethers.utils.parseUnits("100", 18), ethers.utils.parseUnits("200", 18)];
    const total = amounts[0].add(amounts[1]);

    await token.approve(cheapDisperse.address, total);
    await cheapDisperse.disperseToken(token.address, [a.address, b.address], amounts);

    expect(await token.balanceOf(a.address)).to.equal(amounts[0]);
    expect(await token.balanceOf(b.address)).to.equal(amounts[1]);
  });

  it("mismatched array lengths reverts with ArrayLengthMismatch", async () => {
    const [a] = signers;
    await token.approve(cheapDisperse.address, ethers.utils.parseUnits("100", 18));
    await expect(
      cheapDisperse.disperseToken(token.address, [a.address], [100, 200]),
    ).to.be.revertedWithCustomError(cheapDisperse, "ArrayLengthMismatch");
  });

  it("insufficient allowance causes revert (OZ ERC20InsufficientAllowance or TokenTransferFailed)", async () => {
    const [a, b] = signers;
    // approve only 50 but try to send 100+200 — OZ v5 ERC20 returns false for insufficient allowance,
    // which CheapDisperse catches and reverts with TokenTransferFailed, OR OZ v5 throws its own error
    await token.approve(cheapDisperse.address, 50);
    await expect(
      cheapDisperse.disperseToken(token.address, [a.address, b.address], [100, 200]),
    ).to.be.reverted; // OZ v5 uses its own ERC20InsufficientAllowance custom error, caught by contract
  });

  it("zero allowance causes revert", async () => {
    const [a] = signers;
    // No approval at all — OZ ERC20 reverts with ERC20InsufficientAllowance
    await expect(
      cheapDisperse.disperseToken(token.address, [a.address], [1]),
    ).to.be.reverted;
  });

  it("works with non-standard ERC-20 tokens (USDT-style: no return value from transferFrom)", async () => {
    const [a, b] = signers;

    const NonStandardToken = await ethers.getContractFactory("NonStandardToken");
    const nst = await NonStandardToken.deploy();
    await nst.deployed();

    const amount = 1000;
    await nst.approve(cheapDisperse.address, amount * 2);
    await cheapDisperse.disperseToken(nst.address, [a.address, b.address], [amount, amount]);

    expect(await nst.balanceOf(a.address)).to.equal(amount);
    expect(await nst.balanceOf(b.address)).to.equal(amount);
  });

  it("array length over 1000 reverts with ArrayLengthOverMaxLimit (via callStatic)", async () => {
    // Use callStatic to avoid block gas limit issue for huge calldata
    const recipients = Array(1001).fill(signers[0].address);
    const values = Array(1001).fill(1);
    await expect(
      cheapDisperse.callStatic.disperseToken(token.address, recipients, values),
    ).to.be.revertedWithCustomError(cheapDisperse, "ArrayLengthOverMaxLimit");
  });
});

// ──────────────────────────────────────────────────────────
// Failed-transfer tests
// ──────────────────────────────────────────────────────────

describe("CheapDisperse — failed transfer handling", function () {
  let deployer: SignerWithAddress;
  let signers: SignerWithAddress[];
  let cheapDisperse: CheapDisperse;

  beforeEach(async () => {
    ({ deployer, signers, cheapDisperse } = await deployContracts());
  });

  it("returns failed addresses when ETH transfer to a contract with no fallback fails", async () => {
    const [a] = signers;

    // Deploy RejectETH — no receive/fallback, will reject ETH with 2300 gas
    const RejectETH = await ethers.getContractFactory("RejectETH");
    const rejectETH = await RejectETH.deploy();
    await rejectETH.deployed();

    const recipients = [a.address, rejectETH.address, signers[1].address];
    const values = [ether("0.1"), ether("0.01"), ether("0.2")];
    const total = ether("0.31");

    const failed = await cheapDisperse.callStatic.disperseEther(recipients, values, { value: total });

    // The blocking address should be in failed list
    expect(failed).to.include(rejectETH.address);
    // EOA recipients should not be in failed list
    expect(failed).to.not.include(a.address);
    expect(failed.length).to.equal(1);
  });

  it("rest of batch continues after a failed transfer", async () => {
    const [a, b] = signers;
    const blockingAddr = cheapDisperse.address; // no payable fallback

    const aBefore = await ethers.provider.getBalance(a.address);
    const bBefore = await ethers.provider.getBalance(b.address);

    await cheapDisperse.disperseEther(
      [a.address, blockingAddr, b.address],
      [ether("0.1"), ether("0.01"), ether("0.2")],
      { value: ether("0.31") },
    );

    // a and b should have received their ETH despite blockingAddr failure
    expect(await ethers.provider.getBalance(a.address)).to.equal(aBefore.add(ether("0.1")));
    expect(await ethers.provider.getBalance(b.address)).to.equal(bBefore.add(ether("0.2")));
  });

  it("all successful transfers returns empty failed array", async () => {
    const [a, b] = signers;
    const failed = await cheapDisperse.callStatic.disperseEther(
      [a.address, b.address],
      [ether("0.1"), ether("0.2")],
      { value: ether("0.3") },
    );
    expect(failed).to.deep.equal([]);
  });
});

// ──────────────────────────────────────────────────────────
// Gas limit edge case tests
// ──────────────────────────────────────────────────────────

describe("CheapDisperse — gas limit edge cases", function () {
  let deployer: SignerWithAddress;
  let signers: SignerWithAddress[];
  let cheapDisperse: CheapDisperse;

  beforeEach(async () => {
    ({ deployer, signers, cheapDisperse } = await deployContracts());
  });

  const sizes = [10, 50, 100, 500];

  for (const n of sizes) {
    it(`handles ${n} recipients without running out of gas`, async function () {
      // Need enough signers or reuse deployer address multiple times
      const recipients = Array(n).fill(signers[0].address);
      const values = Array(n).fill(ether("0.001"));
      const total = ether("0.001").mul(n);

      const tx = await cheapDisperse.disperseEther(recipients, values, { value: total });
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
      console.log(`  ${n} recipients: ${receipt.gasUsed.toString()} gas`);
    });
  }
});

// ──────────────────────────────────────────────────────────
// Reentrancy test
// ──────────────────────────────────────────────────────────

describe("CheapDisperse — reentrancy protection", function () {
  let deployer: SignerWithAddress;
  let signers: SignerWithAddress[];
  let cheapDisperse: CheapDisperse;

  beforeEach(async () => {
    ({ deployer, signers, cheapDisperse } = await deployContracts());
  });

  it("call with 2300 gas prevents fallback reentrancy exploitation", async () => {
    const [a] = signers;

    // Deploy GreedyReceiver — receive() burns >2300 gas via SSTOREs
    const GreedyReceiver = await ethers.getContractFactory("GreedyReceiver");
    const greedyReceiver = await GreedyReceiver.deploy();
    await greedyReceiver.deployed();

    // The greedy receiver will be in the failed list due to 2300 gas stipend
    const failed = await cheapDisperse.callStatic.disperseEther(
      [a.address, greedyReceiver.address],
      [ether("0.1"), ether("0.01")],
      { value: ether("0.11") },
    );

    expect(failed).to.include(greedyReceiver.address);
    expect(failed).to.not.include(a.address);
    // count stays 0 — receive() was never executed (ran out of gas before any SSTORE)
    expect(await greedyReceiver.count()).to.equal(0);
  });
});

// ──────────────────────────────────────────────────────────
// Gas comparison benchmark: cheapDisperse vs legacyDisperse
// ──────────────────────────────────────────────────────────

describe("Gas comparison benchmark: CheapDisperse vs LegacyDisperse", function () {
  let deployer: SignerWithAddress;
  let signers: SignerWithAddress[];
  let cheapDisperse: CheapDisperse;
  let token: Token;

  beforeEach(async () => {
    ({ deployer, signers, cheapDisperse, token } = await deployContracts());
  });

  const sizes = [10, 50, 100, 500];

  it("ETH disperse gas comparison table", async function () {
    const LegacyDisperse = await ethers.getContractFactory("Disperse");
    const legacyDisperse = await LegacyDisperse.deploy();
    await legacyDisperse.deployed();

    console.log("\n  ┌─────────────┬──────────────────┬──────────────────┬──────────────────┐");
    console.log("  │ Recipients  │ LegacyDisperse   │ CheapDisperse    │ Gas Saved        │");
    console.log("  ├─────────────┼──────────────────┼──────────────────┼──────────────────┤");

    for (const n of sizes) {
      const recipients = Array(n).fill(signers[0].address);
      const values = Array(n).fill(1000);
      const total = 1000 * n;

      const tx1 = await legacyDisperse.disperseEther(recipients, values, { value: total });
      const r1 = await tx1.wait();
      const legacyGas = r1.gasUsed;

      const tx2 = await cheapDisperse.disperseEther(recipients, values, { value: total });
      const r2 = await tx2.wait();
      const cheapGas = r2.gasUsed;

      const saved = legacyGas.sub(cheapGas);
      const pct = saved.mul(100).div(legacyGas).toNumber();
      const sign = saved.gte(0) ? "+" : "";

      console.log(
        `  │ ${String(n).padStart(11)} │ ${legacyGas.toString().padStart(16)} │ ${cheapGas.toString().padStart(16)} │ ${(sign + saved.toString()).padStart(13)} (${sign}${pct}%) │`,
      );
    }

    console.log("  └─────────────┴──────────────────┴──────────────────┴──────────────────┘");
  });
});
