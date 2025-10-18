// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {Ticket} from "../src/Ticket.sol";
import {EventBook} from "../src/EventBook.sol";

contract StarsDeploy is Script {
    function run() public returns (EventBook, Ticket) {
        // Get the private key of the deployer
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        // --- 1. Deploy the Ticket (NFT) Contract ---
        // It has no constructor arguments
        Ticket ticketContract = new Ticket();
        //console.log("Ticket deployed to:", address(ticketContract));

        // --- 2. Deploy the EventBook Contract ---
        // It needs the address of the ticket contract
        EventBook managerContract = new EventBook(address(ticketContract));
        //console.log("EventBook deployed to:", address(managerContract));

        // --- 3. Link the Contracts ---
        // This is the CRITICAL step.
        // We must tell the Ticket contract that the EventBook is its manager.
        ticketContract.setEventBook(address(managerContract));
        //console.log("Ticket manager set!");

        vm.stopBroadcast();
        return (managerContract, ticketContract);
    }
}
