#!/bin/bash

# Add example NYC concert event to the EventBook contract

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Read contract address from .env
CONTRACT_ADDRESS=$(grep NEXT_PUBLIC_EVENT_BOOK_ADDRESS .env | cut -d '=' -f2)

if [ -z "$CONTRACT_ADDRESS" ] || [ "$CONTRACT_ADDRESS" = "0x0000000000000000000000000000000000000000" ]; then
  echo -e "${YELLOW}Error: Contract address not found in .env${NC}"
  exit 1
fi

echo -e "${BLUE}Adding example event to EventBook...${NC}"
echo -e "Contract: ${GREEN}$CONTRACT_ADDRESS${NC}"

# Calculate timestamp for tomorrow
TOMORROW=$(($(date +%s) + 86400))

# Create the event
cast send $CONTRACT_ADDRESS \
  "createEvent(string,string,uint256,uint256,uint256)" \
  "NYC Summer Concert" \
  "Madison Square Garden, New York" \
  $TOMORROW \
  100000000000000000 \
  100 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --rpc-url http://127.0.0.1:8545 \
  > /dev/null 2>&1

echo -e "${GREEN}✓ Event created successfully!${NC}"
echo ""
echo -e "${BLUE}Event Details:${NC}"
echo -e "  Name:     NYC Summer Concert"
echo -e "  Location: Madison Square Garden, New York"
echo -e "  Date:     $(date -r $TOMORROW '+%Y-%m-%d %H:%M:%S')"
echo -e "  Price:    0.1 ETH"
echo -e "  Capacity: 100 tickets"
echo ""

# Get total number of events
TOTAL=$(cast call $CONTRACT_ADDRESS "getNumberOfEvents()" --rpc-url http://127.0.0.1:8545)
TOTAL_DEC=$((16#${TOTAL:2}))

echo -e "Total events in contract: ${GREEN}$TOTAL_DEC${NC}"
