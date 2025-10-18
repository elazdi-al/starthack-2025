#!/bin/bash

# Simple development script without tmux
# Runs services sequentially with prefixed logs

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Kill any existing Anvil processes
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
pkill -9 anvil 2>/dev/null || true
lsof -ti:8545 | xargs kill -9 2>/dev/null || true
sleep 1

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Starting Development Environment${NC}"
echo -e "${BLUE}     (Simple Mode - No TUI)${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Cleanup function to kill background processes
cleanup() {
  echo ""
  echo -e "${YELLOW}Shutting down...${NC}"
  kill $ANVIL_PID 2>/dev/null || true
  kill $NEXT_PID 2>/dev/null || true
  exit
}

trap cleanup SIGINT SIGTERM

# Start Anvil in the background with prefixed output
echo -e "${CYAN}[BLOCKCHAIN]${NC} Starting Anvil..."
(anvil 2>&1 | sed "s/^/$(echo -e "${CYAN}[ANVIL]${NC}") /" ) &
ANVIL_PID=$!

# Wait for Anvil to be ready
sleep 3

# Check if Anvil is running
if ! kill -0 $ANVIL_PID 2>/dev/null; then
  echo -e "${YELLOW}Error: Anvil failed to start${NC}"
  exit 1
fi

echo -e "${CYAN}[BLOCKCHAIN]${NC} Anvil is running on http://127.0.0.1:8545"
echo ""

# Deploy EventBook contract
echo -e "${MAGENTA}[DEPLOY]${NC} Deploying EventBook and Ticket contracts..."

cd contracts

# Set private key as env variable for the deployment script
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Deploy the contracts using Foundry
# Use the actual Foundry forge binary, not Laravel Herd's forge
DEPLOY_OUTPUT=$(forge script script/Stars.s.sol:StarsDeploy \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast 2>&1)

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
CONTRACT_CODE=$(/Users/admin/.foundry/bin/cast code $EVENTBOOK_ADDRESS --rpc-url http://127.0.0.1:8545)

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
echo -e "  ${CYAN}Anvil:${NC}   http://127.0.0.1:8545"
echo -e "  ${GREEN}Next.js:${NC} http://localhost:3000"
echo -e ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW} To test event creation, add this account to your wallet:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${CYAN}Address:${NC}     0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
echo -e "  ${CYAN}Private Key:${NC} 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
echo -e "  ${CYAN}Balance:${NC}     10000 ETH"
echo -e ""
echo -e "  ${YELLOW}Steps:${NC}"
echo -e "  1. Open your wallet (MetaMask/Coinbase Wallet/etc.)"
echo -e "  2. Add/Import account using the private key above"
echo -e "  3. Connect to localhost:8545 (Chain ID: 31337)"
echo -e "  4. You can now create events on http://localhost:3000"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e ""
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop all services"
echo -e ""

# Wait for both processes
wait
