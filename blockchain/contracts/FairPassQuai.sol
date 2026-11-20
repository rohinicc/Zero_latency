// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FairPassQuai - Privacy-Preserving Ticket Registry for Quai Network (Orchard Cyprus-1)
 * @notice Provides immutable on-chain record proofs, anti-scalping 1.1x resale enforcement,
 * and one-time gate redemption without storing any user personal identifiable information (PII).
 */
contract FairPassQuai {
    struct TicketRecord {
        bytes32 ticketHash;      // Privacy-preserving hash: keccak256(ticket_token + salt)
        uint256 eventId;
        address owner;           // Quai/EVM address of attendee or escrow
        uint256 facePrice;
        uint256 maxResalePrice;  // Enforces 1.1x (110%) mandatory resale cap
        bool redeemed;
        uint256 registeredAt;
        uint256 redeemedAt;
    }

    string public name = "FairPass Quai Ticket Registry";
    string public symbol = "FPQUAI";
    address public organizer;
    uint256 public totalRecords = 0;

    mapping(uint256 => TicketRecord) public ticketRecords;
    mapping(bytes32 => bool) public registeredHashes;

    event TicketRegisteredOnQuai(
        uint256 indexed ticketId,
        bytes32 indexed ticketHash,
        uint256 indexed eventId,
        address owner,
        uint256 facePrice
    );

    event TicketTransferredOnQuai(
        uint256 indexed ticketId,
        bytes32 indexed newTicketHash,
        address indexed from,
        address to,
        uint256 price
    );

    event TicketRedeemedOnQuai(
        uint256 indexed ticketId,
        address indexed redeemedBy,
        uint256 timestamp
    );

    modifier onlyOrganizer() {
        require(msg.sender == organizer, "Only organizer can execute this action");
        _;
    }

    constructor() {
        organizer = msg.sender;
    }

    /**
     * @notice Register a privacy-preserving ticket proof on Quai Network
     * @param ticketId Unique database ticket ID
     * @param ticketHash Keccak256 hash of the ticket token (never raw PII)
     * @param eventId Event identifier
     * @param owner Buyer Quai/EVM address
     * @param facePrice Face value
     */
    function registerTicket(
        uint256 ticketId,
        bytes32 ticketHash,
        uint256 eventId,
        address owner,
        uint256 facePrice
    ) external returns (bool) {
        require(ticketRecords[ticketId].registeredAt == 0, "Ticket record already registered on Quai");
        require(!registeredHashes[ticketHash], "Ticket hash already registered");

        uint256 maxResale = (facePrice * 110) / 100; // 1.1x price ceiling

        ticketRecords[ticketId] = TicketRecord({
            ticketHash: ticketHash,
            eventId: eventId,
            owner: owner != address(0) ? owner : msg.sender,
            facePrice: facePrice,
            maxResalePrice: maxResale,
            redeemed: false,
            registeredAt: block.timestamp,
            redeemedAt: 0
        });

        registeredHashes[ticketHash] = true;
        totalRecords++;

        emit TicketRegisteredOnQuai(ticketId, ticketHash, eventId, owner, facePrice);
        return true;
    }

    /**
     * @notice Resell a ticket record on Quai Network at or below the 1.1x price cap
     */
    function resellTicket(
        uint256 ticketId,
        bytes32 newTicketHash,
        address newOwner,
        uint256 price
    ) external {
        TicketRecord storage t = ticketRecords[ticketId];
        require(t.registeredAt > 0, "Ticket record not found on Quai");
        require(t.owner == msg.sender || msg.sender == organizer, "Unauthorized resale caller");
        require(!t.redeemed, "Redeemed ticket cannot be resold");
        require(price <= t.maxResalePrice, "FairPass Violation: Price exceeds 1.1x resale cap!");
        require(newOwner != address(0), "Invalid new owner address");
        require(!registeredHashes[newTicketHash], "New ticket hash already in use");

        address previousOwner = t.owner;
        t.owner = newOwner;
        t.ticketHash = newTicketHash;
        registeredHashes[newTicketHash] = true;

        emit TicketTransferredOnQuai(ticketId, newTicketHash, previousOwner, newOwner, price);
    }

    /**
     * @notice Record redemption proof on Quai Network
     */
    function redeemTicket(uint256 ticketId) external {
        TicketRecord storage t = ticketRecords[ticketId];
        require(t.registeredAt > 0, "Ticket record not found on Quai");
        require(!t.redeemed, "Duplicate entry rejected: Ticket already redeemed on Quai!");

        t.redeemed = true;
        t.redeemedAt = block.timestamp;

        emit TicketRedeemedOnQuai(ticketId, msg.sender, block.timestamp);
    }

    /**
     * @notice Verify a ticket record on Quai Network
     */
    function verifyTicket(uint256 ticketId, bytes32 expectedHash) external view returns (
        bool exists,
        bool hashMatches,
        bool redeemed,
        address owner,
        uint256 eventId
    ) {
        TicketRecord storage t = ticketRecords[ticketId];
        if (t.registeredAt == 0) {
            return (false, false, false, address(0), 0);
        }
        return (
            true,
            t.ticketHash == expectedHash,
            t.redeemed,
            t.owner,
            t.eventId
        );
    }

    /**
     * @notice Get full ticket record on Quai
     */
    function getTicketRecord(uint256 ticketId) external view returns (
        bytes32 ticketHash,
        uint256 eventId,
        address owner,
        uint256 facePrice,
        uint256 maxResalePrice,
        bool redeemed,
        uint256 registeredAt,
        uint256 redeemedAt
    ) {
        TicketRecord storage t = ticketRecords[ticketId];
        require(t.registeredAt > 0, "Ticket not registered on Quai");
        return (
            t.ticketHash,
            t.eventId,
            t.owner,
            t.facePrice,
            t.maxResalePrice,
            t.redeemed,
            t.registeredAt,
            t.redeemedAt
        );
    }
}
