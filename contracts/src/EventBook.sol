// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

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

    // list of all events
    Event[] public events;

    // mapping to track who bought tickets
    // maps eventId (index in events) to a map mapping each user to boolean
    mapping(uint256 => mapping(address => bool)) public hasTicket;

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
        require(!hasTicket[eventId][msg.sender], "Already bought");
        require(msg.value == ev.price, "Incorrect payment");

        hasTicket[eventId][msg.sender] = true;
        ev.ticketsSold += 1;
        ev.revenueOwed += ev.price;
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
}

