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

Otherwise, should you be using WebAssembly Studio, make sure you add `smart-contract-as` as a dependency in `assembly/package.json`:

```json
{
 "dependencies": {
    "smart-contract-as": "0.1.0"
  }
}
```

## Example

Inside `assembly/index.ts`:

```ts
import {Parameters, Tag, Transfer, send_transaction, log} from "./wavelet";

// Simple hello world example.
export function _contract_init(): void {
    const params = new Parameters();
    log("hello world");
}

// Echoes back a message the sender provides.
export function _contract_test(): void {
    const params = new Parameters();
    log("echoing back: " + params.string());
}

// Sends back half the PERLs it receives back to the sender.
export function _contract_on_money_received(): void {
    const params = new Parameters();

    const tx = new Transfer(params.sender_id, params.amount / 2);
    send_transaction(Tag.TRANSFER, tx.marshal());
}
```