// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./IVehicleRegistry.sol";
import "./IRevocationManager.sol";

/**
 * @title LicenseRegistry
 * @dev Issues and tracks licenses tied to vehicles already registered in
 * VehicleRegistry. Every write here (issue / revoke / reinstate) emits an
 * event — that event, plus the transaction hash and block info the wallet
 * returns immediately after confirmation, IS the receipt. Nothing is
 * written to any off-chain database; a license's current state is always
 * read straight from this contract's own storage via the view functions
 * below, and its full history is read straight from these events via
 * queryFilter on the frontend. See utils/receipts.ts in the demo app.
 */
contract LicenseRegistry is Ownable, Pausable {

    struct License {
        string licenseId;
        string vehiclePseudonym;
        address owner;
        string licenseType;
        uint256 issueTime;
        uint256 expiryTime;
        bool isActive;
        bool issued; // distinguishes "never issued" from "issued but inactive"
    }

    IVehicleRegistry public vehicleRegistry;
    IRevocationManager public revocationManager;

    mapping(string => License) public licenses;        // licenseId => License
    mapping(string => string) public vehicleToLicense;  // vehiclePseudonym => latest licenseId
    uint256 public licenseCount;

    event LicenseIssued(
        string indexed licenseId,
        string vehiclePseudonym,
        address indexed owner,
        string licenseType,
        uint256 issueTime,
        uint256 expiryTime
    );
    event LicenseRevoked(string indexed licenseId, string vehiclePseudonym, uint256 timestamp);
    event LicenseReinstated(string indexed licenseId, uint256 timestamp);

    constructor(address _vehicleRegistryAddress, address _revocationManagerAddress) Ownable(msg.sender) {
        vehicleRegistry = IVehicleRegistry(_vehicleRegistryAddress);
        revocationManager = IRevocationManager(_revocationManagerAddress);
    }

    /// @notice Same address as owner(); kept so earlier code that calls admin() still works.
    function admin() external view returns (address) {
        return owner();
    }

    /// @notice Ownership can only be transferred, never renounced (see VehicleRegistry).
    function renounceOwnership() public pure override {
        revert("Renouncing ownership is disabled");
    }

    /// @notice Emergency stop for issuing new licenses (admin only). Revoking and
    ///         reinstating stay available while paused.
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Issue a license for a vehicle that's already registered and not
    // revoked. Open to any caller, same as VehicleRegistry.registerVehicle —
    // keeps the demo usable from a single wallet.
    function issueLicense(
        string memory _licenseId,
        string memory _vehiclePseudonym,
        string memory _licenseType,
        uint256 _validityDays
    ) external whenNotPaused {
        require(vehicleRegistry.isVehicleRegistered(_vehiclePseudonym), "Vehicle not registered");
        require(!revocationManager.isRevoked(_vehiclePseudonym), "Vehicle is revoked");
        require(!licenses[_licenseId].issued, "License ID already used");

        uint256 issueTime = block.timestamp;
        uint256 expiryTime = issueTime + (_validityDays * 1 days);

        licenses[_licenseId] = License({
            licenseId: _licenseId,
            vehiclePseudonym: _vehiclePseudonym,
            owner: msg.sender,
            licenseType: _licenseType,
            issueTime: issueTime,
            expiryTime: expiryTime,
            isActive: true,
            issued: true
        });

        vehicleToLicense[_vehiclePseudonym] = _licenseId;
        licenseCount++;

        emit LicenseIssued(_licenseId, _vehiclePseudonym, msg.sender, _licenseType, issueTime, expiryTime);
    }

    // A license is valid only if it was issued, is flagged active, hasn't
    // expired, AND its underlying vehicle isn't currently revoked — this
    // last check is a live cross-contract read, not a cached flag, so a
    // vehicle revocation instantly invalidates its license everywhere this
    // function is called, with no sync step needed.
    function isLicenseValid(string memory _licenseId) public view returns (bool) {
        License memory lic = licenses[_licenseId];
        if (!lic.issued || !lic.isActive) return false;
        if (block.timestamp > lic.expiryTime) return false;
        if (revocationManager.isRevoked(lic.vehiclePseudonym)) return false;
        return true;
    }

    function getLicense(string memory _licenseId) external view returns (
        string memory vehiclePseudonym,
        address owner,
        string memory licenseType,
        uint256 issueTime,
        uint256 expiryTime,
        bool isActive,
        bool issued
    ) {
        License memory lic = licenses[_licenseId];
        return (lic.vehiclePseudonym, lic.owner, lic.licenseType, lic.issueTime, lic.expiryTime, lic.isActive, lic.issued);
    }

    function getLicenseByVehicle(string memory _vehiclePseudonym) external view returns (string memory) {
        return vehicleToLicense[_vehiclePseudonym];
    }

    function revokeLicense(string memory _licenseId) external onlyOwner {
        require(licenses[_licenseId].issued, "License does not exist");
        require(licenses[_licenseId].isActive, "License already inactive");
        licenses[_licenseId].isActive = false;
        emit LicenseRevoked(_licenseId, licenses[_licenseId].vehiclePseudonym, block.timestamp);
    }

    function reinstateLicense(string memory _licenseId) external onlyOwner {
        require(licenses[_licenseId].issued, "License does not exist");
        require(!licenses[_licenseId].isActive, "License already active");
        licenses[_licenseId].isActive = true;
        emit LicenseReinstated(_licenseId, block.timestamp);
    }
}
