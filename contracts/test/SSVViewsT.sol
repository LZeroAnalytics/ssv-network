// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.18;

import "../interfaces/ISSVViews.sol";
import "../libraries/Types.sol";
import "../libraries/ClusterLib.sol";
import "../libraries/OperatorLib.sol";
import "../libraries/ProtocolLib.sol";
import "./libraries/CoreLibT.sol";
import {SSVStorageT as SSVStorageUpgrade} from "./libraries/SSVStorageT.sol";

contract SSVViewsT is ISSVViews {
    using Types64 for uint64;

    using ClusterLib for Cluster;
    using OperatorLib for Operator;
    using ProtocolLib for StorageProtocol;

    /*************************************/
    /* Validator External View Functions */
    /*************************************/

    function getValidator(address owner, bytes calldata publicKey) external view override returns (bool active) {
        bytes32 validatorData = SSVStorage.load().validatorPKs[keccak256(abi.encodePacked(publicKey, owner))];

        if (validatorData == bytes32(0)) revert ValidatorDoesNotExist();
        bytes32 activeFlag = validatorData & bytes32(uint256(1)); // Retrieve LSB of stored value

        return activeFlag == bytes32(uint256(1));
    }

    /************************************/
    /* Operator External View Functions */
    /************************************/

    function getOperatorFee(uint64 operatorId) external view override returns (uint256 fee) {
        Operator memory operator = SSVStorageUpgrade.load().operators[operatorId];
        if (operator.snapshot.block == 0) revert OperatorDoesNotExist();

        fee = operator.fee.expand();
    }

    function getOperatorDeclaredFee(
        uint64 operatorId
    ) external view override returns (bool feeDeclared, uint256, uint64, uint64) {
        OperatorFeeChangeRequest memory opFeeChangeRequest = SSVStorage.load().operatorFeeChangeRequests[operatorId];

        return (
            opFeeChangeRequest.approvalBeginTime != 0,
            opFeeChangeRequest.fee.expand(),
            opFeeChangeRequest.approvalBeginTime,
            opFeeChangeRequest.approvalEndTime
        );
    }

    function getOperatorById(uint64 operatorId) external view returns (address, uint256, uint32, address, bool, bool) {
        ISSVNetworkCore.Operator memory operator = SSVStorageUpgrade.load().operators[operatorId];
        address whitelisted = SSVStorageUpgrade.load().operatorsWhitelist[operatorId];
        bool isPrivate = whitelisted == address(0) ? false : true;
        bool isActive = operator.snapshot.block == 0 ? false : true;

        return (operator.owner, operator.fee.expand(), operator.validatorCount, whitelisted, isPrivate, isActive);
    }

    function checkAddressIsWhitelisted(
        uint64 operatorId,
        address whitelistedAddress
    ) external view override returns (bool isWhitelisted, bool isWhitelistingContract) {}

    /***********************************/
    /* Cluster External View Functions */
    /***********************************/

    function isLiquidatable(
        address owner,
        uint64[] calldata operatorIds,
        Cluster memory cluster
    ) external view override returns (bool) {
        cluster.validateHashedCluster(owner, operatorIds, SSVStorage.load());

        if (!cluster.active) {
            return false;
        }

        uint64 clusterIndex;
        uint64 burnRate;
        uint256 operatorsLength = operatorIds.length;
        for (uint256 i; i < operatorsLength; ++i) {
            Operator memory operator = SSVStorage.load().operators[operatorIds[i]];
            clusterIndex += operator.snapshot.index + (uint64(block.number) - operator.snapshot.block) * operator.fee;
            burnRate += operator.fee;
        }

        StorageProtocol storage sp = SSVStorageProtocol.load();

        cluster.updateBalance(clusterIndex, sp.currentNetworkFeeIndex());
        return
            cluster.isLiquidatable(
                burnRate,
                sp.networkFee,
                sp.minimumBlocksBeforeLiquidation,
                sp.minimumLiquidationCollateral
            );
    }

    function isLiquidated(
        address owner,
        uint64[] calldata operatorIds,
        Cluster memory cluster
    ) external view override returns (bool) {
        cluster.validateHashedCluster(owner, operatorIds, SSVStorage.load());
        return !cluster.active;
    }

    function getBurnRate(
        address owner,
        uint64[] calldata operatorIds,
        Cluster memory cluster
    ) external view returns (uint256) {
        cluster.validateHashedCluster(owner, operatorIds, SSVStorage.load());

        uint64 aggregateFee;
        uint256 operatorsLength = operatorIds.length;
        for (uint256 i; i < operatorsLength; ++i) {
            Operator memory operator = SSVStorageUpgrade.load().operators[operatorIds[i]];
            if (operator.owner != address(0)) {
                aggregateFee += operator.fee;
            }
        }

        uint64 burnRate = (aggregateFee + SSVStorageProtocol.load().networkFee) * cluster.validatorCount;
        return burnRate.expand();
    }

    /***********************************/
    /* Balance External View Functions */
    /***********************************/

    function getOperatorEarnings(uint64 id) external view override returns (uint256) {
        Operator memory operator = SSVStorageUpgrade.load().operators[id];

        operator.updateSnapshot();
        return operator.snapshot.balance.expand();
    }

    function getBalance(
        address owner,
        uint64[] calldata operatorIds,
        Cluster memory cluster
    ) external view override returns (uint256) {
        cluster.validateHashedCluster(owner, operatorIds, SSVStorage.load());
        cluster.validateClusterIsNotLiquidated();

        uint64 clusterIndex;
        {
            uint256 operatorsLength = operatorIds.length;
            for (uint256 i; i < operatorsLength; ++i) {
                Operator memory operator = SSVStorage.load().operators[operatorIds[i]];
                clusterIndex +=
                    operator.snapshot.index +
                    (uint64(block.number) - operator.snapshot.block) *
                    operator.fee;
            }
        }

        cluster.updateBalance(clusterIndex, SSVStorageProtocol.load().currentNetworkFeeIndex());

        return cluster.balance;
    }

    /*******************************/
    /* DAO External View Functions */
    /*******************************/

    function getNetworkFee() external view override returns (uint256) {
        return SSVStorageProtocol.load().networkFee.expand();
    }

    function getNetworkEarnings() external view override returns (uint256) {
        return SSVStorageProtocol.load().networkTotalEarnings().expand();
    }

    function getOperatorFeeIncreaseLimit() external view override returns (uint64 operatorMaxFeeIncrease) {
        return SSVStorageProtocol.load().operatorMaxFeeIncrease;
    }

    function getMaximumOperatorFee() external view override returns (uint64 operatorMaxFee) {
        return SSVStorageProtocol.load().operatorMaxFee;
    }

    function getOperatorFeePeriods()
        external
        view
        override
        returns (uint64 declareOperatorFeePeriod, uint64 executeOperatorFeePeriod)
    {
        return (SSVStorageProtocol.load().declareOperatorFeePeriod, SSVStorageProtocol.load().executeOperatorFeePeriod);
    }

    function getLiquidationThresholdPeriod() external view override returns (uint64) {
        return SSVStorageProtocol.load().minimumBlocksBeforeLiquidation;
    }

    function getMinimumLiquidationCollateral() external view override returns (uint256) {
        return SSVStorageProtocol.load().minimumLiquidationCollateral.expand();
    }

    function getValidatorsPerOperatorLimit() external view override returns (uint32) {
        return SSVStorageProtocol.load().validatorsPerOperatorLimit;
    }

    function getVersion() external pure returns (string memory version) {
        return CoreLibT.getVersion();
    }

    function getNetworkValidatorsCount() external view override returns (uint32) {
        return SSVStorageProtocol.load().daoValidatorCount;
    }

    function getMinOperatorsPerCluster() external view returns (uint64) {
        return SSVStorageUpgrade.load().minOperatorsPerCluster;
    }
}
