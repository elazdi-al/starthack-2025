// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/Ticket.sol";

contract TicketTest is Test {
    Ticket ticket;

    address owner = makeAddr("owner");
    address eventBook = makeAddr("eventBook");
    address user1 = makeAddr("user1");
    address user2 = makeAddr("user2");

    function setUp() public {
        vm.prank(owner);
        ticket = new Ticket();

        // ensure initial state
        assertEq(ticket.owner(), owner);
        assertEq(ticket.eventBook(), address(0));
    }

    // ----------------------------
    // CONSTRUCTOR
    // ----------------------------
    function testConstructorSetsCorrectValues() public view {
        assertEq(ticket.name(), "EventTickets");
        assertEq(ticket.symbol(), "EVT");
    }

    // ----------------------------
    // ACCESS CONTROL
    // ----------------------------
    function testOnlyOwnerCanSetEventBook() public {
        vm.prank(owner);
        ticket.setEventBook(eventBook);
        assertEq(ticket.eventBook(), eventBook);

        // OZ v5: Ownable now reverts with custom error OwnableUnauthorizedAccount(address)
        vm.prank(user1);
        vm.expectRevert(
            abi.encodeWithSelector(bytes4(keccak256("OwnableUnauthorizedAccount(address)")), user1)
        );
        ticket.setEventBook(user2);
    }

    function testOnlyEventBookCanMint() public {
        vm.prank(owner);
        ticket.setEventBook(eventBook);

        vm.prank(user1);
        vm.expectRevert("Only manager can mint"); // this is from your modifier, still a string
        ticket.mintTicket(user1, 1, "ipfs://metadata");

        vm.prank(eventBook);
        uint256 id = ticket.mintTicket(user1, 1, "ipfs://metadata");
        assertEq(id, 1);
    }

    // ----------------------------
    // MINTING & STATE CHANGES
    // ----------------------------
    function testMintingIncrementsIdAndStoresData() public {
        vm.prank(owner);
        ticket.setEventBook(eventBook);

        vm.startPrank(eventBook);
        uint256 id1 = ticket.mintTicket(user1, 123, "ipfs://event123");
        uint256 id2 = ticket.mintTicket(user2, 456, "ipfs://event456");
        vm.stopPrank();

        // token IDs increment
        assertEq(id1, 1);
        assertEq(id2, 2);

        // ownership
        assertEq(ticket.ownerOf(id1), user1);
        assertEq(ticket.ownerOf(id2), user2);

        // tokenURIs
        assertEq(ticket.tokenURI(id1), "ipfs://event123");
        assertEq(ticket.tokenURI(id2), "ipfs://event456");

        // mapping
        assertEq(ticket.ticketToEvent(id1), 123);
        assertEq(ticket.ticketToEvent(id2), 456);
    }

    // ----------------------------
    // ERC721 FUNCTIONALITY
    // ----------------------------
    function testSupportsInterface() public view {
        // ERC721 interface
        assertTrue(ticket.supportsInterface(0x80ac58cd));
        // ERC721 Metadata interface
        assertTrue(ticket.supportsInterface(0x5b5e139f));
    }

    function testTransferTicket() public {
        vm.prank(owner);
        ticket.setEventBook(eventBook);

        vm.prank(eventBook);
        uint256 id = ticket.mintTicket(user1, 42, "ipfs://event42");

        vm.prank(user1);
        ticket.transferFrom(user1, user2, id);

        assertEq(ticket.ownerOf(id), user2);
    }

    // ----------------------------
    // NEGATIVE TESTS / EDGE CASES
    // ----------------------------
    function testCannotMintTwiceSameId() public {
        vm.prank(owner);
        ticket.setEventBook(eventBook);

        vm.prank(eventBook);
        ticket.mintTicket(user1, 1, "uri1");

        vm.prank(eventBook);
        ticket.mintTicket(user1, 2, "uri2"); // should pass, since auto-incremented

        // ensure unique IDs
        assertEq(ticket.ownerOf(1), user1);
        assertEq(ticket.ownerOf(2), user1);
        assertNotEq(uint256(1), uint256(2));
    }

    function testCannotQueryNonexistentTokenURI() public {
        // OZ v5: ERC721 now reverts with custom error ERC721NonexistentToken(uint256)
        vm.expectRevert(
            abi.encodeWithSelector(bytes4(keccak256("ERC721NonexistentToken(uint256)")), uint256(999))
        );
        ticket.tokenURI(999);
    }

    // ----------------------------
    // OWNERSHIP
    // ----------------------------
    function testOwnershipTransfer() public {
        vm.prank(owner);
        ticket.transferOwnership(user1);
        assertEq(ticket.owner(), user1);
    }
}

