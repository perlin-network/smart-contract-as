// FIXME(kenta): This contract will not work just yet. For more information,
//  please reach out to us on our Discord server or Telegram.

import {log, Parameters} from "../node_modules/smart-contract-as/assembly";

const balances = new Map<Uint8Array, u64>();

export function _contract_init(): void {
  const params = Parameters.load();
  balances.set(params.sender_id, 100_000);
}

export function _contract_balance(): void {
  const params = Parameters.load();
  const target = params.bytes(32);

  const balance = balances.has(target) ? balances.get(target) : 0;
  // @ts-ignore
  log("Balance: " + balance.toString());
}

export function _contract_transfer(): void {
  const params = Parameters.load();
  const recipient = params.bytes(32);
  const amount = params.u64();

  assert(amount > 0, "amount must be greater than 0");

  if (amount === 0) {
    return;
  }

  const sender_balance = balances.has(params.sender_id) ? balances.get(params.sender_id) : 0;

  assert(sender_balance >= amount, "sender does not have enough balance");

  balances.set(params.sender_id, sender_balance - amount);

  const recipient_balance = balances.get(recipient) || 0;
  balances.set(recipient, recipient_balance + amount);
}