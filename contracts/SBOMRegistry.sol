// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SBOMRegistry
 * @dev Smart contract for registering and verifying Software Bill of Materials (SBOM) 
 * with digital signatures and vendor registry
 * @author SBOM Blockchain Verification Project
 */
contract SBOMRegistry {
    
    // ═══════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════
    
    /**
     * @dev Structure to store SBOM record information
     */
    struct SBOMRecord {
        bytes32 hash;           // Hash of the SBOM file
        address vendor;         // Address of the vendor who registered it
        uint256 timestamp;      // When it was registered
        string metadata;        // JSON metadata (version, project name, etc.)
        bytes32 previousHash;   // Hash of previous version (for version tracking)
        bytes signature;        // Digital signature of the vendor
    }
    
    /**
     * @dev Structure to store vendor information
     */
    struct VendorInfo {
        string name;            // Company/Vendor name
        string website;         // Official website
        string contactEmail;    // Contact email
        bool verified;          // Whether the vendor is verified
        uint256 registeredAt;   // When the vendor was registered
    }
    
    // ═══════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════
    
    // Mapping from SBOM hash to its record
    mapping(bytes32 => SBOMRecord) public sbomRecords;
    
    // Mapping from root hash to array of all version hashes
    mapping(bytes32 => bytes32[]) public versionHistory;
    
    // Mapping from any hash to its root hash (first version)
    mapping(bytes32 => bytes32) public rootHash;
    
    // Mapping from vendor address to vendor information
    mapping(address => VendorInfo) public vendors;
    
    // Registry owner (can add/remove vendors)
    address public registryOwner;
    
    // ═══════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════
    
    event SBOMRegistered(
        bytes32 indexed hash,
        address indexed vendor,
        uint256 timestamp,
        string metadata
    );
    
    event SBOMUpdated(
        bytes32 indexed oldHash,
        bytes32 indexed newHash,
        address indexed vendor,
        uint256 timestamp
    );
    
    event VendorRegistered(
        address indexed vendor,
        string name,
        uint256 timestamp
    );
    
    event VendorRevoked(
        address indexed vendor,
        uint256 timestamp
    );
    
    // ═══════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════
    
    modifier onlyRegistryOwner() {
        require(msg.sender == registryOwner, "Only registry owner can perform this action");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════
    
    constructor() {
        registryOwner = msg.sender;
    }
    
    // ═══════════════════════════════════════════════════════════
    // VENDOR REGISTRY FUNCTIONS
    // ═══════════════════════════════════════════════════════════
    
    /**
     * @dev Register a new verified vendor
     * @param _vendor Address of the vendor's wallet
     * @param _name Company/Vendor name
     * @param _website Official website URL
     * @param _contactEmail Contact email address
     */
    function registerVendor(
        address _vendor,
        string memory _name,
        string memory _website,
        string memory _contactEmail
    ) public onlyRegistryOwner {
        require(_vendor != address(0), "Invalid vendor address");
        require(!vendors[_vendor].verified, "Vendor already registered");
        require(bytes(_name).length > 0, "Name cannot be empty");
        
        vendors[_vendor] = VendorInfo({
            name: _name,
            website: _website,
            contactEmail: _contactEmail,
            verified: true,
            registeredAt: block.timestamp
        });
        
        emit VendorRegistered(_vendor, _name, block.timestamp);
    }
    
    /**
     * @dev Revoke a vendor's verification status
     * @param _vendor Address of the vendor to revoke
     */
    function revokeVendor(address _vendor) public onlyRegistryOwner {
        require(vendors[_vendor].verified, "Vendor not verified");
        vendors[_vendor].verified = false;
        emit VendorRevoked(_vendor, block.timestamp);
    }
    
    /**
     * @dev Check if a vendor is verified
     * @param _vendor Address of the vendor
     * @return Whether the vendor is verified
     */
    function isVerifiedVendor(address _vendor) public view returns (bool) {
        return vendors[_vendor].verified;
    }
    
    /**
     * @dev Get vendor information
     * @param _vendor Address of the vendor
     * @return Vendor information struct
     */
    function getVendorInfo(address _vendor) public view returns (VendorInfo memory) {
        return vendors[_vendor];
    }
    
    /**
     * @dev Transfer registry ownership
     * @param _newOwner Address of the new owner
     */
    function transferOwnership(address _newOwner) public onlyRegistryOwner {
        require(_newOwner != address(0), "Invalid new owner address");
        registryOwner = _newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════
    // SBOM REGISTRATION FUNCTIONS (WITH SIGNATURES)
    // ═══════════════════════════════════════════════════════════
    
    /**
     * @dev Register a new SBOM with digital signature
     * @param _hash The hash of the SBOM file (keccak256)
     * @param _metadata JSON string containing additional info (version, project, etc.)
     * @param _signature Digital signature created by signing the hash
     */
    function registerSBOM(
        bytes32 _hash,
        string memory _metadata,
        bytes memory _signature
    ) public {
        require(sbomRecords[_hash].timestamp == 0, "SBOM already registered");
        require(_signature.length == 65, "Invalid signature length");
        
        // Verify the signature was created by the sender
        address signer = recoverSigner(_hash, _signature);
        require(signer == msg.sender, "Invalid signature - signer does not match sender");
        
        // Require vendor to be verified
        require(vendors[msg.sender].verified, "Vendor not verified - please register as vendor first");
        
        // Store the SBOM record
        sbomRecords[_hash] = SBOMRecord({
            hash: _hash,
            vendor: msg.sender,
            timestamp: block.timestamp,
            metadata: _metadata,
            previousHash: bytes32(0),
            signature: _signature
        });
        
        // Set this hash as its own root (first version)
        rootHash[_hash] = _hash;
        
        // Initialize version history
        versionHistory[_hash].push(_hash);
        
        emit SBOMRegistered(_hash, msg.sender, block.timestamp, _metadata);
    }
    
    /**
     * @dev Register an updated version of an existing SBOM
     * @param _oldHash The hash of the previous SBOM version
     * @param _newHash The hash of the new SBOM version
     * @param _metadata JSON string containing additional info
     * @param _signature Digital signature for the new hash
     */
    function updateSBOM(
        bytes32 _oldHash,
        bytes32 _newHash,
        string memory _metadata,
        bytes memory _signature
    ) public {
        require(sbomRecords[_oldHash].timestamp != 0, "Original SBOM not found");
        require(sbomRecords[_oldHash].vendor == msg.sender, "Only original vendor can update");
        require(sbomRecords[_newHash].timestamp == 0, "New hash already registered");
        require(_signature.length == 65, "Invalid signature length");
        
        // Verify the signature was created by the sender
        address signer = recoverSigner(_newHash, _signature);
        require(signer == msg.sender, "Invalid signature - signer does not match sender");
        
        // Get the root hash from the old version
        bytes32 root = rootHash[_oldHash];
        
        // Store the new SBOM record
        sbomRecords[_newHash] = SBOMRecord({
            hash: _newHash,
            vendor: msg.sender,
            timestamp: block.timestamp,
            metadata: _metadata,
            previousHash: _oldHash,
            signature: _signature
        });
        
        // Link new hash to the same root
        rootHash[_newHash] = root;
        
        // Add new version to the root's history
        versionHistory[root].push(_newHash);
        
        emit SBOMUpdated(_oldHash, _newHash, msg.sender, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════
    // SIGNATURE VERIFICATION FUNCTIONS
    // ═══════════════════════════════════════════════════════════
    
    /**
     * @dev Recover the signer's address from a hash and signature
     * @param _hash The hash that was signed
     * @param _signature The signature bytes (65 bytes: r, s, v)
     * @return The address that created the signature
     */
    function recoverSigner(bytes32 _hash, bytes memory _signature) 
        public 
        pure 
        returns (address) 
    {
        require(_signature.length == 65, "Invalid signature length");
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        // Extract r, s, v from signature
        assembly {
            r := mload(add(_signature, 32))
            s := mload(add(_signature, 64))
            v := byte(0, mload(add(_signature, 96)))
        }
        
        // Version of signature should be 27 or 28
        if (v < 27) {
            v += 27;
        }
        
        require(v == 27 || v == 28, "Invalid signature version");
        
        // Ethereum signed message prefix
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", _hash)
        );
        
        // Recover the signer address using ecrecover
        return ecrecover(ethSignedHash, v, r, s);
    }
    
    /**
     * @dev Verify that a stored SBOM's signature is valid
     * @param _hash The hash of the SBOM to verify
     * @return isValid Whether the signature is valid
     * @return signer The address that signed it
     */
    function verifySignature(bytes32 _hash) 
        public 
        view 
        returns (bool isValid, address signer) 
    {
        SBOMRecord memory record = sbomRecords[_hash];
        
        // Check if record exists
        if (record.timestamp == 0) {
            return (false, address(0));
        }
        
        // Recover the signer from the stored signature
        signer = recoverSigner(_hash, record.signature);
        
        // Check if the recovered signer matches the stored vendor
        isValid = (signer == record.vendor);
        
        return (isValid, signer);
    }
    
    // ═══════════════════════════════════════════════════════════
    // SBOM VERIFICATION FUNCTIONS
    // ═══════════════════════════════════════════════════════════
    
    /**
     * @dev Verify if an SBOM hash exists on-chain
     * @param _hash The hash to verify
     * @return exists Boolean indicating if the hash is registered
     * @return record The SBOM record if it exists
     */
    function verifySBOM(bytes32 _hash) 
        public 
        view 
        returns (bool exists, SBOMRecord memory record) 
    {
        record = sbomRecords[_hash];
        exists = record.timestamp != 0;
        return (exists, record);
    }
    
    /**
     * @dev Comprehensive verification of an SBOM
     * @param _hash The hash to verify
     * @return exists Whether the SBOM is registered
     * @return signatureValid Whether the signature is valid
     * @return vendorVerified Whether the vendor is verified
     * @return vendorName Name of the vendor
     */
    function verifyCompleteSBOM(bytes32 _hash) 
        public 
        view 
        returns (
            bool exists,
            bool signatureValid,
            bool vendorVerified,
            string memory vendorName
        ) 
    {
        SBOMRecord memory record = sbomRecords[_hash];
        exists = record.timestamp != 0;
        
        if (!exists) {
            return (false, false, false, "");
        }
        
        // Verify signature
        (signatureValid, ) = verifySignature(_hash);
        
        // Check vendor verification
        vendorVerified = vendors[record.vendor].verified;
        vendorName = vendors[record.vendor].name;
        
        return (exists, signatureValid, vendorVerified, vendorName);
    }
    
    // ═══════════════════════════════════════════════════════════
    // VERSION HISTORY FUNCTIONS
    // ═══════════════════════════════════════════════════════════
    
    /**
     * @dev Get the complete version history for an SBOM
     * @param _hash The hash of any version in the history chain
     * @return Array of all version hashes (from first to latest)
     */
    function getVersionHistory(bytes32 _hash) 
        public 
        view 
        returns (bytes32[] memory) 
    {
        bytes32 root = rootHash[_hash];
        return versionHistory[root];
    }
    
    /**
     * @dev Get the number of versions for an SBOM
     * @param _hash The hash of any version in the history chain
     * @return count Number of versions
     */
    function getVersionCount(bytes32 _hash) public view returns (uint256 count) {
        bytes32 root = rootHash[_hash];
        return versionHistory[root].length;
    }
    
    /**
     * @dev Get the root hash (first version) for any hash in the chain
     * @param _hash The hash of any version
     * @return The root hash
     */
    function getRootHash(bytes32 _hash) public view returns (bytes32) {
        return rootHash[_hash];
    }
}
