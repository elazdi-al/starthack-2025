// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "forge-std/StdError.sol"; // for stdError.indexOOBError
import "../src/EventBook.sol";

contract EventBookTest is Test {
    EventBook book;
    address creator = address(0xCAFE);
    address buyer1  = address(0xBEEF);
    address buyer2  = address(0xFEED);
    address buyer3  = address(0xBADD);

    function setUp() public {
        book = new EventBook();
    }

    // ----------------------------
    // Event Creation
    // ----------------------------

    function testCreateEvent() public {
        uint256 date = block.timestamp + 1 days;
        vm.prank(creator);
        book.createEvent("Concert", "NYC", date, 0.1 ether, 2);

        assertEq(book.getNumberOfEvents(), 1);

        (
            string memory name,
            string memory loc,
            uint256 evDate,
            uint256 price,
            uint256 revenueOwed,
            address evCreator,
            uint256 sold,
            uint256 cap
        ) = book.events(0);

        assertEq(name, "Concert");
        assertEq(loc, "NYC");
        assertEq(evDate, date);
        assertEq(price, 0.1 ether);
        assertEq(revenueOwed, 0);
        assertEq(evCreator, creator);
        assertEq(sold, 0);
        assertEq(cap, 2);
    }

    function testCreateEvent_Overload_UnlimitedCapacity() public {
        uint256 date = block.timestamp + 2 days;
        vm.prank(creator);
        book.createEvent("Meetup", "Berlin", date, 0, 0); // explicit unlimited

        vm.prank(creator);
        book.createEvent("Hackday", "SF", date, 0.05 ether);

        assertEq(book.getNumberOfEvents(), 2);

        (, , , , , , , uint256 cap0) = book.events(0);
        (, , , , , , , uint256 cap1) = book.events(1);
        assertEq(cap0, 0);
        assertEq(cap1, 0);
    }

    function test_Revert_When_CreatingPastEvent() public {
        uint256 past = block.timestamp - 1;
        vm.prank(creator);
        vm.expectRevert("Date must be in the future");
        book.createEvent("Past", "NYC", past, 0.1 ether, 0);
    }

    // ----------------------------
    // Buying Tickets
    // ----------------------------

    function _createFutureEvent(uint256 price, uint256 cap)
        internal
        returns (uint256 eventId, uint256 date)
    {
        date = block.timestamp + 1 days;
        vm.prank(creator);
        book.createEvent("Show", "LA", date, price, cap);
        eventId = book.getNumberOfEvents() - 1;
    }

    function testBuyTicket_SetsFlag_IncrementsSold_AndRevenue() public {
        (uint256 eventId, ) = _createFutureEvent(0.1 ether, 3);

        vm.deal(buyer1, 1 ether);
        vm.prank(buyer1);
        book.buyTicket{value: 0.1 ether}(eventId);

        assertTrue(book.hasTicket(eventId, buyer1));

        (, , , , uint256 revenue, , uint256 sold, ) = book.events(eventId);
        assertEq(sold, 1);
        assertEq(revenue, 0.1 ether);
        assertEq(address(book).balance, 0.1 ether);
    }

    function test_Revert_When_BuyingWithWrongPrice() public {
        (uint256 eventId, ) = _createFutureEvent(0.2 ether, 10);

        vm.deal(buyer1, 1 ether);
        vm.prank(buyer1);
        vm.expectRevert("Incorrect payment");
        book.buyTicket{value: 0.1 ether}(eventId);
    }

    function test_Revert_When_BuyingTwice() public {
        (uint256 eventId, ) = _createFutureEvent(0.05 ether, 10);

        vm.deal(buyer1, 1 ether);
        vm.startPrank(buyer1);
        book.buyTicket{value: 0.05 ether}(eventId);
        vm.expectRevert("Already bought");
        book.buyTicket{value: 0.05 ether}(eventId);
        vm.stopPrank();
    }

    function test_Revert_When_EventFull() public {
        (uint256 eventId, ) = _createFutureEvent(0.1 ether, 2);

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
        (uint256 eventId, ) = _createFutureEvent(0, 0);

        vm.prank(buyer1);
        book.buyTicket{value: 0}(eventId);

        assertTrue(book.hasTicket(eventId, buyer1));
        (, , , , uint256 revenue, , uint256 sold, uint256 cap) = book.events(eventId);
        assertEq(sold, 1);
        assertEq(cap, 0);
        assertEq(revenue, 0);
        assertEq(address(book).balance, 0);
    }

    function test_Revert_When_BuyingAfterDate() public {
        (uint256 eventId, uint256 date) = _createFutureEvent(0.1 ether, 0);

        vm.warp(date + 1);
        vm.deal(buyer1, 1 ether);
        vm.prank(buyer1);
        vm.expectRevert("Event has passed");
        book.buyTicket{value: 0.1 ether}(eventId);
    }

    function test_Revert_When_InvalidEventId() public {
        vm.expectRevert(stdError.indexOOBError);
        book.buyTicket{value: 0}(0);
    }

    // ----------------------------
    // Withdrawals
    // ----------------------------

    function testWithdraw_OnlyCreator_AndResetsRevenueOwed() public {
        (uint256 eventId, ) = _createFutureEvent(0.1 ether, 2);

        vm.deal(buyer1, 1 ether);
        vm.prank(buyer1);
        book.buyTicket{value: 0.1 ether}(eventId);

        // Non-creator cannot withdraw
        vm.prank(buyer1);
        vm.expectRevert("Not creator");
        book.withdraw(eventId);

        // Creator can withdraw
        uint256 beforeBalance = creator.balance;
        vm.prank(creator);
        book.withdraw(eventId);

        uint256 afterBalance = creator.balance;
        assertGt(afterBalance, beforeBalance);

        (, , , , uint256 revenueAfter, , , ) = book.events(eventId);
        assertEq(revenueAfter, 0); // reset revenue owed
    }

    function testWithdraw_When_NoSales() public {
        (uint256 eventId, ) = _createFutureEvent(0.1 ether, 5);
        vm.prank(creator);
        book.withdraw(eventId);

        (, , , , uint256 revenueAfter, , , ) = book.events(eventId);
        assertEq(revenueAfter, 0);
        assertEq(address(book).balance, 0);
    }

    function testCannotOversell_AfterWithdraw() public {
        (uint256 eventId, ) = _createFutureEvent(0.1 ether, 2);

        // Fill to capacity
        vm.deal(buyer1, 1 ether);
        vm.prank(buyer1);
        book.buyTicket{value: 0.1 ether}(eventId);

        vm.deal(buyer2, 1 ether);
        vm.prank(buyer2);
        book.buyTicket{value: 0.1 ether}(eventId);

        // Withdraw funds (does NOT reset sold)
        vm.prank(creator);
        book.withdraw(eventId);

        // Now buyer3 should still be blocked
        vm.deal(buyer3, 1 ether);
        vm.prank(buyer3);
        vm.expectRevert("Event is full");
        book.buyTicket{value: 0.1 ether}(eventId);
    }
}

