// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";


// 1. Define an interface for the NFT contract
interface IEventTicket {
    function mintTicket(
        address _to,
        uint256 _eventId,
        string memory _tokenURI
    ) external returns (uint256);

    function ownerOf(uint256 tokenId) external view returns (address);
    function transferFrom(address from, address to, uint256 tokenId) external;
    function ticketToEvent(uint256 tokenId) external view returns (uint256);
}

contract EventBook {
    struct Event {
        string name;
        string location;
        uint256 date; // UNIX timestamp
        uint256 price; // in wei
        uint256 revenueOwed; // in wei
        address creator;
        uint256 ticketsSold;
        uint256 maxCapacity; // 0 means no limit
    }

    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }

    // list of all events
    Event[] public events;

    IEventTicket public ticketContract;

    mapping(uint256 => Listing) public listings;

    event TicketListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event TicketSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price);
    event ListingCancelled(uint256 indexed tokenId, address indexed seller);

    constructor(address _ticketContractAddress) {
        ticketContract = IEventTicket(_ticketContractAddress);
    }

    // mapping to track who bought tickets
    // maps eventId (index in events) to a map mapping each user to boolean


    // anyone can create an event
    function createEvent(
        string memory name,
        string memory location,
        uint256 date,
        uint256 price,
        uint256 maxCapacity
    ) public {
        require(date > block.timestamp, "Date must be in the future");

        events.push(Event({
            name: name,
            location: location,
            date: date,
            price: price,
            revenueOwed: 0,
            creator: msg.sender,
            ticketsSold: 0,
            maxCapacity: maxCapacity
        }));
    }

    function createEvent(
        string memory name,
        string memory location,
        uint256 date,
        uint256 price
    ) public {
        createEvent(name, location, date, price, 0);
    }

    // buy a ticket for an event
    function buyTicket(uint256 eventId) public payable {
        Event storage ev = events[eventId];

        require(block.timestamp < ev.date, "Event has passed");
        if (ev.maxCapacity > 0) require(ev.ticketsSold < ev.maxCapacity, "Event is full");
        require(msg.value == ev.price, "Incorrect payment");

        ev.ticketsSold += 1;
        ev.revenueOwed += ev.price;

        string memory tempTokenURI = ""; // TODO: Replace with real metadata URI
        ticketContract.mintTicket(msg.sender, eventId, tempTokenURI);
    }

    // withdraw sales (only the event creator)
    function withdraw(uint256 eventId) public {
        Event storage ev = events[eventId];

        require(msg.sender == ev.creator, "Not creator");

        payable(msg.sender).transfer(ev.revenueOwed);
        ev.revenueOwed = 0; // reset revenue owed
    }

    // helper function to get total number of events
    function getNumberOfEvents() public view returns (uint256) {
        return events.length;
    }

    /**
     *  MARKETPLACE
     *  MARKETPLACE
     */

        /**
     * @dev List your ticket for resale
     * @param tokenId The NFT token ID of your ticket
     * @param price Price in wei you want to sell for
     */
    function listTicketForSale(uint256 tokenId, uint256 price) public {
        require(ticketContract.ownerOf(tokenId) == msg.sender, "Not ticket owner");
        require(price > 0, "Price must be > 0");
        


        // Get event details to check if it hasn't passed
        uint256 eventId = ticketContract.ticketToEvent(tokenId);
        Event storage ev = events[eventId];
        require(block.timestamp < ev.date, "Event already passed");

        // Optional: Set max resale price (e.g., 2x original price to prevent scalping)
        require(price <= ev.price * 2, "Price too high (max 2x original)");

        address approved = IERC721(address(ticketContract)).getApproved(tokenId);
        require(approved == address(this), "You must approve this contract to sell");

        listings[tokenId] = Listing({
            seller: msg.sender,
            price: price,
            active: true
        });

        emit TicketListed(tokenId, msg.sender, price);
    }

    /**
     * @dev Buy a ticket from resale marketplace
     * @param tokenId The NFT token ID to purchase
     */
    function buyResaleTicket(uint256 tokenId) public payable {
        Listing storage listing = listings[tokenId];
        
        require(listing.active, "Not for sale");
        require(msg.value == listing.price, "Incorrect payment");
        require(ticketContract.ownerOf(tokenId) == listing.seller, "Seller no longer owns ticket");

        // Get event details
        uint256 eventId = ticketContract.ticketToEvent(tokenId);
        Event storage ev = events[eventId];
        require(block.timestamp < ev.date, "Event already passed");

        uint256 sellerAmount = listing.price ;

        // Mark listing as inactive
        listing.active = false;

        // Transfer NFT from seller to buyer
        ticketContract.transferFrom(listing.seller, msg.sender, tokenId);

        // Pay seller
        payable(listing.seller).transfer(sellerAmount);

        emit TicketSold(tokenId, listing.seller, msg.sender, listing.price);
    }

    /**
     * @dev Cancel your listing
     * @param tokenId The NFT token ID to delist
     */
    function cancelListing(uint256 tokenId) public {
        Listing storage listing = listings[tokenId];
        
        require(listing.seller == msg.sender, "Not your listing");
        require(listing.active, "Not active");

        listing.active = false;

        emit ListingCancelled(tokenId, msg.sender);
    }

    /**
     * @dev Get listing details
     * @param tokenId The NFT token ID
     */
    function getListing(uint256 tokenId) public view returns (
        address seller,
        uint256 price,
        bool active
    ) {
        Listing memory listing = listings[tokenId];
        return (listing.seller, listing.price, listing.active);
    }

    /**
     * @dev Check if a ticket is listed for sale
     * @param tokenId The NFT token ID
     */
    function isListedForSale(uint256 tokenId) public view returns (bool) {
        return listings[tokenId].active;
    }
}

