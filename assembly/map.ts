// A HashMap is fast in general but is vulnerable to DoS attacks.
// Special care must be taken on the caller side to mitigate that.
export class HashMap<K, V> {
    basic_elements: Map<u64, Chained<K, V>>;
    size: u32;
    size_per_bucket: Map<u64, u32>;

    eq: (left: K, right: K) => bool;
    hash: (key: K) => u64;

    constructor(newEq: (left: K, right: K) => bool, newHash: (key: K) => u64) {
        this.basic_elements = new Map();
        this.size = 0;
        this.size_per_bucket = new Map();

        this.eq = newEq;
        this.hash = newHash;

    }

    // Contract writer MUST check this before inserting any key-value pair into the hashmap, to prevent DoS attacks.
    public bucket_size(key: K): u32 {
        let basic_key = this.hash(key);
        return this.size_per_bucket.has(basic_key) ? this.size_per_bucket.get(basic_key) : 0;
    }

    public count(): u32 {
        return this.size;
    }

    public set(key: K, value: V): void {
        this.delete(key);

        let basic_key = this.hash(key);
        if (this.basic_elements.has(basic_key)) {
            let prev = this.basic_elements.get(basic_key);
            let chained = new Chained(key, value, prev);
            this.basic_elements.set(basic_key, chained);
            this.size_per_bucket.set(basic_key, this.size_per_bucket.get(basic_key) + 1);
        } else {
            let chained = new Chained(key, value, null);
            this.basic_elements.set(basic_key, chained);
            this.size_per_bucket.set(basic_key, 1);
        }
        this.size += 1;
    }

    public get(key: K): V {
        let basic_key = this.hash(key);
        if (this.basic_elements.has(basic_key)) {
            let node: Chained<K, V> | null = this.basic_elements.get(basic_key);
            while (node != null) {
                if (this.eq(node.key, key)) {
                    return node.value;
                }
                node = node.next;
            }
        }

        throw new Error("HashMap key not found");
    }

    public delete(key: K): bool {
        let basic_key = this.hash(key);
        if (this.basic_elements.has(basic_key)) {
            let node: Chained<K, V> | null = this.basic_elements.get(basic_key);

            // First element...
            if (this.eq(node.key, key)) {
                if (node.next) {
                    this.basic_elements.set(basic_key, node.next);
                    this.size_per_bucket.set(basic_key, this.size_per_bucket.get(basic_key) - 1);
                } else {
                    this.basic_elements.delete(basic_key);
                    this.size_per_bucket.delete(basic_key);
                }
                this.size -= 1;
                return true;
            }

            // Other elements...
            let prev = node;
            node = node.next;
            while (node != null) {
                if (this.eq(node.key, key)) {
                    prev.next = node.next;
                    this.size_per_bucket.set(basic_key, this.size_per_bucket.get(basic_key) - 1);
                    this.size -= 1;
                    return true;
                }
                prev = node;
                node = node.next;
            }
        }

        return false;
    }
}

class Chained<K, V> {
    public key: K;
    public value: V;
    public next: Chained<K, V> | null;

    constructor(newKey: K, newValue: V, newNext: Chained<K, V> | null) {
        this.key = newKey
        this.value = newValue;
        this.next = newNext;
    }
}

// TODO
/*
// An AVLMap might be a bit slower than HashMap, but is more stable in terms of performance and is resistant to DoS.
export class AVLMap<K, V> {
    cmp: (left: K, right: K) => i32;

    constructor(newCmp: (left: K, right: K) => i32) {
        this.cmp = newCmp;
    }
}

class AVLNode<K, V> {
    height: i32;
    public key: K;
    public value: V | null;
    left: AVLNode<K, V> | null;
    right: AVLNode<K, V> | null;

    constructor(newKey: K) {
        this.height = 0;
        this.key = newKey;
        this.value = null;
        this.left = null;
        this.right = null;
    }

    balanceFactor(): i32 {
        if (this.left && this.right) {
            return this.left.height - this.right.height;
        } else {
            return 0;
        }
    }

    insert(key: K, value: V, cmp: (left: K, right: K) => i32) {
        if (this.left && this.right) {
            // Non-leaf


        }
    }
}
*/
