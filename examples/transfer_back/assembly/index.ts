import {Parameters, Tag, Transfer, send_transaction} from "../node_modules/smart-contract-as/assembly";

export function _contract_init(): void {}

export function _contract_on_money_received(): void {
  const params = Parameters.load();

  const tx = new Transfer(params.sender_id, params.amount / 2);
  send_transaction(Tag.TRANSFER, tx.marshal());
}