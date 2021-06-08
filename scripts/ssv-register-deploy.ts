import { ethers, upgrades } from 'hardhat';

async function main() {
  const Contract = await ethers.getContractFactory('SSVRegister');
  console.log('Deploying SSVRegister...');
  const contract = await upgrades.deployProxy(Contract);
  await contract.deployed();
  const contractDev = await upgrades.deployProxy(Contract);
  await contractDev.deployed();
  console.log(`SSVRegister deployed to: ${contract.address}, ${contractDev.address}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
