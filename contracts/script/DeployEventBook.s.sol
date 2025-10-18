// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {EventBook} from "../src/EventBook.sol";

contract DeployEventBook is Script {
    EventBook public eventBook;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        eventBook = new EventBook();

        vm.stopBroadcast();
    }
}
