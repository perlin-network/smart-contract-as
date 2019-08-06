// The entry file of your WebAssembly module.

import {log, panic, Parameters, to_hex_string} from "../node_modules/smart-contract-as/assembly";

const logs = Array.create<string>(50);

export function _contract_init(): void {}

export function _contract_send_message(): void {
    const params = Parameters.load();
    const msg = params.string();

    if (msg.length === 0 || msg.length > 240) panic("Message must not be empty, and must be less than or equal to 240 characters.");
    if (logs.length === 50) logs.shift();

    logs.push("<" + to_hex_string(params.sender_id) + "> " + msg);
}

export function _contract_get_messages(): void {
    for (let i = 0; i < logs.length; i++) {
        log(logs[i]);
    }
}