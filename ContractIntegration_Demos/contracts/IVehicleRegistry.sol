// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title IVehicleRegistry
/// @notice Read-only interface other contracts (RevocationManager, LicenseRegistry)
///         use to check driver/vehicle identity status without depending on
///         VehicleRegistry's full implementation.
/// @dev Unchanged from the original — already matches VehicleRegistry.sol exactly
///      and every downstream contract already depends on these three signatures.
interface IVehicleRegistry {
    function isVehicleRegistered(string memory _pseudonym) external view returns (bool);
    function getVehicle(string memory _pseudonym) external view returns (address owner, uint256 registrationTime, bool isRegistered);
    function getPseudonymByOwner(address _owner) external view returns (string memory);
}
