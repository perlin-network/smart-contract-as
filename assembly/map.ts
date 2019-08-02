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

// An AVLMap might be a bit slower than HashMap, but is more stable in terms of performance and is resistant to DoS.
export class AVLMap<K, V> {
    root: AVLNode<K, V> | null;
    cmp: (left: K, right: K) => i32;

    constructor(newCmp: (left: K, right: K) => i32) {
        this.root = null;
        this.cmp = newCmp;
    }

    set(key: K, value: V): void {
        if (this.root == null) {
            this.root = new AVLNode(key);
            this.root.value = value;
        } else {
            this.root = this.root.set(key, value, this.cmp);
        }
    }

    get(key: K): V {
        if (this.root == null) {
            throw new Error("get: this avl map contains no element");
        } else {
            return this.root.get(key, this.cmp);
        }
    }

    has(key: K): bool {
        if (this.root == null) return false;
        else return this.root.has(key, this.cmp);
    }

    remove(key: K): void {
        if (this.root == null) {
            throw new Error("remove: this avl map contains no element");
        } else {
            this.root = this.root.remove(key, this.cmp);
        }
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

    private balanceFactor(): i32 {
        if (this.left && this.right) {
            return this.left.height - this.right.height;
        } else {
            return 0;
        }
    }

    private update(): void {
        if (this.left && this.right) {
            this.height = this.left.height + this.right.height + 1;
        } else {
            this.height = 0;
        }
    }

    private rotateLeft(): AVLNode<K, V> {
        let oldRight = this.right!;
        this.right = oldRight.left;
        oldRight.left = this;
        this.update();
        oldRight.update();
        return oldRight;
    }

    private rotateRight(): AVLNode<K, V> {
        let oldLeft = this.left!;
        this.left = oldLeft.right;
        oldLeft.right = this;
        this.update();
        oldLeft.update();
        return oldLeft;
    }

    private rebalance(): AVLNode<K, V> {
        this.update();
        let balance = this.balanceFactor();
        if (balance > 1) {
            if (this.left!.balanceFactor() > 0) {
                this.left = this.left!.rotateLeft();
            }
            return this.rotateRight();
        } else if (balance < -1) {
            if (this.right!.balanceFactor() > 0) {
                this.right = this.right!.rotateRight();
            }
            return this.rotateLeft();
        } else {
            return this;
        }
    }

    has(key: K, cmp: (left: K, right: K) => i32): boolean {
        let cmpRet = cmp(key, this.key);

        if (this.left && this.right) {
            if (cmpRet < 0) {
                return this.left.has(key, cmp);
            } else {
                return this.right.has(key, cmp);
            }
        } else {
            return cmpRet == 0;
        }
    }

    get(key: K, cmp: (left: K, right: K) => i32): V {
        let cmpRet = cmp(key, this.key);

        if (this.left && this.right) {
            if (cmpRet < 0) {
                return this.left.get(key, cmp);
            } else {
                return this.right.get(key, cmp);
            }
        } else {
            if (cmpRet == 0) {
                return this.value!;
            } else {
                throw new Error("key not found in avl map");
            }
        }
    }

    remove(key: K, cmp: (left: K, right: K) => i32): AVLNode<K, V> | null {
        let cmpRet = cmp(key, this.key);

        if (this.left && this.right) {
            if (cmpRet < 0) {
                this.left = this.left.remove(key, cmp);
                if (!this.left) return this.right;
            } else {
                this.right = this.right.remove(key, cmp);
                if (!this.right) return this.left;
            }
            return this.rebalance();
        } else {
            if (cmpRet == 0) {
                return null;
            } else {
                return this;
            }
        }
    }

    set(key: K, value: V, cmp: (left: K, right: K) => i32): AVLNode<K, V> {
        let cmpRet = cmp(key, this.key);

        if (this.left && this.right) {
            // Non-leaf
            if (cmpRet < 0) {
                this.left = this.left.set(key, value, cmp);
                return this.rebalance();
            } else {
                this.right = this.right.set(key, value, cmp);
                return this.rebalance();
            }
        } else {
            let newLeaf: AVLNode<K, V> = new AVLNode(key);
            newLeaf.value = value;
            if (cmpRet < 0) {
                let node: AVLNode<K, V> = new AVLNode(newLeaf.key);
                node.left = newLeaf;
                node.right = this;
                node.update();
                return node;
            } else if (cmpRet == 0) {
                return newLeaf;
            } else {
                let node: AVLNode<K, V> = new AVLNode(this.key);
                node.left = this;
                node.right = newLeaf;
                node.update();
                return node;
            }
        }
    }
}
