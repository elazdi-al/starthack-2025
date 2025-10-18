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
echo -e "${MAGENTA}[DEPLOY]${NC} Deploying EventBook contract..."

cd contracts

# Deploy the contract using Foundry
DEPLOY_OUTPUT=$(/Users/admin/.foundry/bin/forge script script/DeployEventBook.s.sol:DeployEventBook \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast 2>&1)

if [ $? -ne 0 ]; then
  echo -e "${YELLOW}Error: Contract deployment failed${NC}"
  echo "$DEPLOY_OUTPUT"
  cd ..
  cleanup
fi

# Extract the contract address from the deployment
CONTRACT_ADDRESS=$(jq -r '.transactions[0].contractAddress' broadcast/DeployEventBook.s.sol/31337/run-latest.json 2>/dev/null)

if [ -z "$CONTRACT_ADDRESS" ] || [ "$CONTRACT_ADDRESS" = "null" ]; then
  echo -e "${YELLOW}Warning: Could not extract contract address${NC}"
else
  echo -e "${MAGENTA}[DEPLOY]${NC} EventBook deployed at: ${GREEN}$CONTRACT_ADDRESS${NC}"

  # Update the .env file with the new contract address (go back to project root)
  if [ -f ../.env ]; then
    sed -i.bak "s/NEXT_PUBLIC_EVENT_BOOK_ADDRESS=.*/NEXT_PUBLIC_EVENT_BOOK_ADDRESS=$CONTRACT_ADDRESS/" ../.env
    echo -e "${MAGENTA}[DEPLOY]${NC} Updated .env file with contract address"
  else
    echo -e "${YELLOW}Warning: .env file not found${NC}"
  fi
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
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ All services running!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${CYAN}Anvil:${NC}   http://127.0.0.1:8545"
echo -e "  ${GREEN}Next.js:${NC} http://localhost:3000"
echo -e ""
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop all services"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Wait for both processes
wait
