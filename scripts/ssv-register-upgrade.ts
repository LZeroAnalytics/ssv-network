import { ethers, upgrades } from 'hardhat';

async function main() {
  const proxyAddress = process.env.PROXY_ADDRESS;
  const ContractUpgraded = await ethers.getContractFactory('SSVRegister');
  console.log('Running upgrade...');
  const newContract = await upgrades.upgradeProxy(proxyAddress, ContractUpgraded);
  console.log(`SSVRegister upgraded at: ${newContract.address}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
