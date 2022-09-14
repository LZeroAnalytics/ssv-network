import * as helpers from '../helpers/contract-helpers';

import { expect } from 'chai';
import { trackGas, GasGroup } from '../helpers/gas-usage';

let ssvNetworkContract: any, clusterResult1: any, clusterResult2: any;

describe('Transfer Validator Tests', () => {
  beforeEach(async () => {
    // Initialize contract
    ssvNetworkContract = (await helpers.initializeContract()).contract;

    // Register operators
    await helpers.registerOperators(0, 12, '10');

    // Deposit into accounts
    await helpers.deposit([4], ['100000']);
    await helpers.deposit([5], ['100000']);

    // Register validators
    clusterResult1 = await helpers.registerValidators(4, 1, '10000', helpers.DataGenerator.cluster.new(), [GasGroup.REGISTER_VALIDATOR_NEW_STATE]);
    clusterResult2 = await helpers.registerValidators(4, 1, '10000', helpers.DataGenerator.cluster.new(), [GasGroup.REGISTER_VALIDATOR_NEW_STATE]);
  });

  it('Transfer validator emits ValidatorTransferred event', async () => {
    await expect(ssvNetworkContract.connect(helpers.DB.owners[4]).transferValidator(
      clusterResult1.validators[0].publicKey,
      helpers.DataGenerator.cluster.new(),
      helpers.DataGenerator.shares(helpers.DB.validators.length),
      '10000'
    )).to.emit(ssvNetworkContract, 'ValidatorTransferred');
  });

  it('Transfer validator into a new cluster', async () => {
    const transferedValidator = await trackGas(ssvNetworkContract.connect(helpers.DB.owners[4]).transferValidator(
      clusterResult1.validators[0].publicKey,
      helpers.DataGenerator.cluster.new(),
      helpers.DataGenerator.shares(helpers.DB.validators.length),
      '10000'
    ), [GasGroup.TRANSFER_VALIDATOR_NEW_CLUSTER]);

    expect(clusterResult1.clusterId).not.equals(transferedValidator.eventsByName.ValidatorTransferred[0].args.clusterId);
  });

  it('Transfer validator to an existing pod', async () => {
    const transfredValidator1 = await trackGas(ssvNetworkContract.connect(helpers.DB.owners[4]).transferValidator(
      clusterResult1.validators[0].publicKey,
      helpers.DataGenerator.cluster.byId(clusterResult2.clusterId),
      helpers.DataGenerator.shares(helpers.DB.validators.length),
      '10000'
    ), [GasGroup.REGISTER_VALIDATOR_EXISTING_CLUSTER]);
    expect(clusterResult2.clusterId).equals(transfredValidator1.eventsByName.ValidatorTransferred[0].args.clusterId);
  });

  it('Transfer validator to an existing cluster', async () => {
    const clusterResult3 = await helpers.registerValidators(5, 1, '10000', helpers.DataGenerator.cluster.new(), [GasGroup.REGISTER_VALIDATOR_NEW_STATE]);
    const transfredValidator1 = await trackGas(ssvNetworkContract.connect(helpers.DB.owners[4]).transferValidator(
      clusterResult1.validators[0].publicKey,
      helpers.DataGenerator.cluster.byId(clusterResult3.clusterId),
      helpers.DataGenerator.shares(helpers.DB.validators.length),
      '10000'
    ), [GasGroup.REGISTER_VALIDATOR_EXISTING_CLUSTER]);
    expect(clusterResult2.clusterId).equals(transfredValidator1.eventsByName.ValidatorTransferred[0].args.clusterId);
  });

  it('Transfer validator with an invalid owner', async () => {
    // Transfer validator with an invalid owner
    await expect(ssvNetworkContract.connect(helpers.DB.owners[5]).transferValidator(
      clusterResult1.validators[0].publicKey,
      helpers.DataGenerator.cluster.byId(clusterResult2.clusterId),
      helpers.DataGenerator.shares(helpers.DB.validators.length),
      '10000'
    )).to.be.revertedWith('ValidatorNotOwned');

    // Transfer validator with an invalid public key
    await expect(ssvNetworkContract.connect(helpers.DB.owners[4]).transferValidator(
      helpers.DataGenerator.shares(0),
      helpers.DataGenerator.cluster.byId(clusterResult2.clusterId),
      helpers.DataGenerator.shares(helpers.DB.validators.length),
      '10000'
    )).to.be.revertedWith('ValidatorNotOwned');
  });

  it('Transfer validator to a cluster with 7 operators', async () => {
    // Register validator with 7 operators
    const { clusterId } = await helpers.registerValidators(4, 1, '10000', [1, 2, 3, 4, 5, 6, 7]);

    // Transfer validator to an existing cluster
    await expect(ssvNetworkContract.connect(helpers.DB.owners[4]).transferValidator(
      clusterResult1.validators[0].publicKey,
      helpers.DataGenerator.cluster.byId(clusterId),
      helpers.DataGenerator.shares(helpers.DB.validators.length),
      '10000'
    )).to.emit(ssvNetworkContract, 'ValidatorTransferred');
  });

  // THIS NEEDS SOME PROPER ERROR MESSAGE
  it('Transfer validator with not enough amount', async () => {
    // Register validator
    const { clusterId } = await helpers.registerValidators(4, 1, '10000', [1, 2, 3, 9]);

    // Increase operator fee
    await ssvNetworkContract.updateOperatorFee(9, '100000')

    // Transfer to cluster with not enough amount
    await expect(ssvNetworkContract.connect(helpers.DB.owners[4]).transferValidator(
      clusterResult1.validators[0].publicKey,
      helpers.DataGenerator.cluster.byId(clusterId),
      helpers.DataGenerator.shares(helpers.DB.validators.length),
      '1'
    )).to.be.revertedWith('account liquidatable');
  });

  // THIS NEEDS SOME PROPER ERROR MESSAGE
  it('Transfer validator with an invalid cluster', async () => {
    await expect(ssvNetworkContract.connect(helpers.DB.owners[4]).transferValidator(
      clusterResult1.validators[0].publicKey,
      clusterResult2.validators[0].publicKey,
      helpers.DataGenerator.shares(helpers.DB.validators.length),
      '10000'
    )).to.be.revertedWith('Invalidcluster');
  });

  // THIS NEEDS SOME PROPER ERROR MESSAGE
  it('Transfer validator with not enough balance', async () => {
    await expect(ssvNetworkContract.connect(helpers.DB.owners[4]).transferValidator(
      clusterResult1.validators[0].publicKey,
      helpers.DataGenerator.cluster.byId(clusterResult2.clusterId),
      helpers.DataGenerator.shares(helpers.DB.validators.length),
      '100001'
    )).to.be.revertedWith('NotEnoughBalance');
  });

  // MAYBE WE WILL ADD SOME VALIDITY HERE?
  // it('Transfer validator with an invalid share', async () => {
  //   await helpers.registerValidators(4, 1, '10000', helpers.DataGenerator.cluster.new());
  //   const { clusterId } = await helpers.registerValidators(4, 1, '10000', helpers.DataGenerator.cluster.new());
  //   await expect(ssvNetworkContract.connect(helpers.DB.owners[4]).transferValidator(
  //     helpers.DataGenerator.publicKey(0),
  //     helpers.DataGenerator.cluster.byId(clusterId),
  //     helpers.DataGenerator.shares(helpers.DB.validators.length),
  //     '10000'
  //   )).to.be.revertedWith('InvalidShares');
  // });
});