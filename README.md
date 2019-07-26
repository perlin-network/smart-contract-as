# smart-contract-as

[![npm](https://img.shields.io/npm/v/smart-contract-as.svg)](https://www.npmjs.com/package/smart-contract-as)
[![Discord Chat](https://img.shields.io/discord/458332417909063682.svg)](https://discord.gg/dMYfDPM)

Write decentralized applications for Wavelet in AssemblyScript.

## Setup

Assuming `yarn` is installed, create a new smart contract project by executing the following:

```shell
yarn add -D AssemblyScript/assemblyscript
yarn asinit .
yarn add smart-contract-as
```

## Example

Inside `assembly/index.ts`:

```ts
import {Parameters, Tag, Transfer, send_transaction, log} from "../node_modules/smart-contract-as/assembly";

// Simple hello world example.
export function _contract_init(): void {
    const params = Parameters.load();
    log("hello world");
}

// Echoes back a message the sender provides.
export function _contract_test(): void {
    const params = Parameters.load();
    log("echoing back: " + params.string());
}

// Sends back half the PERLs it receives back to the sender.
export function _contract_on_money_received(): void {
    const params = Parameters.load();

    const tx = new Transfer(params.sender_id, params.amount / 2);
    send_transaction(Tag.TRANSFER, tx.marshal());
}
```

For more examples, check out the `examples/` directory.