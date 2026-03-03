// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SimpleTimelock
 * @dev Simple timelock for critical functions
 * Adds a delay before sensitive operations can be executed
 */
contract SimpleTimelock is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    // Delay in seconds (default: 24 hours)
    uint256 public delay = 24 hours;
    
    // Operation ID => Operation data
    mapping(bytes32 => Operation) public operations;
    
    // Target contract => Function selector => requires timelock
    mapping(address => mapping(bytes4 => bool)) public lockedFunctions;

    struct Operation {
        bytes32 id;
        address target;
        bytes data;
        uint256 readyTime;
        bool executed;
        bool cancelled;
    }

    event OperationScheduled(
        bytes32 indexed id,
        address indexed target,
        bytes data,
        uint256 readyTime,
        uint256 timestamp
    );
    
    event OperationExecuted(
        bytes32 indexed id,
        address indexed target,
        bytes data,
        uint256 timestamp
    );
    
    event OperationCancelled(
        bytes32 indexed id,
        address indexed target,
        uint256 timestamp
    );
    
    event FunctionLockUpdated(
        address indexed target,
        bytes4 indexed selector,
        bool locked
    );
    
    event DelayUpdated(uint256 oldDelay, uint256 newDelay);

    constructor(address admin, uint256 _delay) {
        require(admin != address(0), "Invalid admin");
        require(_delay >= 1 hours, "Delay too short");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(EXECUTOR_ROLE, admin);
        
        delay = _delay;
    }

    /**
     * @dev Set delay for timelock operations
     */
    function setDelay(uint256 newDelay) external onlyRole(ADMIN_ROLE) {
        require(newDelay >= 1 hours, "Delay too short");
        uint256 oldDelay = delay;
        delay = newDelay;
        emit DelayUpdated(oldDelay, newDelay);
    }

    /**
     * @dev Lock a function to require timelock
     */
    function lockFunction(address target, bytes4 selector) external onlyRole(ADMIN_ROLE) {
        lockedFunctions[target][selector] = true;
        emit FunctionLockUpdated(target, selector, true);
    }

    /**
     * @dev Unlock a function (remove timelock requirement)
     */
    function unlockFunction(address target, bytes4 selector) external onlyRole(ADMIN_ROLE) {
        lockedFunctions[target][selector] = false;
        emit FunctionLockUpdated(target, selector, false);
    }

    /**
     * @dev Check if a function requires timelock
     */
    function isFunctionLocked(address target, bytes4 selector) external view returns (bool) {
        return lockedFunctions[target][selector];
    }

    /**
     * @dev Schedule an operation
     */
    function scheduleOperation(
        address target,
        bytes calldata data
    ) external onlyRole(ADMIN_ROLE) returns (bytes32) {
        require(target != address(0), "Invalid target");
        require(data.length >= 4, "Invalid data");
        
        bytes32 id = keccak256(abi.encode(target, data, block.timestamp));
        
        require(!operations[id].executed, "Already executed");
        require(!operations[id].cancelled, "Already cancelled");
        
        uint256 readyTime = block.timestamp + delay;
        
        operations[id] = Operation({
            id: id,
            target: target,
            data: data,
            readyTime: readyTime,
            executed: false,
            cancelled: false
        });
        
        emit OperationScheduled(id, target, data, readyTime, block.timestamp);
        
        return id;
    }

    /**
     * @dev Execute a scheduled operation
     */
    function executeOperation(bytes32 id) external onlyRole(EXECUTOR_ROLE) {
        Operation storage op = operations[id];
        
        require(op.target != address(0), "Operation not found");
        require(!op.executed, "Already executed");
        require(!op.cancelled, "Operation cancelled");
        require(block.timestamp >= op.readyTime, "Not ready yet");
        
        op.executed = true;
        
        // Execute the call
        (bool success, ) = op.target.call(op.data);
        require(success, "Execution failed");
        
        emit OperationExecuted(id, op.target, op.data, block.timestamp);
    }

    /**
     * @dev Cancel a scheduled operation
     */
    function cancelOperation(bytes32 id) external onlyRole(ADMIN_ROLE) {
        Operation storage op = operations[id];
        
        require(op.target != address(0), "Operation not found");
        require(!op.executed, "Already executed");
        require(!op.cancelled, "Already cancelled");
        
        op.cancelled = true;
        
        emit OperationCancelled(id, op.target, block.timestamp);
    }

    /**
     * @dev Get operation status
     */
    function getOperation(bytes32 id) external view returns (
        address target,
        bytes memory data,
        uint256 readyTime,
        bool executed,
        bool cancelled,
        bool ready
    ) {
        Operation storage op = operations[id];
        return (
            op.target,
            op.data,
            op.readyTime,
            op.executed,
            op.cancelled,
            block.timestamp >= op.readyTime
        );
    }

    /**
     * @dev Check if an operation is ready to execute
     */
    function isOperationReady(bytes32 id) external view returns (bool) {
        Operation storage op = operations[id];
        return (
            op.target != address(0) &&
            !op.executed &&
            !op.cancelled &&
            block.timestamp >= op.readyTime
        );
    }
}
