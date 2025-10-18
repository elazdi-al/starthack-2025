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
        // Deploy Ticket first
        vm.prank(creator);
        ticket = new Ticket();

        // Deploy EventBook and link it
        vm.prank(creator);
        book = new EventBook(address(ticket));

        // Link Ticket to EventBook (so only EventBook can mint)
        vm.prank(creator);
        ticket.setEventBook(address(book));
    }

    // ----------------------------
    // Event Creation
    // ----------------------------

    function testCreateEvent() public {
        uint256 date = block.timestamp + 1 days;
        vm.prank(creator);
        // public event (isPrivate=false) -> locked by default
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
        assertEq(locked, true); // fixed: public events are locked by default
        assertEq(bytes(imageURI).length, 0);
    }

    function testCreateEvent_Overload_UnlimitedCapacity() public {
        uint256 date = block.timestamp + 2 days;
        vm.prank(creator);
        book.createEvent("Meetup", "Berlin", date, 0, 0, false);

        vm.prank(creator);
        book.createEvent("Hackday", "SF", date, 0.05 ether, 0);

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
    // Helpers
    // ----------------------------

    function _createEvent(uint256 price, uint256 cap, bool isPrivate)
        internal
        returns (uint256 eventId, uint256 date)
    {
        date = block.timestamp + 1 days;
        vm.prank(creator);
        book.createEvent("Show", "LA", date, price, cap, isPrivate);
        eventId = book.getNumberOfEvents() - 1;
    }

    /// Creates an event and ensures it's locked (if private, we lock it manually).
    function _createLockedEvent(uint256 price, uint256 cap, bool isPrivate)
        internal
        returns (uint256 eventId, uint256 date)
    {
        (eventId, date) = _createEvent(price, cap, isPrivate);
        if (isPrivate) {
            vm.prank(creator);
            book.lockWhitelist(eventId);
        }
    }

    /// Shortcut for creating a locked *public* event
    function _createLockedEvent(uint256 price, uint256 cap)
        internal
        returns (uint256 eventId, uint256 date)
    {
        (eventId, date) = _createLockedEvent(price, cap, false);
    }

    // ----------------------------
    // Buying Tickets
    // ----------------------------

    function testBuyTicket_SetsFlag_IncrementsSold_AndRevenue() public {
        (uint256 eventId, ) = _createLockedEvent(0.1 ether, 3);

        vm.deal(buyer1, 1 ether);
        vm.prank(buyer1);
        book.buyTicket{value: 0.1 ether}(eventId);

        (, , , , uint256 revenue, , uint256 sold, , , , ) = book.events(eventId);
        assertEq(sold, 1);
        assertEq(revenue, 0.1 ether);
        assertEq(address(book).balance, 0.1 ether);

        assertEq(ticket.ownerOf(1), buyer1);
        assertEq(ticket.ticketToEvent(1), eventId);
    }

    function test_Revert_When_BuyingWithoutLockedWhitelist() public {
        // private event starts unlocked
        (uint256 eventId, ) = _createEvent(0.1 ether, 3, true);

        vm.deal(buyer1, 1 ether);
        vm.prank(buyer1);
        vm.expectRevert("Whitelist is not locked");
        book.buyTicket{value: 0.1 ether}(eventId);
    }

    function test_Revert_When_BuyingWithWrongPrice() public {
        (uint256 eventId, ) = _createLockedEvent(0.2 ether, 10);

        vm.deal(buyer1, 1 ether);
        vm.prank(buyer1);
        vm.expectRevert("Incorrect payment");
        book.buyTicket{value: 0.1 ether}(eventId);
    }

    function test_Revert_When_EventFull() public {
        (uint256 eventId, ) = _createLockedEvent(0.1 ether, 2);

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

    function testBuy_FreeEvent_ZeroPrice() public {
        (uint256 eventId, ) = _createLockedEvent(0, 0);

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
        (uint256 eventId, uint256 date) = _createLockedEvent(0.1 ether, 0);

        vm.warp(date + 1);
        vm.deal(buyer1, 1 ether);
        vm.prank(buyer1);
        vm.expectRevert("Event has passed");
        book.buyTicket{value: 0.1 ether}(eventId);
    }

    // ----------------------------
    // Check-in Functionality
    // ----------------------------

    function testCheckInTicket() public {
        (uint256 eventId, uint256 date) = _createLockedEvent(0.1 ether, 1);

        // Buyer buys ticket
        vm.deal(buyer1, 1 ether);
        vm.prank(buyer1);
        book.buyTicket{value: 0.1 ether}(eventId);

        uint256 tokenId = 1;

        // Can't check in before event starts
        vm.expectRevert("Event has not started");
        vm.prank(creator);
        book.checkInTicket(tokenId);

        // Fast-forward time to event date
        vm.warp(date);

        // Now creator can check in
        vm.prank(creator);
        book.checkInTicket(tokenId);
    }

    // ----------------------------
    // Withdrawals
    // ----------------------------

    function testWithdraw_OnlyCreator_AndResetsRevenueOwed() public {
        (uint256 eventId, ) = _createLockedEvent(0.1 ether, 2);

        vm.deal(buyer1, 1 ether);
        vm.prank(buyer1);
        book.buyTicket{value: 0.1 ether}(eventId);

        vm.prank(buyer1);
        vm.expectRevert("Not creator");
        book.withdraw(eventId);

        uint256 beforeBalance = creator.balance;
        vm.prank(creator);
        book.withdraw(eventId);
        uint256 afterBalance = creator.balance;

        assertGt(afterBalance, beforeBalance);
        (, , , , uint256 revenueAfter, , , , , , ) = book.events(eventId);
        assertEq(revenueAfter, 0);
    }

    function testWithdraw_When_NoSales() public {
        (uint256 eventId, ) = _createLockedEvent(0.1 ether, 5);
        vm.prank(creator);
        book.withdraw(eventId);

        (, , , , uint256 revenueAfter, , , , , , ) = book.events(eventId);
        assertEq(revenueAfter, 0);
        assertEq(address(book).balance, 0);
    }
}

