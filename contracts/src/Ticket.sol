// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";



contract Ticket is ERC721, ERC721URIStorage, Ownable {
    
    uint256 private _currentTokenId;
    
    // This will be the address of your EventManager (EventBook) contract
    address public eventBook; 

    // Links a specific NFT (tokenId) back to its event (eventId)
    mapping(uint256 => uint256) public ticketToEvent;

    constructor() ERC721("EventTickets", "EVT") Ownable(msg.sender) {}

    // IMPORTANT: Only the EventManager can mint new tickets
    modifier onlyEventBook() {
        require(msg.sender == eventBook, "Only manager can mint");
        _;
    }

    // Call this from your deploy script to link the two contracts
    function setEventBook(address _manager) public onlyOwner {
        eventBook = _manager;
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
        return super.tokenURI(tokenId);
    }
}
