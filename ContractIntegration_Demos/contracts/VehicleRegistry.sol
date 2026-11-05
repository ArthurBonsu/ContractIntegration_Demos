// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./IRevocationManager.sol";

/// @title VehicleRegistry
/// @notice On-chain identity registry at the core of the driver registration and
///         license-revocation system. A "vehicle" record here is really a driver's
///         registered pseudonymous identity: the pseudonym is the public-facing
///         handle, the owning wallet is the real driver, and every downstream
///         contract (RevocationManager, LicenseRegistry) treats this registry as the
///         single source of truth for "does this identity exist".
/// @dev All existing function names, event names, and return-value names are kept
///      exactly as they were so RevocationManager.sol, LicenseRegistry.sol, and the
///      existing frontend (utils/contracts.ts, utils/receipts.ts, components/*)
///      continue to work without any changes on their side.
contract VehicleRegistry is Ownable, Pausable {

    struct Vehicle {
        string pseudonym;
        address owner;
        uint256 registrationTime;
        bool isRegistered;
    }

    mapping(string => Vehicle) public vehicles;
    mapping(address => string) public ownerToPseudonym;

    /// @notice Set once, after RevocationManager is deployed, via
    ///         setRevocationManager. Entirely optional: the registry works exactly
    ///         as before if this is left unset, so nothing else in the system
    ///         breaks if a migration skips wiring it up.
    IRevocationManager public revocationManager;

    event VehicleRegistered(string indexed pseudonym, address indexed owner, uint256 timestamp);
    event VehicleRemoved(string indexed pseudonym, uint256 timestamp);

    /// @dev Ownable (OpenZeppelin) makes the deployer the owner/admin. `admin()` is
    ///      kept as a read-only alias of `owner()` so existing tooling and the
    ///      front end can keep calling it.
    constructor() Ownable(msg.sender) {}

    /// @notice Same address as owner(); kept so earlier code that calls admin() still works.
    function admin() external view returns (address) {
        return owner();
    }

    /// @notice Ownership can only be transferred, never renounced: a registry with no
    ///         admin could never be paused, unwired or repaired.
    function renounceOwnership() public pure override {
        revert("Renouncing ownership is disabled");
    }

    /// @notice Emergency stop for new registrations (admin only).
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice One-time wiring of the RevocationManager address.
    /// @dev Kept out of the constructor to avoid a circular deployment dependency:
    ///      RevocationManager's own constructor needs this registry's address, so
    ///      this registry must be deployed first, then told where RevocationManager
    ///      ended up. Call this once, right after RevocationManager is deployed.
    function setRevocationManager(address _revocationManager) external onlyOwner {
        require(address(revocationManager) == address(0), "RevocationManager already set");
        require(_revocationManager != address(0), "Invalid address");
        revocationManager = IRevocationManager(_revocationManager);
    }

    /// @notice Register a new pseudonymous driver/vehicle identity.
    /// @dev A wallet may still hold multiple pseudonyms over time — that relaxation
    ///      is kept as-is because it's relied on for demo/test flows with a small
    ///      number of accounts. The one guard now enforced: once RevocationManager
    ///      is wired up, a wallet whose *current* identity is revoked cannot simply
    ///      register a fresh pseudonym to dodge that revocation. Without this, the
    ///      whole revocation mechanism would be trivially bypassable by re-registering.
    function registerVehicle(string memory _pseudonym) external whenNotPaused {
        require(bytes(_pseudonym).length > 0, "Pseudonym cannot be empty");
        require(!vehicles[_pseudonym].isRegistered, "Pseudonym already registered");

        if (address(revocationManager) != address(0)) {
            string memory currentPseudonym = ownerToPseudonym[msg.sender];
            if (bytes(currentPseudonym).length > 0) {
                require(
                    !revocationManager.isRevoked(currentPseudonym),
                    "This wallet's current identity is revoked and cannot register a new one"
                );
            }
        }

        vehicles[_pseudonym] = Vehicle({
            pseudonym: _pseudonym,
            owner: msg.sender,
            registrationTime: block.timestamp,
            isRegistered: true
        });

        // Always update ownerToPseudonym to the latest registered pseudonym
        ownerToPseudonym[msg.sender] = _pseudonym;

        emit VehicleRegistered(_pseudonym, msg.sender, block.timestamp);
    }

    // Check if vehicle is registered
    function isVehicleRegistered(string memory _pseudonym) external view returns (bool) {
        return vehicles[_pseudonym].isRegistered;
    }

    // Get vehicle details
    function getVehicle(string memory _pseudonym) external view returns (
        address owner,
        uint256 registrationTime,
        bool isRegistered
    ) {
        Vehicle memory v = vehicles[_pseudonym];
        return (v.owner, v.registrationTime, v.isRegistered);
    }

    // Get latest pseudonym by owner address
    function getPseudonymByOwner(address _owner) external view returns (string memory) {
        return ownerToPseudonym[_owner];
    }

    /// @notice Remove a registration.
    /// @dev Only the identity's own owner, or the admin (e.g. to help a driver who has
    ///      lost wallet access), may remove it. Hardening: an identity that is currently
    ///      revoked can be removed by the admin only. Otherwise a revoked wallet could
    ///      delete its own record and register a clean pseudonym, defeating revocation.
    function removeVehicle(string memory _pseudonym) external {
        require(vehicles[_pseudonym].isRegistered, "Vehicle not registered");
        bool callerIsAdmin = msg.sender == owner();
        require(
            msg.sender == vehicles[_pseudonym].owner || callerIsAdmin,
            "Only the owner or admin can remove this registration"
        );
        if (!callerIsAdmin && address(revocationManager) != address(0)) {
            require(
                !revocationManager.isRevoked(_pseudonym),
                "A revoked identity can only be removed by the admin"
            );
        }

        address holder = vehicles[_pseudonym].owner;
        // Only clear ownerToPseudonym if it points to this pseudonym
        if (keccak256(bytes(ownerToPseudonym[holder])) == keccak256(bytes(_pseudonym))) {
            delete ownerToPseudonym[holder];
        }
        delete vehicles[_pseudonym];

        emit VehicleRemoved(_pseudonym, block.timestamp);
    }
}
