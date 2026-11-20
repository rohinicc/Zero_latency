// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FairPass Fair Ticketing Smart Contract
 * @notice Enforces immutable ticket ownership, 1.1x resale price cap, and one-time gate redemption.
 */
contract FairPass {
    struct Ticket {
        uint256 eventId;
        address owner;
        uint256 facePrice;
        uint256 maxResalePrice; // Enforces 1.1x (110%) cap
        bool redeemed;
        uint256 issuedAt;
    }

    string public name = "FairPass Ticket";
    string public symbol = "FPASS";
    address public organizer;
    uint256 public nextTicketId = 1;

    mapping(uint256 => Ticket) public tickets;
    mapping(address => uint256[]) public userTickets;

    event TicketIssued(uint256 indexed ticketId, uint256 indexed eventId, address indexed owner, uint256 facePrice);
    event TicketTransferred(uint256 indexed ticketId, address indexed from, address indexed to, uint256 price);
    event TicketRedeemed(uint256 indexed ticketId, address redeemedBy);

    modifier onlyOrganizer() {
        require(msg.sender == organizer, "Only organizer can execute this action");
        _;
    }

    constructor() {
        organizer = msg.sender;
    }

    /**
     * @notice Issue a new ticket for an event
     * @param eventId ID of the event
     * @param buyer Address of the attendee
     * @param facePrice Original face value in wei
     */
    function issueTicket(uint256 eventId, address buyer, uint256 facePrice) external returns (uint256) {
        // In demo environment, allow organizer or buyer self-mint
        require(buyer != address(0), "Invalid buyer address");
        uint256 ticketId = nextTicketId++;
        uint256 maxResale = (facePrice * 110) / 100; // Mandatory 1.1x resale cap

        tickets[ticketId] = Ticket({
            eventId: eventId,
            owner: buyer,
            facePrice: facePrice,
            maxResalePrice: maxResale,
            redeemed: false,
            issuedAt: block.timestamp
        });

        userTickets[buyer].push(ticketId);
        emit TicketIssued(ticketId, eventId, buyer, facePrice);
        return ticketId;
    }

    /**
     * @notice Resell a ticket at or below the mandatory 1.1x price cap
     * @param ticketId Ticket ID to resell
     * @param buyer Recipient address
     * @param price Price charged (must not exceed maxResalePrice)
     */
    function resell(uint256 ticketId, address buyer, uint256 price) external {
        Ticket storage t = tickets[ticketId];
        require(t.owner == msg.sender, "Only current ticket owner can resell");
        require(!t.redeemed, "Redeemed tickets cannot be resold");
        require(price <= t.maxResalePrice, "FairPass Violation: Resale price exceeds 1.1x price cap!");
        require(buyer != address(0), "Invalid buyer address");

        address previousOwner = t.owner;
        t.owner = buyer;

        userTickets[buyer].push(ticketId);
        emit TicketTransferred(ticketId, previousOwner, buyer, price);
    }

    /**
     * @notice One-time redemption at the venue gate
     * @param ticketId Ticket ID to redeem
     */
    function redeem(uint256 ticketId) external {
        Ticket storage t = tickets[ticketId];
        require(t.owner != address(0), "Ticket does not exist");
        require(!t.redeemed, "Duplicate entry rejected: Ticket already redeemed!");
        t.redeemed = true;
        emit TicketRedeemed(ticketId, msg.sender);
    }

    /**
     * @notice Get full ticket details
     */
    function getTicket(uint256 ticketId) external view returns (
        uint256 eventId,
        address owner,
        uint256 facePrice,
        uint256 maxResalePrice,
        bool redeemed,
        uint256 issuedAt
    ) {
        Ticket storage t = tickets[ticketId];
        require(t.owner != address(0), "Ticket not found");
        return (t.eventId, t.owner, t.facePrice, t.maxResalePrice, t.redeemed, t.issuedAt);
    }

    /**
     * @notice Check if ticket is redeemed
     */
    function isRedeemed(uint256 ticketId) external view returns (bool) {
        return tickets[ticketId].redeemed;
    }
}
