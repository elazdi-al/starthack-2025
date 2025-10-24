// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./EventBook.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IEventBook {

    function events(uint256 eventId) external view returns (
        string memory name,
        string memory location,
        uint256 date,
        uint256 price,
        uint256 revenueOwed,
        address creator,
        uint256 ticketsSold,
        uint256 maxCapacity,
        string memory imageURI,
        string memory farcasterURI
    );
}

contract Ticket is ERC721, ERC721URIStorage, Ownable {
    
    uint256 private _currentTokenId;
    
    // This will be the address of your EventManager (EventBook) contract
    address public eventBook; 
    IEventBook public eventBookContract;

    // Links a specific NFT (tokenId) back to its event (eventId)
    mapping(uint256 => uint256) public ticketToEvent;

    // Store purchase timestamp for each ticket
    mapping(uint256 => uint256) public ticketPurchaseTime;

    mapping(uint256 => bool) public isCheckedIn;

    constructor() ERC721("EventTickets", "EVT") Ownable(msg.sender) {}

    // IMPORTANT: Only the EventManager can mint new tickets
    modifier onlyEventBook() {
        require(msg.sender == eventBook, "Only manager can mint");
        _;
    }

    function checkIn(uint256 tokenId) public onlyEventBook {
        isCheckedIn[tokenId] = true;
    }

    // Call this from your deploy script to link the two contracts
    function setEventBook(address _manager) public onlyOwner {
        eventBook = _manager;
        eventBookContract = IEventBook(_manager);
    }

    function mintTicket(
        address _to,
        uint256 _eventId,
        string memory _tokenURI
    ) public onlyEventBook returns (uint256) {
        uint256 newTicketId = ++_currentTokenId;
        
        _safeMint(_to, newTicketId);
        _setTokenURI(newTicketId, _tokenURI);
        ticketToEvent[newTicketId] = _eventId;
        ticketPurchaseTime[newTicketId] = block.timestamp;
        
        return newTicketId;
    }



    function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC721, ERC721URIStorage)
    returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        require(_ownerOf(tokenId) != address(0), "ERC721: URI query for nonexistent token");

        // 1. Get Event Details from EventBook
        uint256 eventId = ticketToEvent[tokenId];
        (string memory eventName, string memory eventLocation, uint256 eventDate,,,,,,string memory imageURI, string memory farcasterURI) = eventBookContract.events(eventId);

        // 2. Get Ticket Status (Checked In?)
        string memory status = isCheckedIn[tokenId] ? "Checked In" : "Ready to Scan";

        // 3. Get Purchase Timestamp
        uint256 purchaseTime = ticketPurchaseTime[tokenId];

        // 4. Construct the JSON String
        string memory json = string(
            abi.encodePacked(
                '{"name": "', eventName, ' - Ticket #', Strings.toString(tokenId), '",',
                '"description": "A ticket for ', eventName, ' in ', eventLocation, '.",',
                '"image": "', imageURI, '",',
                '"farcasterURI": "', farcasterURI, '",',
                '"attributes": [',
                    '{"trait_type": "Event Date", "value": ', Strings.toString(eventDate), '},',
                    '{"trait_type": "Location", "value": "', eventLocation, '"},',
                    '{"trait_type": "Purchase Date", "value": ', Strings.toString(purchaseTime), '},',
                    '{"trait_type": "Ticket Type", "value": "General Admission"},',
                    '{"trait_type": "Status", "value": "', status, '"}',
                ']}'
            )
        );

        // 5. Encode as Base64 and return the Data URI
        return
            string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    Base64.encode(bytes(json))
                )
            );
    }
}
