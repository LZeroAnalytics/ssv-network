import { ethers, upgrades } from 'hardhat';

async function main() {
  const config = {
    operatorMaxFeeIncrease: 1000,
    declareOperatorFeePeriod: 3600, // HOUR
    executeOperatorFeePeriod: 86400, // DAY
  };

  // Define accounts
  const ssvNetwork = await ethers.getContractFactory('SSVNetwork');
  const deployArguments = [
    process.env.SSVTOKEN_ADDRESS,
    config.operatorMaxFeeIncrease,
    config.declareOperatorFeePeriod,
    config.executeOperatorFeePeriod
  ];
  console.log('Deploy arguments: ', deployArguments);
  const contract = await upgrades.deployProxy(ssvNetwork, deployArguments);

  await contract.deployed();
  console.log(`SSVNetwork deployed to: ${contract.address}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });