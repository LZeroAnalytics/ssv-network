// Declare imports
import * as helpers from '../helpers/contract-helpers';
import * as utils from '../helpers/utils';
import { expect } from 'chai';
import { trackGas, GasGroup } from '../helpers/gas-usage';

// Declare globals
let ssvNetworkContract: any, clusterResult1: any, minDepositAmount: any;

describe('Reactivate Tests', () => {
  beforeEach(async () => {
    // Initialize contract
    ssvNetworkContract = (await helpers.initializeContract()).contract;

    // Register operators
    await helpers.registerOperators(0, 12, helpers.CONFIG.minimalOperatorFee);

    minDepositAmount = (helpers.CONFIG.minimalBlocksBeforeLiquidation + 10) * helpers.CONFIG.minimalOperatorFee * 4;

    // Register validators
    clusterResult1 = await helpers.registerValidators(4, 1, minDepositAmount, helpers.DataGenerator.cluster.new(), [GasGroup.REGISTER_VALIDATOR_NEW_STATE]);
  });

  it('Reactivate a disabled pod emits "PodEnabled"', async () => {
    await utils.progressBlocks(helpers.CONFIG.minimalBlocksBeforeLiquidation);
    await ssvNetworkContract.liquidate(helpers.DB.owners[4].address, clusterResult1.clusterId);
    await helpers.DB.ssvToken.connect(helpers.DB.owners[4]).approve(ssvNetworkContract.address, minDepositAmount);
    await expect(ssvNetworkContract.connect(helpers.DB.owners[4]).reactivatePod(clusterResult1.clusterId, minDepositAmount
    )).to.emit(ssvNetworkContract, 'PodEnabled');
  });
  
  it('Reactivate a disabled pod gas limits', async () => {
    await utils.progressBlocks(helpers.CONFIG.minimalBlocksBeforeLiquidation);
    await ssvNetworkContract.liquidate(helpers.DB.owners[4].address, clusterResult1.clusterId);
    await helpers.DB.ssvToken.connect(helpers.DB.owners[4]).approve(ssvNetworkContract.address, minDepositAmount);
    await trackGas(ssvNetworkContract.connect(helpers.DB.owners[4]).reactivatePod(clusterResult1.clusterId, minDepositAmount), [GasGroup.REACTIVATE_POD]);
  });

  it('Reactivate a pod with a removed operator in the cluster', async () => {
    await utils.progressBlocks(helpers.CONFIG.minimalBlocksBeforeLiquidation);
    await ssvNetworkContract.liquidate(helpers.DB.owners[4].address, clusterResult1.clusterId);
    await ssvNetworkContract.removeOperator(1);
    await helpers.DB.ssvToken.connect(helpers.DB.owners[4]).approve(ssvNetworkContract.address, minDepositAmount);
    await trackGas(ssvNetworkContract.connect(helpers.DB.owners[4]).reactivatePod(clusterResult1.clusterId, minDepositAmount), [GasGroup.REACTIVATE_POD]);
  });

  it('Reactivate an enabled pod reverts "PodAlreadyEnabled"', async () => {
    await expect(ssvNetworkContract.connect(helpers.DB.owners[4]).reactivatePod(clusterResult1.clusterId, minDepositAmount
    )).to.be.revertedWith('PodAlreadyEnabled');
  });

  it('Reactivate a pod when the amount is not enough reverts "NegativeBalance"', async () => {
    await utils.progressBlocks(helpers.CONFIG.minimalBlocksBeforeLiquidation);
    await ssvNetworkContract.liquidate(helpers.DB.owners[4].address, clusterResult1.clusterId);
    await helpers.DB.ssvToken.connect(helpers.DB.owners[4]).approve(ssvNetworkContract.address, helpers.CONFIG.minimalOperatorFee * 4);
    await expect(ssvNetworkContract.connect(helpers.DB.owners[4]).reactivatePod(clusterResult1.clusterId, helpers.CONFIG.minimalOperatorFee * 4
    )).to.be.revertedWith('NegativeBalance');
  });
});