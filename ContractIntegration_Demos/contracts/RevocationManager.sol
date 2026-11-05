// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./IVehicleRegistry.sol";

/// @title RevocationManager
/// @notice Handles reporting and revoking driver/vehicle identities registered in
///         VehicleRegistry. A revoked identity is treated as invalid everywhere else
///         in the system: LicenseRegistry.isLicenseValid() checks isRevoked() live on
///         every call, and VehicleRegistry itself (once wired up via
///         setRevocationManager) refuses to let a revoked wallet register a fresh
///         pseudonym to dodge that revocation.
/// @dev All existing function names, event names, and public-variable names are kept
///      exactly as they were so LicenseRegistry.sol and the existing frontend
///      (utils/contracts.ts, utils/receipts.ts, components/RevocationPanel.tsx,
///      components/VehicleHistory.tsx) continue to work without any changes on their
///      side. Event indexing on VehicleRevoked/VehicleReinstated is deliberately left
///      non-indexed on pseudonym, matching the original — receipts.ts reads the
///      plaintext pseudonym back out of returnValues for client-side filtering, and
///      an indexed string parameter only stores its hash in the log, which would
///      silently break that lookup.
contract RevocationManager is Ownable, Pausable {

    IVehicleRegistry public vehicleRegistry;

    struct RevocationReport {
        string offenderPseudonym;
        string reporterPseudonym;
        string reason;
        uint256 timestamp;
        bool processed;
    }

    struct RevokedVehicle {
        string pseudonym;
        uint256 revocationTime;
        string reason;
        bool isRevoked;
    }

    mapping(string => RevokedVehicle) public identityRevocationList;
    mapping(uint256 => RevocationReport) public reports;
    uint256 public reportCount;

    event ReportSubmitted(uint256 indexed reportId, string offender, string reporter, uint256 timestamp);
    event VehicleRevoked(string pseudonym, string reason, uint256 timestamp);
    event VehicleReinstated(string pseudonym, uint256 timestamp);

    constructor(address _vehicleRegistryAddress) Ownable(msg.sender) {
        vehicleRegistry = IVehicleRegistry(_vehicleRegistryAddress);
    }

    /// @notice Same address as owner(); kept so earlier code that calls admin() still works.
    function admin() external view returns (address) {
        return owner();
    }

    /// @notice Ownership can only be transferred, never renounced (see VehicleRegistry).
    function renounceOwnership() public pure override {
        revert("Renouncing ownership is disabled");
    }

    /// @notice Emergency stop for new reports (admin only). Processing, revoking and
    ///         reinstating stay available while paused so the admin can still act.
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Submit a revocation report against a registered identity.
    /// @dev Restored real validation now that this models an actual complaint /
    ///      revocation workflow rather than a load-testing harness: both pseudonyms
    ///      must be registered identities, an identity cannot report itself, the
    ///      offender must not already be revoked, and a reason is required. Your
    ///      existing demo flow (register both identities, then report one against
    ///      the other with a reason) already satisfies all of these — this only
    ///      rejects reports that were never meaningful to begin with.
    function submitRevocationReport(
        string memory _offenderPseudonym,
        string memory _reporterPseudonym,
        string memory _reason
    ) external whenNotPaused returns (uint256) {
        require(vehicleRegistry.isVehicleRegistered(_offenderPseudonym), "Offender is not a registered identity");
        require(vehicleRegistry.isVehicleRegistered(_reporterPseudonym), "Reporter is not a registered identity");
        require(
            keccak256(bytes(_offenderPseudonym)) != keccak256(bytes(_reporterPseudonym)),
            "An identity cannot report itself"
        );
        require(!identityRevocationList[_offenderPseudonym].isRevoked, "Offender is already revoked");
        require(bytes(_reason).length > 0, "Reason cannot be empty");

        reportCount++;
        reports[reportCount] = RevocationReport({
            offenderPseudonym: _offenderPseudonym,
            reporterPseudonym: _reporterPseudonym,
            reason: _reason,
            timestamp: block.timestamp,
            processed: false
        });

        emit ReportSubmitted(reportCount, _offenderPseudonym, _reporterPseudonym, block.timestamp);

        return reportCount;
    }

    /// @notice Process a pending report and revoke the offending identity (admin only).
    /// @dev Now guards against processing a report ID that was never issued
    ///      (previously report ID 0 or an out-of-range ID would silently "succeed"
    ///      against an empty struct) and against double-revoking the same identity
    ///      from two different pending reports.
    function processRevocation(uint256 _reportId) external onlyOwner {
        require(_reportId > 0 && _reportId <= reportCount, "Report does not exist");

        RevocationReport storage report = reports[_reportId];
        require(!report.processed, "Report already processed");
        require(!identityRevocationList[report.offenderPseudonym].isRevoked, "Offender already revoked");

        identityRevocationList[report.offenderPseudonym] = RevokedVehicle({
            pseudonym: report.offenderPseudonym,
            revocationTime: block.timestamp,
            reason: report.reason,
            isRevoked: true
        });

        report.processed = true;

        emit VehicleRevoked(report.offenderPseudonym, report.reason, block.timestamp);
    }

    // Check if vehicle is revoked
    function isRevoked(string memory _pseudonym) external view returns (bool) {
        return identityRevocationList[_pseudonym].isRevoked;
    }

    // Get revocation details
    function getRevocationDetails(string memory _pseudonym) external view returns (
        uint256 revocationTime,
        string memory reason,
        bool revoked
    ) {
        RevokedVehicle memory rv = identityRevocationList[_pseudonym];
        return (rv.revocationTime, rv.reason, rv.isRevoked);
    }

    // Get report details
    function getReport(uint256 _reportId) external view returns (
        string memory offender,
        string memory reporter,
        string memory reason,
        uint256 timestamp,
        bool processed
    ) {
        RevocationReport memory r = reports[_reportId];
        return (r.offenderPseudonym, r.reporterPseudonym, r.reason, r.timestamp, r.processed);
    }

    // Reinstate a vehicle (admin only)
    function reinstateVehicle(string memory _pseudonym) external onlyOwner {
        require(identityRevocationList[_pseudonym].isRevoked, "Vehicle not revoked");

        identityRevocationList[_pseudonym].isRevoked = false;

        emit VehicleReinstated(_pseudonym, block.timestamp);
    }
}
