const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('cheapDisperse', () => {
  let deployer, user1, user2;
  let cheapDisperse;

  beforeEach(async () => {
    [deployer, user1, user2] = await ethers.getSigners();
    const CheapDisperse = await ethers.getContractFactory('cheapDisperse');
    cheapDisperse = await CheapDisperse.deploy();
    await cheapDisperse.deployed();
  });

  it('happy path', async () => {
    const recipients = [user1.address, user2.address];
    const amounts = [ethers.utils.parseEther('0.1'), ethers.utils.parseEther('0.2')];
    await cheapDisperse.disperseETH(recipients, amounts);
    expect(await ethers.provider.getBalance(user1.address)).to.equal(ethers.utils.parseEther('0.1'));
    expect(await ethers.provider.getBalance(user2.address)).to.equal(ethers.utils.parseEther('0.2'));
  });

  it('mismatched array lengths', async () => {
    const recipients = [user1.address];
    const amounts = [ethers.utils.parseEther('0.1'), ethers.utils.parseEther('0.2')];
    await expect(cheapDisperse.disperseETH(recipients, amounts)).to.be.revertedWith('Array lengths mismatch');
  });

  it('zero-value transfers', async () => {
    const recipients = [user1.address];
    const amounts = [ethers.utils.parseEther('0')];
    await cheapDisperse.disperseETH(recipients, amounts);
    expect(await ethers.provider.getBalance(user1.address)).to.equal(ethers.utils.parseEther('0'));
  });

  it('single recipient', async () => {
    const recipients = [user1.address];
    const amounts = [ethers.utils.parseEther('0.5')];
    await cheapDisperse.disperseETH(recipients, amounts);
    expect(await ethers.provider.getBalance(user1.address)).to.equal(ethers.utils.parseEther('0.5'));
  });
});