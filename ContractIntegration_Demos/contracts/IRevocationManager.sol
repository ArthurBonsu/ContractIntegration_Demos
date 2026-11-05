// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Minimal interface LicenseRegistry needs from RevocationManager — just
// enough to check whether a vehicle is currently revoked, without the two
// contracts needing to know anything else about each other.
interface IRevocationManager {
    function isRevoked(string memory _pseudonym) external view returns (bool);
}
