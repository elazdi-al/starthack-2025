// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "forge-std/StdError.sol";
import "../src/EventBook.sol";
import "../src/Ticket.sol";

contract EventBookTest is Test {
    EventBook book;
    Ticket ticket;

    address creator = makeAddr("creator");
    address buyer1  = makeAddr("buyer1");
    address buyer2  = makeAddr("buyer2");
    address buyer3  = makeAddr("buyer3");

    function setUp() public {
        // Deploy Ticket first (owned by `creator`)
        vm.prank(creator);
        ticket = new Ticket();

        // Deploy EventBook and link it
        vm.prank(creator);
        book = new EventBook(address(ticket));

        // Link Ticket to EventBook (so only EventBook can mint & check-in)
        vm.prank(creator);
        ticket.setEventBook(address(book));
    }

    // ----------------------------
    // EVENT CREATION
    // ----------------------------

    function testCreateEvent() public {
        uint256 date = block.timestamp + 1 days;

        vm.prank(creator);
        book.createEvent("Concert", "NYC", date, 0.1 ether, 2, false);

        assertEq(book.getNumberOfEvents(), 1);

        (
            string memory name,
            string memory loc,
            uint256 evDate,
            uint256 price,
            uint256 revenueOwed,
            address evCreator,
            uint256 sold,
            uint256 cap,
            string memory imageURI,
            bool isPrivate,
            bool locked
        ) = book.events(0);

        assertEq(name, "Concert");
        assertEq(loc, "NYC");
        assertEq(evDate, date);
        assertEq(price, 0.1 ether);
        assertEq(revenueOwed, 0);
        assertEq(evCreator, creator);
        assertEq(sold, 0);
        assertEq(cap, 2);
        assertEq(isPrivate, false);
        assertEq(locked, false);
        assertEq(bytes(imageURI).length, 0);
    }

    function testCreateEvent_Overload_UnlimitedCapacity() public {
        uint256 date = block.timestamp + 2 days;

        vm.prank(creator);
        book.createEvent("Meetup", "Berlin", date, 0, 0, false); // full signature

        vm.prank(creator);
        book.createEvent("Hackday", "SF", date, 0.05 ether, 0); // 5-arg overload

        assertEq(book.getNumberOfEvents(), 2);

        (, , , , , , , uint256 cap0, , , ) = book.events(0);
        (, , , , , , , uint256 cap1, , , ) = book.events(1);
        assertEq(cap0, 0);
        assertEq(cap1, 0);
    }

    function test_Revert_When_CreatingPastEvent() public {
        uint256 past = block.timestamp - 1;

        vm.prank(creator);
        vm.expectRevert("Date must be in the future");
        book.createEvent("Past", "NYC", past, 0.1 ether, 0, false);
    }

    // ----------------------------
    // HELPERS
    // ----------------------------

    function _createUnlockedPublicEvent(uint256 price, uint256 cap)
        internal
        returns (uint256 eventId, uint256 date)
    {
        date = block.timestamp + 1 days;
        vm.prank(creator);
        book.createEvent("Show", "LA", date, price, cap, false); // public
        eventId = book.getNumberOfEvents() - 1;
    }

    function _createAndLockPublicEvent(uint256 price, uint256 cap)
        internal
        returns (uint256 eventId, uint256 date)
    {
        (eventId, date) = _createUnlockedPublicEvent(price, cap);
        vm.prank(creator);
        book.lockWhitelist(eventId);
    }

    function _createAndLockPrivateEvent(uint256 price, uint256 cap)
        internal
        returns (uint256 eventId, uint256 date)
    {
        date = block.timestamp + 1 days;
        vm.prank(creator);
        book.createEvent("Private", "Paris", date, price, cap, true); // private
        eventId = book.getNumberOfEvents() - 1;

        // whitelist + lock
        vm.prank(creator);
        book.addToWhitelist(eventId, buyer1);

        vm.prank(creator);
        book.lockWhitelist(eventId);
    }

    // ----------------------------
    // WHITELIST
    // ----------------------------

    function testWhitelist_AddRemoveLock() public {
        (uint256 eventId, ) = _createUnlockedPublicEvent(0.1 ether, 3);

        // Add user
        vm.prank(creator);
        book.addToWhitelist(eventId, buyer1);
        assertTrue(book.isWhitelisted(eventId, buyer1));

        // Remove user
        vm.prank(creator);
        book.removeFromWhitelist(eventId, buyer1);
        assertFalse(book.isWhitelisted(eventId, buyer1));

        // Batch add
        address[] memory users = new address[](2);
        users[0] = buyer1;
        users[1] = buyer2;

        vm.prank(creator);
        book.addBatchToWhitelist(eventId, users);
        assertTrue(book.isWhitelisted(eventId, buyer1));
        assertTrue(book.isWhitelisted(eventId, buyer2));

        // Lock whitelist
        vm.prank(creator);
        book.lockWhitelist(eventId);

        // After locking, modification should revert
        vm.prank(creator);
        vm.expectRevert("Whitelist is locked");
        book.addToWhitelist(eventId, buyer3);
    }

    // ----------------------------
    // BUYING TICKETS (PUBLIC)
    // ----------------------------

    function testBuyTicket_SetsCounts_AndETH_InPublicEvent() public {
        (uint256 eventId, ) = _createAndLockPublicEvent(0.1 ether, 3);

        vm.deal(buyer1, 1 ether);
        vm.prank(buyer1);
        book.buyTicket{value: 0.1 ether}(eventId);

        (, , , , uint256 revenue, , uint256 sold, , , , ) = book.events(eventId);
        assertEq(sold, 1);
        assertEq(revenue, 0.1 ether);
        assertEq(address(book).balance, 0.1 ether);

        // NFT minted & linked
        assertEq(ticket.ownerOf(1), buyer1);
        assertEq(ticket.ticketToEvent(1), eventId);
    }

    function test_Revert_When_BuyingWithoutLockedWhitelist() public {
        (uint256 eventId, ) = _createUnlockedPublicEvent(0.1 ether, 3);

        vm.deal(buyer1, 1 ether);
        vm.prank(buyer1);
        vm.expectRevert("Whitelist is not locked");
        book.buyTicket{value: 0.1 ether}(eventId);
    }

    function test_Revert_When_BuyingWithWrongPrice() public {
        (uint256 eventId, ) = _createAndLockPublicEvent(0.2 ether, 10);

        vm.deal(buyer1, 1 ether);
        vm.prank(buyer1);
        vm.expectRevert("Incorrect payment");
        book.buyTicket{value: 0.1 ether}(eventId);
    }

    function test_Revert_When_EventFull() public {
        (uint256 eventId, ) = _createAndLockPublicEvent(0.1 ether, 2);

        vm.deal(buyer1, 1 ether);
        vm.prank(buyer1);
        book.buyTicket{value: 0.1 ether}(eventId);

        vm.deal(buyer2, 1 ether);
        vm.prank(buyer2);
        book.buyTicket{value: 0.1 ether}(eventId);

        vm.deal(buyer3, 1 ether);
        vm.prank(buyer3);
        vm.expectRevert("Event is full");
        book.buyTicket{value: 0.1 ether}(eventId);
    }

    function testBuy_FreeEvent_Public_ZeroPrice() public {
        (uint256 eventId, ) = _createAndLockPublicEvent(0, 0);

        vm.prank(buyer1);
        book.buyTicket{value: 0}(eventId);

        (, , , , uint256 revenue, , uint256 sold, uint256 cap, , , ) = book.events(eventId);
        assertEq(sold, 1);
        assertEq(cap, 0);
        assertEq(revenue, 0);
        assertEq(address(book).balance, 0);
        assertEq(ticket.ownerOf(1), buyer1);
    }

    function test_Revert_When_BuyingAfterDate() public {
        (uint256 eventId, uint256 date) = _createAndLockPublicEvent(0.1 ether, 0);

        vm.warp(date + 1);
        vm.deal(buyer1, 1 ether);
        vm.prank(buyer1);
        vm.expectRevert("Event has passed");
        book.buyTicket{value: 0.1 ether}(eventId);
    }

    function test_Revert_When_InvalidEventId() public {
        // Calling with 0 when there are no events causes an index OOB (panic 0x32)
        vm.expectRevert(stdError.indexOOBError);
        book.buyTicket{value: 0}(0);
    }

    // ----------------------------
    // BUYING TICKETS (PRIVATE)
    // ----------------------------

    function testPrivateEvent_WhitelistRequired() public {
        (uint256 eventId, ) = _createAndLockPrivateEvent(0.25 ether, 10);

        // buyer2 not whitelisted
        vm.deal(buyer2, 1 ether);
        vm.prank(buyer2);
        vm.expectRevert("Not whitelisted for this event");
        book.buyTicket{value: 0.25 ether}(eventId);

        // buyer1 whitelisted
        vm.deal(buyer1, 1 ether);
        vm.prank(buyer1);
        book.buyTicket{value: 0.25 ether}(eventId);

        assertEq(ticket.ownerOf(1), buyer1);
    }

    // ----------------------------
    // CHECK-IN
    // ----------------------------

    function testCheckInTicket() public {
        (uint256 eventId, uint256 date) = _createAndLockPublicEvent(0.1 ether, 1);

        vm.deal(buyer1, 1 ether);
        vm.prank(buyer1);
        book.buyTicket{value: 0.1 ether}(eventId);
        uint256 tokenId = 1;

        // Cannot check in before start
        vm.expectRevert("Event has not started");
        vm.prank(creator);
        book.checkInTicket(tokenId);

        // At start, creator can check-in
        vm.warp(date);
        vm.prank(creator);
        book.checkInTicket(tokenId);

        // Ticket contract should reflect check-in
        assertTrue(ticket.isCheckedIn(tokenId));
    }

    // ----------------------------
    // WITHDRAWALS
    // ----------------------------

    function testWithdraw_OnlyCreator_AndResetsRevenueOwed() public {
        (uint256 eventId, ) = _createAndLockPublicEvent(0.1 ether, 2);

        vm.deal(buyer1, 1 ether);
        vm.prank(buyer1);
        book.buyTicket{value: 0.1 ether}(eventId);

        // Non-creator cannot withdraw
        vm.prank(buyer1);
        vm.expectRevert("Not creator");
        book.withdraw(eventId);

        // Creator withdraws
        uint256 beforeBalance = creator.balance;
        vm.prank(creator);
        book.withdraw(eventId);
        uint256 afterBalance = creator.balance;

        assertGt(afterBalance, beforeBalance);

        (, , , , uint256 revenueAfter, , , , , , ) = book.events(eventId);
        assertEq(revenueAfter, 0); // reset revenue owed
    }

    function testWithdraw_When_NoSales() public {
        (uint256 eventId, ) = _createAndLockPublicEvent(0.1 ether, 5);

        vm.prank(creator);
        book.withdraw(eventId);

        (, , , , uint256 revenueAfter, , , , , , ) = book.events(eventId);
        assertEq(revenueAfter, 0);
        assertEq(address(book).balance, 0);
    }

    // ----------------------------
    // MARKETPLACE
    // ----------------------------

    function testMarketplace_ListBuy_Cancels() public {
        (uint256 eventId, ) = _createAndLockPublicEvent(0.1 ether, 2);

        // Buyer1 buys a primary ticket
        vm.deal(buyer1, 1 ether);
        vm.prank(buyer1);
        book.buyTicket{value: 0.1 ether}(eventId);
        uint256 tokenId = 1;

        // Approve EventBook to transfer this ticket
        vm.prank(buyer1);
        ticket.approve(address(book), tokenId);

        // List ticket for sale at 0.15 ETH (<= 2x price)
        vm.prank(buyer1);
        book.listTicketForSale(tokenId, 0.15 ether);
        assertTrue(book.isListedForSale(tokenId));

        // Buyer2 purchases the ticket
        vm.deal(buyer2, 1 ether);
        vm.prank(buyer2);
        book.buyResaleTicket{value: 0.15 ether}(tokenId);

        // Ownership transferred to buyer2
        assertEq(ticket.ownerOf(tokenId), buyer2);
        assertFalse(book.isListedForSale(tokenId)); // listing inactive

        // Buyer2 can list then cancel
        vm.prank(buyer2);
        ticket.approve(address(book), tokenId);

        vm.prank(buyer2);
        book.listTicketForSale(tokenId, 0.12 ether);
        assertTrue(book.isListedForSale(tokenId));

        vm.prank(buyer2);
        book.cancelListing(tokenId);
        assertFalse(book.isListedForSale(tokenId));
    }
}

