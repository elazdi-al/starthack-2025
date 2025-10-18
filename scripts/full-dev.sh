#!/bin/bash

# Development script for Base Sepolia
# Deploys contracts to Base Sepolia and starts Next.js dev server

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Starting Development Environment${NC}"
echo -e "${BLUE}    (Base Sepolia Testnet)${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Cleanup function to kill background processes
cleanup() {
  echo ""
  echo -e "${YELLOW}Shutting down...${NC}"
  kill $NEXT_PID 2>/dev/null || true
  exit
}

trap cleanup SIGINT SIGTERM

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
  echo -e "${YELLOW}Warning: PRIVATE_KEY environment variable not set${NC}"
  echo -e "${YELLOW}Please set your private key for deployment:${NC}"
  echo -e "${CYAN}export PRIVATE_KEY=your_private_key_here${NC}"
  echo ""
  read -p "Enter your private key (or press Ctrl+C to cancel): " PRIVATE_KEY
  export PRIVATE_KEY
fi

# Deploy EventBook contract
echo -e "${MAGENTA}[DEPLOY]${NC} Deploying EventBook and Ticket contracts to Base Sepolia..."

cd contracts

# Deploy the contracts using Foundry to Base Sepolia
# Use the actual Foundry forge binary, not Laravel Herd's forge
DEPLOY_OUTPUT=$(forge script script/Stars.s.sol:StarsDeploy \
  --rpc-url https://sepolia.base.org \
  --broadcast \
  --verify 2>&1)

DEPLOY_STATUS=$?

if [ $DEPLOY_STATUS -ne 0 ]; then
  echo -e "${YELLOW}Error: Contract deployment failed${NC}"
  echo "$DEPLOY_OUTPUT"
  cd ..
  cleanup
fi

# Extract the contract addresses from the deployment
# The Solidity script returns EventBook at index 0 and Ticket at index 1
EVENTBOOK_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -o "0: contract EventBook 0x[a-fA-F0-9]*" | grep -o "0x[a-fA-F0-9]*")
TICKET_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -o "1: contract Ticket 0x[a-fA-F0-9]*" | grep -o "0x[a-fA-F0-9]*")

if [ -z "$EVENTBOOK_ADDRESS" ]; then
  echo -e "${YELLOW}Error: Could not extract EventBook contract address from deployment${NC}"
  echo -e "${YELLOW}Deployment output:${NC}"
  echo "$DEPLOY_OUTPUT"
  cd ..
  cleanup
fi

echo -e "${MAGENTA}[DEPLOY]${NC} EventBook deployed at: ${GREEN}$EVENTBOOK_ADDRESS${NC}"

if [ -n "$TICKET_ADDRESS" ]; then
  echo -e "${MAGENTA}[DEPLOY]${NC} Ticket deployed at: ${GREEN}$TICKET_ADDRESS${NC}"
fi

# Verify the contract was actually deployed
echo -e "${MAGENTA}[DEPLOY]${NC} Verifying contract deployment..."
CONTRACT_CODE=$(cast code $EVENTBOOK_ADDRESS --rpc-url https://sepolia.base.org)

if [ "$CONTRACT_CODE" = "0x" ]; then
  echo -e "${YELLOW}Error: No contract code found at $EVENTBOOK_ADDRESS${NC}"
  cd ..
  cleanup
fi

echo -e "${MAGENTA}[DEPLOY]${NC} Contract verified successfully!"

# Update the .env file with the new contract address (go back to project root)
if [ -f ../.env ]; then
  sed -i.bak "s/NEXT_PUBLIC_EVENT_BOOK_ADDRESS=.*/NEXT_PUBLIC_EVENT_BOOK_ADDRESS=$EVENTBOOK_ADDRESS/" ../.env
  echo -e "${MAGENTA}[DEPLOY]${NC} Updated .env file with EventBook address"
else
  echo -e "${YELLOW}Error: .env file not found${NC}"
  cd ..
  cleanup
fi

# Go back to project root
cd ..

echo ""

# Start Next.js dev server with prefixed output
echo -e "${GREEN}[NEXT.JS]${NC} Starting development server..."
echo ""
(npm run dev 2>&1 | sed "s/^/$(echo -e "${GREEN}[NEXT.JS]${NC}") /") &
NEXT_PID=$!

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ All services running!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${CYAN}Network:${NC}  Base Sepolia (Chain ID: 84532)"
echo -e "  ${CYAN}RPC URL:${NC}  https://sepolia.base.org"
echo -e "  ${GREEN}Next.js:${NC} http://localhost:3000"
echo -e ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW} Contract Addresses:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${CYAN}EventBook:${NC} ${GREEN}$EVENTBOOK_ADDRESS${NC}"
if [ -n "$TICKET_ADDRESS" ]; then
  echo -e "  ${CYAN}Ticket:${NC}    ${GREEN}$TICKET_ADDRESS${NC}"
fi
echo -e ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW} Setup Instructions:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  1. Open your wallet (MetaMask/Coinbase Wallet/etc.)"
echo -e "  2. Add Base Sepolia network (if not already added)"
echo -e "     ${CYAN}RPC URL:${NC} https://sepolia.base.org"
echo -e "     ${CYAN}Chain ID:${NC} 84532"
echo -e "  3. Get testnet ETH from Base Sepolia faucet"
echo -e "  4. Connect your wallet to http://localhost:3000"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e ""
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop the server"
echo -e ""

# Wait for both processes
wait
