// @ts-ignore
@external("env", "_payload")
declare function _payload(ptr: usize): void;

// @ts-ignore
@external("env", "_payload_len")
declare function _payload_len(): usize;

// @ts-ignore
@external("env", "_log")
declare function _log(offset: usize, len: usize): i32;

// @ts-ignore
@external("env", "_result")
declare function _result(offset: usize, len: usize): void;

// @ts-ignore
@external("env", "_send_transaction")
declare function _send_transaction(tag: u8, payload_offset: usize, payload_len: usize): void;

export enum Tag {
    NOP = <u8>0,
    TRANSFER = <u8>1,
    CONTRACT = <u8>2,
    STAKE = <u8>3,
    BATCH = <u8>4,
}

export class PayloadWriter {
    buf: Uint8Array = new Uint8Array(0);
    view: DataView = new DataView(this.buf.buffer);
    idx: i32 = 0;

    alloc(amount: i32): i32 {
        const oldIdx = this.idx;

        this.idx += amount;

        if (this.idx > this.buf.byteLength) {
            const old = this.buf;

            this.buf = new Uint8Array(this.idx);

            for (let i = 0; i < old.byteLength; i++) {
                this.buf[i] = old[i];
            }

            this.view = new DataView(this.buf.buffer);
        }

        return oldIdx;
    }

    string(x: string, nullTerminated: bool = true): void {
        const str = String.UTF8.encode(x, nullTerminated);
        this.bytes(Uint8Array.wrap(str));
    }

    bytes(x: Uint8Array): void {
        for (let i = 0; i < x.byteLength; i++) {
            this.u8(x[i]);
        }
    }

    bool(x: bool): void {
        this.u8(x ? <u8>1 : <u8>0);
    }

    i8(x: i8): void {
        const idx = this.alloc(1);
        this.view.setInt8(idx, x);
    }

    i16(x: i16): void {
        const idx = this.alloc(2);
        this.view.setInt16(idx, x, true);
    }

    i32(x: i32): void {
        const idx = this.alloc(4);
        this.view.setInt32(idx, x, true);
    }

    i64(x: i64): void {
        const idx = this.alloc(8);
        this.view.setInt64(idx, x, true);
    }

    u8(x: u8): void {
        const idx = this.alloc(1);
        this.view.setUint8(idx, x);
    }

    u16(x: u16): void {
        const idx = this.alloc(2);
        this.view.setUint16(idx, x, true);
    }

    u32(x: u32): void {
        const idx = this.alloc(4);
        this.view.setUint32(idx, x, true);
    }

    u64(x: u64): void {
        const idx = this.alloc(8);
        this.view.setUint64(idx, x, true);
    }

    marshal(): Uint8Array {
        return this.buf;
    }
}

export class Transfer {
    constructor(
        public recipient: Uint8Array,
        public amount: u64,
        public gas_limit: u64 = 0,
        public gas_deposit: u64 = 0,
        public func_name: string | null = null,
        public func_params: Uint8Array | null = null,
    ) {
    }

    marshal(): Uint8Array {
        const writer = new PayloadWriter();
        writer.bytes(this.recipient);
        writer.u64(this.amount);

        writer.u64(this.gas_limit);
        writer.u64(this.gas_deposit);

        if (this.func_name !== null && this.func_name.length > 0) {
            writer.u32(String.UTF8.byteLength(this.func_name!));
            writer.string(this.func_name!, false);

            if (this.func_params !== null) {
                writer.u32(this.func_params!.byteLength);
                writer.bytes(this.func_params!);
            }
        }

        return writer.marshal();
    }
}

export enum StakeOp {
    WITHDRAW_STAKE = <u8>0,
    PLACE_STAKE = <u8>1,
    WITHDRAW_REWARD = <u8>2,
}

export class Stake {
    constructor(
        public op: StakeOp,
        public amount: u64,
    ) {
    }

    marshal(): Uint8Array {
        const writer = new PayloadWriter();
        writer.u8(<u8>this.op);
        writer.u64(this.amount);
        return writer.marshal();
    }
}

export class Contract {
    constructor(
        public gas_limit: u64,
        public gas_deposit: u64,
        public params: Uint8Array,
        public code: Uint8Array,
    ) {
    }

    marshal(): Uint8Array {
        const writer = new PayloadWriter();
        writer.u64(this.gas_limit);
        writer.u64(this.gas_deposit);

        writer.u32(<u32>this.params.byteLength);

        writer.bytes(this.params);
        writer.bytes(this.code);

        return writer.marshal();
    }
}

export class Parameters {
    public round_idx: u64;
    public round_id: Uint8Array;
    public transaction_id: Uint8Array;
    public sender_id: Uint8Array;
    public amount: u64;

    view: DataView;
    offset: u32;

    static load(): Parameters {
        let params = new Parameters();

        const payload_len = _payload_len();
        const payload = new ArrayBuffer(payload_len);
        _payload(changetype<usize>(payload));

        const view = new DataView(payload, 0, payload_len);

        params.round_idx = view.getUint64(0, true);
        params.round_id = Uint8Array.wrap(payload, 8, 32);
        params.transaction_id = Uint8Array.wrap(payload, 8 + 32, 32);
        params.sender_id = Uint8Array.wrap(payload, 8 + 32 + 32, 32);
        params.amount = view.getUint64(8 + 32 + 32 + 32, true);

        if (payload_len > 8 + 32 + 32 + 32 + 8) {
            params.view = new DataView(payload, 8 + 32 + 32 + 32 + 8, payload_len - (8 + 32 + 32 + 32 + 8));
        }

        return params;
    }

    string(): string {
        let buf: u8[] = [];
        while (true) {
            const v = this.u8();
            if (v === <u8>0) break;
            buf.push(v);
        }

        let v = new Uint8Array(buf.length);
        for (let i = 0; i < buf.length; i++) {
            v[i] = buf[i];
        }

        this.offset += buf.length + 1;

        return String.UTF8.decode(v.buffer);
    }

    bytes(len: i32 = 0): Uint8Array {
        const buf = new Uint8Array(len > 0 ? len : this.u32());

        for (let i = 0; i < buf.byteLength; i++) {
            buf[i] = this.u8();
        }

        this.offset += buf.byteLength;

        return buf;
    }

    bool(): bool {
        const v = this.u8();
        return v === <u8>1;
    }

    i8(): i8 {
        const v = this.view.getInt8(this.offset);
        this.offset += 1;

        return v;
    }

    i16(): i16 {
        const v = this.view.getInt16(this.offset, true);
        this.offset += 2;

        return v;
    }

    i32(): i32 {
        const v = this.view.getInt32(this.offset, true);
        this.offset += 4;

        return v;
    }

    i64(): i64 {
        const v = this.view.getInt64(this.offset, true);
        this.offset += 8;

        return v;
    }

    u8(): u8 {
        const v = this.view.getUint8(this.offset);
        this.offset += 1;

        return v;
    }

    u16(): u16 {
        const v = this.view.getUint16(this.offset, true);
        this.offset += 2;

        return v;
    }

    u32(): u32 {
        const v = this.view.getUint32(this.offset, true);
        this.offset += 4;

        return v;
    }

    u64(): u64 {
        const v = this.view.getUint64(this.offset, true);
        this.offset += 8;

        return v;
    }
}

export function log(a: string): void {
    const str = String.UTF8.encode(a);
    _log(changetype<usize>(str), str.byteLength);
}

export function panic(a: string = ""): void {
    const str = String.UTF8.encode(a);
    _result(changetype<usize>(str), str.byteLength);
    unreachable();
}

export function send_transaction(tag: Tag, payload: Uint8Array): void {
    const v = payload.buffer;
    _send_transaction(<u8>tag, changetype<usize>(v), v.byteLength);
}

export function to_hex_string(buf: Uint8Array): string {
    let out = "";

    for (let i = 0; i < buf.length; i++) {
        const a = buf[i] as u32;
        const b = a & 0xf;
        const c = a >> 4;

        let x: u32 = ((87 + b + (((b - 10) >> 8) & ~38)) << 8) | (87 + c + (((c - 10) >> 8) & ~38));
        out += String.fromCharCode(x as u8);
        x >>= 8;
        out += String.fromCharCode(x as u8);
    }

    return out;
}

function _abort(
    message: string | null,
    fileName: string | null,
    lineNumber: u32,
    columnNumber: u32
): void {
    if (message === null || fileName === null) return;
    // @ts-ignore
    log(`ABORT: ${message} - ${fileName}:${lineNumber.toString()}`);
}