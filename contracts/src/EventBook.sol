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
    function checkIn(uint256 tokenId) external;
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
        string imageURI;
        string[] categories; // Event categories for badge tracking
        bool isPrivate;
        bool whitelistIsLocked; // whether is the whitelist has been set already or not
    }

    struct LeaderboardEntry {
        address user;
        uint256 monthlyEvents;
    }

    // event => (user => isWhitelisted)
    mapping(uint256 => mapping(address => bool)) public isWhitelisted;

    // Triple mapping: user -> category -> events joined count
    mapping(address => mapping(string => uint256)) public userCategoryCount;

    // User -> total events joined (all time)
    mapping(address => uint256) public userTotalEvents;

    // User -> events joined this month
    mapping(address => uint256) public userMonthlyEvents;

    // User -> last activity timestamp (for virtual monthly reset)
    mapping(address => uint256) public userLastActivity;

    // Constant for month duration (30 days in seconds)
    uint256 private constant MONTH_DURATION = 30 days;

    // Fixed top 10 leaderboard - exactly 10 slots, always sorted
    LeaderboardEntry[10] private topTen;

    // Track if user is in top 10 and their position
    mapping(address => uint256) private topTenPosition; // 0 = not in top 10, 1-10 = position
    mapping(address => bool) private isInTopTen;

    struct Listing {
        address seller;
        uint256 ticketId;
        uint256 price;
        bool active;
    }

    // list of all events
    Event[] public events;

    IEventTicket public ticketContract;

    mapping(uint256 => Listing) public listings;

    mapping(address => uint256[]) public userTickets;

    // Array to track all listed ticket IDs for pagination
    uint256[] private listedTicketIds;

    // ticket purchased from the event directly
    event TicketPurchased(address indexed buyer, uint256 indexed eventId, uint256 ticketId, uint256 price);

    // ticket listed/sold on the marketplace (between users)
    event TicketListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event TicketSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price);
    event ListingCancelled(uint256 indexed tokenId, address indexed seller);

    constructor(address _ticketContractAddress) {
        ticketContract = IEventTicket(_ticketContractAddress);

        // Initialize top 10 with empty entries
        for (uint256 i = 0; i < 10; i++) {
            topTen[i] = LeaderboardEntry(address(0), 0);
        }
    }

    modifier onlyEventCreator(uint256 eventId) {
        require(events[eventId].creator == msg.sender, "Only creator can call this");
        _;
    }

    modifier onlyWhitelistNotLocked(uint256 eventId) {
        require(!events[eventId].whitelistIsLocked, "Whitelist is locked");
        _;
    }

    modifier onlyWhitelistLocked(uint256 eventId) {
        require(events[eventId].whitelistIsLocked, "Whitelist is not locked");
        _;
    }

    // anyone can create an event
    function createEvent(
        string memory name,
        string memory location,
        uint256 date,
        uint256 price,
        uint256 maxCapacity,
        string memory imageURI,
        string[] memory categories,
        bool isPrivate
    ) public {
        require(date > block.timestamp, "Date must be in the future");
        require(categories.length <= 5, "Maximum 5 categories allowed");

        events.push(Event({
            name: name,
            location: location,
            date: date,
            price: price,
            revenueOwed: 0,
            creator: msg.sender,
            ticketsSold: 0,
            maxCapacity: maxCapacity,
            imageURI: imageURI,
            categories: categories,
            isPrivate: isPrivate,
            whitelistIsLocked: !isPrivate // unlock if it is private
        }));
    }

    // Overloaded versions for backwards compatibility
    function createEvent(
        string memory name,
        string memory location,
        uint256 date,
        uint256 price,
        uint256 maxCapacity,
        string memory imageURI,
        string[] memory categories
    ) public {
        createEvent(name, location, date, price, maxCapacity, imageURI, categories, false);
    }

    function createEvent(
        string memory name,
        string memory location,
        uint256 date,
        uint256 price,
        uint256 maxCapacity,
        string memory imageURI
    ) public {
        string[] memory emptyCategories = new string[](0);
        createEvent(name, location, date, price, maxCapacity, imageURI, emptyCategories, false);
    }

    function createEvent(
        string memory name,
        string memory location,
        uint256 date,
        uint256 price,
        uint256 maxCapacity
    ) public {
        string[] memory emptyCategories = new string[](0);
        createEvent(name, location, date, price, maxCapacity, "", emptyCategories, false);
    }

    function createEvent(
        string memory name,
        string memory location,
        uint256 date,
        uint256 price
    ) public {
        string[] memory emptyCategories = new string[](0);
        createEvent(name, location, date, price, 0, "", emptyCategories, false);
    }

    function addToWhitelist(uint256 eventId, address user)
    public
    onlyEventCreator(eventId)
    onlyWhitelistNotLocked(eventId)
    {
        isWhitelisted[eventId][user] = true;
    }

    function removeFromWhitelist(uint256 eventId, address user)
    public
    onlyEventCreator(eventId)
    onlyWhitelistNotLocked(eventId)
    {
        isWhitelisted[eventId][user] = false;
    }

    function addBatchToWhitelist(uint256 eventId, address[] calldata users)
    public
    onlyEventCreator(eventId)
    onlyWhitelistNotLocked(eventId)
    {
        for (uint256 i = 0; i < users.length; i++) {
            isWhitelisted[eventId][users[i]] = true;
        }
    }

    function lockWhitelist(uint256 eventId)
    public
    onlyEventCreator(eventId)
    onlyWhitelistNotLocked(eventId)
    {
        Event storage ev = events[eventId];
        ev.whitelistIsLocked = true;
    }

    function buyTicket(uint256 eventId)
    public
    payable
    onlyWhitelistLocked(eventId)
    {
        Event storage ev = events[eventId];

        if (ev.isPrivate) require(isWhitelisted[eventId][msg.sender], "Not whitelisted for this event");
        require(block.timestamp < ev.date, "Event has passed");
        if (ev.maxCapacity > 0) require(ev.ticketsSold < ev.maxCapacity, "Event is full");
        require(msg.value == ev.price, "Incorrect payment");

        ev.ticketsSold += 1;
        ev.revenueOwed += msg.value;

        // mint the ticket
        string memory tempTokenURI = ""; // TODO: Replace with real metadata URI
        uint256 newTicketId = ticketContract.mintTicket(msg.sender, eventId, tempTokenURI);
        userTickets[msg.sender].push(newTicketId);

        // Update user participation tracking
        _updateUserParticipation(msg.sender, ev.categories);

        emit TicketPurchased(msg.sender, eventId, newTicketId, msg.value);
    }

    function checkInTicket(uint256 tokenId) public {
        // 1. Get the eventId this ticket belongs to
        uint256 eventId = ticketContract.ticketToEvent(tokenId);
        Event storage ev = events[eventId];

        // 2. Only the event creator can check-in tickets for their event
        require(msg.sender == ev.creator, "Not creator");

        // 3. Ensure the event is happening now (optional but good)
        require(block.timestamp >= ev.date, "Event has not started");

        // 4. Call the Ticket contract to update its state
        // We need to add 'checkIn(uint256)' to your IEventTicket interface
        ticketContract.checkIn(tokenId);
    }

    // helper function to get total number of evts
    function getNumberOfEvents() public view returns (uint256) {
        return events.length;
    }

    /**
     * @dev Get a single event by ID with all fields including categories
     * This is needed because the auto-generated getter for public mappings
     * doesn't support returning dynamic arrays (string[])
     */
    function getEvent(uint256 eventId) public view returns (
        string memory name,
        string memory location,
        uint256 date,
        uint256 price,
        uint256 revenueOwed,
        address creator,
        uint256 ticketsSold,
        uint256 maxCapacity,
        string memory imageURI,
        string[] memory categories,
        bool isPrivate,
        bool whitelistIsLocked
    ) {
        require(eventId < events.length, "Event does not exist");
        Event storage ev = events[eventId];
        return (
            ev.name,
            ev.location,
            ev.date,
            ev.price,
            ev.revenueOwed,
            ev.creator,
            ev.ticketsSold,
            ev.maxCapacity,
            ev.imageURI,
            ev.categories,
            ev.isPrivate,
            ev.whitelistIsLocked
        );
    }

    /**
     * @dev Get paginated events with optional search and category filter
     * @param offset Starting index
     * @param limit Number of events to return (max 50)
     * @param searchQuery Optional search query (searches in name and location, case-insensitive)
     * @param categoryFilter Optional category filter (searches in event categories, case-insensitive)
     * @param onlyUpcoming If true, only return events that haven't passed yet
     * @return eventIds Array of event IDs
     * @return names Array of event names
     * @return locations Array of event locations
     * @return dates Array of event dates
     * @return prices Array of event prices
     * @return creators Array of event creator addresses
     * @return ticketsSoldArray Array of tickets sold counts
     * @return maxCapacities Array of max capacity limits
     * @return imageURIs Array of image URIs
     * @return categoriesArray Array of category arrays (flattened as comma-separated strings for simplicity)
     * @return isPrivateArray Array of isPrivate flags
     * @return total Total number of events matching the criteria
     */
    function getEvents(
        uint256 offset,
        uint256 limit,
        string memory searchQuery,
        string memory categoryFilter,
        bool onlyUpcoming
    )
        public
        view
        returns (
            uint256[] memory eventIds,
            string[] memory names,
            string[] memory locations,
            uint256[] memory dates,
            uint256[] memory prices,
            address[] memory creators,
            uint256[] memory ticketsSoldArray,
            uint256[] memory maxCapacities,
            string[] memory imageURIs,
            string[] memory categoriesArray,
            bool[] memory isPrivateArray,
            uint256 total
        )
    {
        require(limit > 0 && limit <= 50, "Limit must be 1-50");

        bytes memory searchBytes = bytes(searchQuery);
        bool hasSearch = searchBytes.length > 0;
        bytes memory categoryBytes = bytes(categoryFilter);
        bool hasCategory = categoryBytes.length > 0;

        // First pass: count matching events
        total = _countMatchingEvents(searchQuery, categoryFilter, onlyUpcoming, hasSearch, hasCategory);

        // Return empty arrays if offset is beyond available events
        if (offset >= total) {
            return (
                new uint256[](0),
                new string[](0),
                new string[](0),
                new uint256[](0),
                new uint256[](0),
                new address[](0),
                new uint256[](0),
                new uint256[](0),
                new string[](0),
                new string[](0),
                new bool[](0),
                total
            );
        }

        // Calculate result count
        uint256 resultCount = limit;
        if (offset + limit > total) {
            resultCount = total - offset;
        }

        // Initialize result arrays
        eventIds = new uint256[](resultCount);
        names = new string[](resultCount);
        locations = new string[](resultCount);
        dates = new uint256[](resultCount);
        prices = new uint256[](resultCount);
        creators = new address[](resultCount);
        ticketsSoldArray = new uint256[](resultCount);
        maxCapacities = new uint256[](resultCount);
        imageURIs = new string[](resultCount);
        categoriesArray = new string[](resultCount);
        isPrivateArray = new bool[](resultCount);

        // Second pass: collect matching events
        _collectMatchingEvents(
            offset,
            resultCount,
            searchQuery,
            categoryFilter,
            onlyUpcoming,
            hasSearch,
            hasCategory,
            eventIds,
            names,
            locations,
            dates,
            prices,
            creators,
            ticketsSoldArray,
            maxCapacities,
            imageURIs,
            categoriesArray,
            isPrivateArray
        );
    }

    /**
     * @dev Internal helper to count matching events
     */
    function _countMatchingEvents(
        string memory searchQuery,
        string memory categoryFilter,
        bool onlyUpcoming,
        bool hasSearch,
        bool hasCategory
    ) private view returns (uint256 count) {
        for (uint256 i = 0; i < events.length; i++) {
            if (_eventMatches(events[i], searchQuery, categoryFilter, onlyUpcoming, hasSearch, hasCategory)) {
                count++;
            }
        }
    }

    /**
     * @dev Internal helper to collect matching events
     */
    function _collectMatchingEvents(
        uint256 offset,
        uint256 resultCount,
        string memory searchQuery,
        string memory categoryFilter,
        bool onlyUpcoming,
        bool hasSearch,
        bool hasCategory,
        uint256[] memory eventIds,
        string[] memory names,
        string[] memory locations,
        uint256[] memory dates,
        uint256[] memory prices,
        address[] memory creators,
        uint256[] memory ticketsSoldArray,
        uint256[] memory maxCapacities,
        string[] memory imageURIs,
        string[] memory categoriesArray,
        bool[] memory isPrivateArray
    ) private view {
        uint256 currentIndex = 0;
        uint256 resultIndex = 0;

        for (uint256 i = 0; i < events.length && resultIndex < resultCount; i++) {
            if (_eventMatches(events[i], searchQuery, categoryFilter, onlyUpcoming, hasSearch, hasCategory)) {
                if (currentIndex >= offset) {
                    eventIds[resultIndex] = i;
                    names[resultIndex] = events[i].name;
                    locations[resultIndex] = events[i].location;
                    dates[resultIndex] = events[i].date;
                    prices[resultIndex] = events[i].price;
                    creators[resultIndex] = events[i].creator;
                    ticketsSoldArray[resultIndex] = events[i].ticketsSold;
                    maxCapacities[resultIndex] = events[i].maxCapacity;
                    imageURIs[resultIndex] = events[i].imageURI;
                    categoriesArray[resultIndex] = _joinCategories(events[i].categories);
                    isPrivateArray[resultIndex] = events[i].isPrivate;
                    resultIndex++;
                }
                currentIndex++;
            }
        }
    }

    /**
     * @dev Helper function to join category array into comma-separated string
     */
    function _joinCategories(string[] memory categories) private pure returns (string memory) {
        if (categories.length == 0) {
            return "";
        }

        if (categories.length == 1) {
            return categories[0];
        }

        bytes memory result = bytes(categories[0]);
        for (uint256 i = 1; i < categories.length; i++) {
            result = abi.encodePacked(result, ",", categories[i]);
        }
        return string(result);
    }

    /**
     * @dev Check if an event matches the search criteria
     */
    function _eventMatches(
        Event storage ev,
        string memory searchQuery,
        string memory categoryFilter,
        bool onlyUpcoming,
        bool hasSearch,
        bool hasCategory
    ) private view returns (bool) {
        // Check if event is upcoming if required
        if (onlyUpcoming && block.timestamp >= ev.date) {
            return false;
        }

        // Check category filter first (if specified)
        if (hasCategory) {
            bool categoryMatch = false;
            for (uint256 i = 0; i < ev.categories.length; i++) {
                if (_containsIgnoreCase(ev.categories[i], categoryFilter)) {
                    categoryMatch = true;
                    break;
                }
            }
            if (!categoryMatch) {
                return false;
            }
        }

        // If no search query, match all (that pass upcoming and category filters)
        if (!hasSearch) {
            return true;
        }

        // Check if search query matches name or location (case-insensitive)
        return _containsIgnoreCase(ev.name, searchQuery) || _containsIgnoreCase(ev.location, searchQuery);
    }

    /**
     * @dev Case-insensitive substring search
     * Note: This converts to lowercase by checking ASCII ranges
     */
    function _containsIgnoreCase(string memory source, string memory query) private pure returns (bool) {
        bytes memory sourceBytes = bytes(source);
        bytes memory queryBytes = bytes(query);

        if (queryBytes.length == 0) return true;
        if (sourceBytes.length < queryBytes.length) return false;

        // Try to find query in source
        for (uint256 i = 0; i <= sourceBytes.length - queryBytes.length; i++) {
            bool found = true;
            for (uint256 j = 0; j < queryBytes.length; j++) {
                if (_toLower(sourceBytes[i + j]) != _toLower(queryBytes[j])) {
                    found = false;
                    break;
                }
            }
            if (found) return true;
        }
        return false;
    }

    /**
     * @dev Convert a byte to lowercase if it's an uppercase letter
     */
    function _toLower(bytes1 char) private pure returns (bytes1) {
        if (char >= 0x41 && char <= 0x5A) {
            // A-Z to a-z
            return bytes1(uint8(char) + 32);
        }
        return char;
    }

    /**
     * @dev Update user participation tracking when they buy a ticket
     * @param user The user address
     * @param categories The event categories
     */
    function _updateUserParticipation(address user, string[] memory categories) private {
        // Virtual monthly reset based on user's last activity
        uint256 currentMonth = block.timestamp / MONTH_DURATION;
        uint256 userMonth = userLastActivity[user] / MONTH_DURATION;

        // If user hasn't participated this month, reset their monthly count
        if (currentMonth > userMonth) {
            userMonthlyEvents[user] = 0;
            // Remove from top 10 if they were in it (their count is now 0)
            if (isInTopTen[user]) {
                _removeFromTopTen(user);
            }
        }

        // Update category counts
        for (uint256 i = 0; i < categories.length; i++) {
            if (bytes(categories[i]).length > 0) {
                userCategoryCount[user][categories[i]] += 1;
            }
        }

        // Update total and monthly counters
        userTotalEvents[user] += 1;
        userMonthlyEvents[user] += 1;
        userLastActivity[user] = block.timestamp;

        // Update top 10 leaderboard
        _updateTopTen(user, userMonthlyEvents[user]);
    }


    /**
     * @dev Update top 10 leaderboard when user's count changes
     * @param user The user address
     * @param newCount The user's new monthly event count
     */
    function _updateTopTen(address user, uint256 newCount) private {
        // Check if user is already in top 10
        if (isInTopTen[user]) {
            // Update their count and re-sort if needed
            uint256 position = topTenPosition[user] - 1; // Convert to 0-based index
            topTen[position].monthlyEvents = newCount;
            _sortTopTen();
        } else {
            // Check if user's count beats the 10th place (last entry)
            if (newCount > topTen[9].monthlyEvents || topTen[9].user == address(0)) {
                // Remove 10th place user if exists
                if (topTen[9].user != address(0)) {
                    isInTopTen[topTen[9].user] = false;
                    topTenPosition[topTen[9].user] = 0;
                }

                // Add new user at position 10
                topTen[9] = LeaderboardEntry(user, newCount);
                isInTopTen[user] = true;
                topTenPosition[user] = 10;

                // Re-sort to find correct position
                _sortTopTen();
            }
        }
    }

    /**
     * @dev Remove user from top 10 (e.g., when their monthly count resets to 0)
     * @param user The user address to remove
     */
    function _removeFromTopTen(address user) private {
        if (!isInTopTen[user]) return;

        uint256 position = topTenPosition[user] - 1; // Convert to 0-based index

        // Shift all entries after this position down
        for (uint256 i = position; i < 9; i++) {
            topTen[i] = topTen[i + 1];
            if (topTen[i].user != address(0)) {
                topTenPosition[topTen[i].user] = i + 1;
            }
        }

        // Clear the last slot
        topTen[9] = LeaderboardEntry(address(0), 0);

        // Update removed user's tracking
        isInTopTen[user] = false;
        topTenPosition[user] = 0;
    }

    /**
     * @dev Sort top 10 array in descending order by monthlyEvents
     * Uses insertion sort which is efficient for small, nearly-sorted arrays
     */
    function _sortTopTen() private {
        for (uint256 i = 1; i < 10; i++) {
            LeaderboardEntry memory key = topTen[i];
            uint256 j = i;

            // Move elements greater than key one position ahead
            while (j > 0 && topTen[j - 1].monthlyEvents < key.monthlyEvents) {
                topTen[j] = topTen[j - 1];
                if (topTen[j].user != address(0)) {
                    topTenPosition[topTen[j].user] = j + 1;
                }
                j--;
            }

            topTen[j] = key;
            if (key.user != address(0)) {
                topTenPosition[key.user] = j + 1;
            }
        }
    }

    /**
     * @dev Get top 10 leaderboard (always returns exactly 10 entries)
     * Empty slots have address(0) and count of 0
     * @param limit Maximum number of users to return (capped at 10)
     * @return users Array of user addresses
     * @return eventCounts Array of event counts for each user
     * @return total Always returns 10 (the fixed size)
     */
    function getLeaderboard(uint256 limit)
        public
        view
        returns (
            address[] memory users,
            uint256[] memory eventCounts,
            uint256 total
        )
    {
        require(limit > 0 && limit <= 10, "Limit must be 1-10");

        total = 10; // Always exactly 10 slots
        uint256 resultCount = limit;

        users = new address[](resultCount);
        eventCounts = new uint256[](resultCount);

        for (uint256 i = 0; i < resultCount; i++) {
            users[i] = topTen[i].user;
            eventCounts[i] = topTen[i].monthlyEvents;
        }
    }

    /**
     * @dev Get user's category statistics
     * @param user The user address
     * @param categories Array of categories to check
     * @return counts Array of event counts per category
     */
    function getUserCategoryStats(address user, string[] memory categories)
        public
        view
        returns (uint256[] memory counts)
    {
        counts = new uint256[](categories.length);
        for (uint256 i = 0; i < categories.length; i++) {
            counts[i] = userCategoryCount[user][categories[i]];
        }
    }

    /**
     * @dev Get user's overall statistics
     * @param user The user address
     * @return totalEvents Total events joined (all time)
     * @return monthlyEvents Events joined this month (with virtual reset applied)
     */
    function getUserStats(address user)
        public
        view
        returns (uint256 totalEvents, uint256 monthlyEvents)
    {
        return (userTotalEvents[user], _getCurrentMonthlyEvents(user));
    }

    /**
     * @dev Internal helper to get user's current monthly events with virtual reset applied
     * @param user The user address
     * @return Current monthly event count
     */
    function _getCurrentMonthlyEvents(address user) private view returns (uint256) {
        uint256 currentMonth = block.timestamp / MONTH_DURATION;
        uint256 userMonth = userLastActivity[user] / MONTH_DURATION;

        if (currentMonth > userMonth) {
            // User hasn't been active this month, so monthly count is 0
            return 0;
        } else {
            return userMonthlyEvents[user];
        }
    }

    /**
     * @dev Get the current month number (for external tracking/testing)
     * @return Current month number since Unix epoch
     */
    function getCurrentMonth() public view returns (uint256) {
        return block.timestamp / MONTH_DURATION;
    }

    /**
     * @dev Get when a user's monthly count will reset
     * @param user The user address
     * @return Timestamp when the monthly count resets (start of next month)
     */
    function getUserMonthResetTime(address user) public view returns (uint256) {
        uint256 userMonth = userLastActivity[user] / MONTH_DURATION;
        return (userMonth + 1) * MONTH_DURATION;
    }

    /**
     * @dev Check if a user is in the top 10 leaderboard
     * @param user The user address
     * @return isInLeaderboard True if user is in top 10
     * @return rank User's rank (1-10), or 0 if not in top 10
     */
    function getUserLeaderboardPosition(address user) public view returns (bool isInLeaderboard, uint256 rank) {
        isInLeaderboard = isInTopTen[user];
        rank = isInLeaderboard ? topTenPosition[user] : 0;
    }

    /**
     * @dev Withdraw revenue from ticket sales
     * @param eventId The event ID to withdraw from
     */
    function withdraw(uint256 eventId) public onlyEventCreator(eventId) {
        Event storage ev = events[eventId];
        uint256 amount = ev.revenueOwed;

        if (amount > 0) {
            ev.revenueOwed = 0;
            (bool sent, ) = ev.creator.call{value: amount}("");
            require(sent, "Payment to creator failed");
        }
    }

    /**
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

        address approved = IERC721(address(ticketContract)).getApproved(tokenId);
        require(approved == address(this), "You must approve this contract to sell");

        // If this is a new listing (not re-listing), add to tracking array
        if (!listings[tokenId].active && listings[tokenId].seller == address(0)) {
            listedTicketIds.push(tokenId);
        }

        listings[tokenId] = Listing({
            seller: msg.sender,
            ticketId: tokenId,
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

        // Pay seller - use call to support smart contract wallets
        (bool payoutSuccess, ) = payable(listing.seller).call{value: sellerAmount}("");
        require(payoutSuccess, "Payout to seller failed");

        userTickets[msg.sender].push(tokenId);

        // Update user participation tracking
        _updateUserParticipation(msg.sender, ev.categories);

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

    function getUserTickets(address user) public view returns (uint256[] memory) {
        return userTickets[user];
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

    /**
     * @dev Get paginated active listings with event details
     * @param offset Starting index
     * @param limit Number of listings to return (max 50)
     * @return tokenIds Array of ticket token IDs
     * @return sellers Array of seller addresses
     * @return prices Array of listing prices
     * @return eventIds Array of event IDs for each ticket
     * @return eventNames Array of event names
     * @return eventDates Array of event dates
     * @return total Total number of active listings
     */
    function getActiveListings(uint256 offset, uint256 limit)
        public
        view
        returns (
            uint256[] memory tokenIds,
            address[] memory sellers,
            uint256[] memory prices,
            uint256[] memory eventIds,
            string[] memory eventNames,
            uint256[] memory eventDates,
            uint256 total
        )
    {
        require(limit > 0 && limit <= 50, "Limit must be 1-50");

        // First pass: count active listings
        total = _countActiveListings();

        // Return empty arrays if offset is beyond available listings
        if (offset >= total) {
            return (
                new uint256[](0),
                new address[](0),
                new uint256[](0),
                new uint256[](0),
                new string[](0),
                new uint256[](0),
                total
            );
        }

        // Calculate result count
        uint256 resultCount = limit;
        if (offset + limit > total) {
            resultCount = total - offset;
        }

        // Initialize result arrays
        tokenIds = new uint256[](resultCount);
        sellers = new address[](resultCount);
        prices = new uint256[](resultCount);
        eventIds = new uint256[](resultCount);
        eventNames = new string[](resultCount);
        eventDates = new uint256[](resultCount);

        // Second pass: collect active listings
        _collectActiveListings(offset, resultCount, tokenIds, sellers, prices, eventIds, eventNames, eventDates);
    }

    /**
     * @dev Internal helper to count active listings
     */
    function _countActiveListings() private view returns (uint256 count) {
        for (uint256 i = 0; i < listedTicketIds.length; i++) {
            if (listings[listedTicketIds[i]].active) {
                count++;
            }
        }
    }

    /**
     * @dev Internal helper to collect active listings
     */
    function _collectActiveListings(
        uint256 offset,
        uint256 resultCount,
        uint256[] memory tokenIds,
        address[] memory sellers,
        uint256[] memory prices,
        uint256[] memory eventIds,
        string[] memory eventNames,
        uint256[] memory eventDates
    ) private view {
        uint256 currentIndex = 0;
        uint256 resultIndex = 0;

        for (uint256 i = 0; i < listedTicketIds.length && resultIndex < resultCount; i++) {
            uint256 tokenId = listedTicketIds[i];

            if (listings[tokenId].active) {
                if (currentIndex >= offset) {
                    _populateListingData(
                        tokenId,
                        resultIndex,
                        tokenIds,
                        sellers,
                        prices,
                        eventIds,
                        eventNames,
                        eventDates
                    );
                    resultIndex++;
                }
                currentIndex++;
            }
        }
    }

    /**
     * @dev Internal helper to populate listing data
     */
    function _populateListingData(
        uint256 tokenId,
        uint256 index,
        uint256[] memory tokenIds,
        address[] memory sellers,
        uint256[] memory prices,
        uint256[] memory eventIds,
        string[] memory eventNames,
        uint256[] memory eventDates
    ) private view {
        Listing storage listing = listings[tokenId];
        uint256 eventId = ticketContract.ticketToEvent(tokenId);
        Event storage ev = events[eventId];

        tokenIds[index] = tokenId;
        sellers[index] = listing.seller;
        prices[index] = listing.price;
        eventIds[index] = eventId;
        eventNames[index] = ev.name;
        eventDates[index] = ev.date;
    }

    /**
     * @dev Get total number of active listings
     * @return count Total active listings
     */
    function getActiveListingsCount() public view returns (uint256 count) {
        for (uint256 i = 0; i < listedTicketIds.length; i++) {
            if (listings[listedTicketIds[i]].active) {
                count++;
            }
        }
    }

    /**
     * @dev Get listings for a specific event with pagination
     * @param eventId The event ID to filter by
     * @param offset Starting index
     * @param limit Number of listings to return (max 50)
     * @return tokenIds Array of ticket token IDs
     * @return sellers Array of seller addresses
     * @return prices Array of listing prices
     * @return total Total number of active listings for this event
     */
    function getListingsByEvent(uint256 eventId, uint256 offset, uint256 limit)
        public
        view
        returns (
            uint256[] memory tokenIds,
            address[] memory sellers,
            uint256[] memory prices,
            uint256 total
        )
    {
        require(limit > 0 && limit <= 50, "Limit must be 1-50");
        require(eventId < events.length, "Event does not exist");

        // First pass: count active listings for this event
        total = _countActiveListingsByEvent(eventId);

        // Return empty arrays if offset is beyond available listings
        if (offset >= total) {
            return (new uint256[](0), new address[](0), new uint256[](0), total);
        }

        // Calculate result count
        uint256 resultCount = limit;
        if (offset + limit > total) {
            resultCount = total - offset;
        }

        // Initialize result arrays
        tokenIds = new uint256[](resultCount);
        sellers = new address[](resultCount);
        prices = new uint256[](resultCount);

        // Second pass: collect active listings for this event
        _collectListingsByEvent(eventId, offset, resultCount, tokenIds, sellers, prices);
    }

    /**
     * @dev Internal helper to count active listings for an event
     */
    function _countActiveListingsByEvent(uint256 eventId) private view returns (uint256 count) {
        for (uint256 i = 0; i < listedTicketIds.length; i++) {
            uint256 tokenId = listedTicketIds[i];
            if (listings[tokenId].active && ticketContract.ticketToEvent(tokenId) == eventId) {
                count++;
            }
        }
    }

    /**
     * @dev Internal helper to collect listings by event
     */
    function _collectListingsByEvent(
        uint256 eventId,
        uint256 offset,
        uint256 resultCount,
        uint256[] memory tokenIds,
        address[] memory sellers,
        uint256[] memory prices
    ) private view {
        uint256 currentIndex = 0;
        uint256 resultIndex = 0;

        for (uint256 i = 0; i < listedTicketIds.length && resultIndex < resultCount; i++) {
            uint256 tokenId = listedTicketIds[i];

            if (listings[tokenId].active && ticketContract.ticketToEvent(tokenId) == eventId) {
                if (currentIndex >= offset) {
                    tokenIds[resultIndex] = tokenId;
                    sellers[resultIndex] = listings[tokenId].seller;
                    prices[resultIndex] = listings[tokenId].price;
                    resultIndex++;
                }
                currentIndex++;
            }
        }
    }
}
