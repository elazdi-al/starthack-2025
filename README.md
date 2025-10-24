### **Stars – Experience Events on the Blockchain**

Stars is the next-generation platform for discovering, attending, and owning unforgettable events. Built on blockchain technology, Stars gives you verified digital tickets, exclusive drops, and a secure, transparent way to experience live entertainment.

With Stars, you can:

* **Explore events** from concerts to conferences, all verified on-chain.
* **Buy and trade tickets** safely with blockchain-backed authenticity.
* **Receive event drops** such as NFTs, rewards, or exclusive perks directly to your wallet.
* **Join a global community** of event lovers and creators shaping the future of live experiences.

Your ticket to the future of events starts with **Stars**.

---

## Network Configuration

### Switching Networks

Update `.env`:

```env
# Use "mainnet" or "testnet"
NEXT_PUBLIC_CHAIN_ENV=mainnet

# Mainnet Contracts
NEXT_PUBLIC_EVENT_BOOK_ADDRESS=0xb6496462C8da76FA9d1a5b172F9E08d1Ee1761e6
NEXT_PUBLIC_TICKET_CONTRACT_ADDRESS=0x2592B99883378C4f11B8f7C44E95Cc6b7A624e3c

# Testnet Contracts (Base Sepolia)
# NEXT_PUBLIC_EVENT_BOOK_ADDRESS=0x0Ea6FD7843a18538c4003788b5C3599dA10d87Eb
# NEXT_PUBLIC_TICKET_CONTRACT_ADDRESS=0x365664B30Baf36B99A3C4e51fc845F66e45eF371
```

Restart your dev server after switching.

### Deploying Contracts

```bash
export PRIVATE_KEY=...
export ALCHEMY_API_KEY=...

# Deploy to Base Mainnet
forge script script/Stars.s.sol:StarsDeploy --rpc-url https://base-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY --broadcast

# Deploy to Base Sepolia (Testnet)
forge script script/Stars.s.sol:StarsDeploy --rpc-url https://base-sepolia.g.alchemy.com/v2/$ALCHEMY_API_KEY --broadcast
```
