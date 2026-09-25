import { cap, num, numbers, states } from '../types';
/** Prefix sums: build once, then answer any range with a single subtraction. */
export const prefixSum = (input) => {
    const values = numbers(input, 'array', [3, 1, 4, 1, 5, 9, 2, 6]);
    const queries = (Array.isArray(input.queries) ? input.queries : [[1, 3]]);
    const steps = [];
    const prefix = [0];
    steps.push({
        scene: {
            array: { values, states: states(values.length), caption: 'nums' },
            secondaryArray: { values: [...prefix], states: ['match'], caption: 'prefix (leading 0 removes every off-by-one)' },
        },
        codeLine: 1,
        explain: 'The prefix array is one longer than the input, and starts with 0 — that leading zero is what removes the special case for ranges starting at index 0.',
        vars: { 'prefix[0]': 0 },
    });
    for (let i = 0; i < values.length; i++) {
        prefix.push(prefix[i] + values[i]);
        const cellStates = states(values.length);
        cellStates[i] = 'active';
        const prefixStates = states(prefix.length, 'visited');
        prefixStates[prefix.length - 1] = 'match';
        steps.push({
            scene: {
                array: { values, states: cellStates, caption: 'nums' },
                secondaryArray: { values: [...prefix], states: prefixStates, caption: 'prefix' },
            },
            codeLine: 3,
            explain: `prefix[${i + 1}] = prefix[${i}] + nums[${i}] = ${prefix[i]} + ${values[i]} = ${prefix[i + 1]}.`,
            vars: { i, running: prefix[i + 1] },
        });
    }
    for (const [from, to] of queries) {
        const answer = prefix[to + 1] - prefix[from];
        const cellStates = states(values.length);
        for (let i = from; i <= to; i++)
            cellStates[i] = 'inWindow';
        const prefixStates = states(prefix.length);
        prefixStates[from] = 'reject';
        prefixStates[to + 1] = 'match';
        steps.push({
            scene: {
                array: { values, states: cellStates, caption: 'nums' },
                secondaryArray: { values: [...prefix], states: prefixStates, caption: 'prefix' },
            },
            codeLine: 6,
            explain: `sum(${from}..${to}) = prefix[${to + 1}] - prefix[${from}] = ${prefix[to + 1]} - ${prefix[from]} = ${answer}. One subtraction, regardless of how wide the range is.`,
            vars: { from, to, answer },
        });
    }
    steps[steps.length - 1] = { ...steps[steps.length - 1], done: true };
    return cap(steps);
};
/**
 * Prefix sums + a hash map: counting subarrays that sum to k.
 *
 * This is the move that makes the pattern powerful. Rearranging prefix[j] - prefix[i] = k
 * gives prefix[i] = prefix[j] - k — so instead of searching for a qualifying start, we can
 * LOOK UP how many there were. The map seeded with {0: 1} is what counts subarrays that
 * start at index 0.
 */
export const prefixSumHash = (input) => {
    const values = numbers(input, 'array', [1, 2, 3, -3, 1, 1, 1]);
    const k = num(input, 'k', 3);
    const steps = [];
    const seen = new Map([[0, 1]]);
    let running = 0;
    let count = 0;
    const bucketsOf = (highlightKey) => ({
        caption: 'prefix counts seen so far',
        buckets: [
            {
                index: 0,
                entries: [...seen.entries()].map(([key, value]) => ({
                    key: String(key),
                    value,
                    state: (key === highlightKey ? 'match' : 'idle'),
                })),
            },
        ],
    });
    steps.push({
        scene: {
            array: { values, states: states(values.length), caption: 'nums' },
            buckets: bucketsOf(),
        },
        codeLine: 2,
        explain: 'Seed the map with {0: 1}. That entry stands for the empty prefix — without it, every subarray starting at index 0 would be missed.',
        vars: { running: 0, count: 0, k },
    });
    for (let i = 0; i < values.length; i++) {
        running += values[i];
        const cellStates = states(values.length);
        for (let j = 0; j < i; j++)
            cellStates[j] = 'visited';
        cellStates[i] = 'active';
        steps.push({
            scene: { array: { values, states: cellStates, caption: 'nums' }, buckets: bucketsOf() },
            codeLine: 5,
            explain: `Add nums[${i}] = ${values[i]}. running = ${running}.`,
            vars: { i, running, count },
        });
        const needed = running - k;
        const hits = seen.get(needed) ?? 0;
        count += hits;
        steps.push({
            scene: { array: { values, states: cellStates, caption: 'nums' }, buckets: bucketsOf(needed) },
            codeLine: 6,
            explain: hits > 0
                ? `We need an earlier prefix equal to ${running} - ${k} = ${needed}. It occurred ${hits} time${hits === 1 ? '' : 's'} — that is ${hits} more subarray${hits === 1 ? '' : 's'} summing to ${k}.`
                : `We need an earlier prefix equal to ${needed}. None seen, so no subarray ends here.`,
            vars: { needed, hits, count },
        });
        seen.set(running, (seen.get(running) ?? 0) + 1);
        steps.push({
            scene: { array: { values, states: cellStates, caption: 'nums' }, buckets: bucketsOf(running) },
            codeLine: 7,
            explain: `Record that prefix ${running} has now been seen ${seen.get(running)} time(s).`,
            vars: { running, count },
        });
    }
    steps.push({
        scene: { array: { values, states: states(values.length, 'visited'), caption: 'nums' }, buckets: bucketsOf() },
        codeLine: 9,
        explain: `${count} subarrays sum to ${k}. One pass, O(n) — and it works with negative numbers, where a sliding window would be unsound.`,
        vars: { count },
        done: true,
    });
    return cap(steps);
};
/** Hashing: key → bucket, and what happens when two keys collide. */
export const hashingOps = (input) => {
    const capacity = num(input, 'capacity', 8);
    const operations = (Array.isArray(input.operations) ? input.operations : []);
    const steps = [];
    const buckets = Array.from({ length: capacity }, () => []);
    // A small deterministic hash with the same shape as Java's: mix the high bits down, then mask.
    const hash = (key) => {
        let h = 0;
        for (let i = 0; i < key.length; i++) {
            h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
        }
        return h;
    };
    const indexFor = (key) => {
        const h = hash(key);
        return (h ^ (h >>> 16)) & (capacity - 1);
    };
    const snapshot = (caption) => ({
        buckets: {
            caption,
            buckets: buckets.map((entries, index) => ({
                index,
                entries: entries.map((entry) => ({ ...entry })),
            })),
        },
    });
    steps.push({
        scene: snapshot(`HashMap with capacity ${capacity}`),
        explain: 'An array of buckets. The hash function decides which one a key belongs to — that is what turns a search into a lookup.',
        vars: { capacity },
    });
    for (const operation of operations) {
        const index = indexFor(operation.key);
        buckets.forEach((entries) => entries.forEach((entry) => { entry.state = 'idle'; }));
        steps.push({
            scene: snapshot('hashing the key'),
            codeLine: 3,
            explain: `hash("${operation.key}") masked to the table size gives bucket ${index}. No searching — arithmetic.`,
            vars: { key: operation.key, bucket: index },
        });
        if (operation.op === 'put') {
            const bucket = buckets[index];
            const collision = bucket.length > 0;
            bucket.push({ key: operation.key, value: operation.value ?? 0, state: 'match' });
            steps.push({
                scene: snapshot(collision ? 'collision — appended to the chain' : 'stored'),
                codeLine: collision ? 5 : 4,
                explain: collision
                    ? `Bucket ${index} is already occupied — a collision. The entry joins that bucket's chain. Chains stay short while the load factor is under 0.75, which is why lookups stay O(1) on average.`
                    : `Bucket ${index} was empty, so the entry is stored directly.`,
                vars: { key: operation.key, bucket: index, chainLength: bucket.length },
            });
        }
        if (operation.op === 'get') {
            const bucket = buckets[index];
            const found = bucket.find((entry) => entry.key === operation.key);
            bucket.forEach((entry) => { entry.state = entry.key === operation.key ? 'match' : 'active'; });
            steps.push({
                scene: snapshot(found ? 'found' : 'not found'),
                codeLine: 5,
                explain: found
                    ? `Walk bucket ${index}'s chain comparing with equals(): found "${operation.key}" = ${found.value}.`
                    : `Bucket ${index} does not contain "${operation.key}" — the lookup fails after touching only this bucket, not the whole map.`,
                vars: { key: operation.key, bucket: index, result: found ? found.value : 'null' },
            });
        }
        if (operation.op === 'remove') {
            const bucket = buckets[index];
            const position = bucket.findIndex((entry) => entry.key === operation.key);
            if (position >= 0)
                bucket.splice(position, 1);
            steps.push({
                scene: snapshot('removed'),
                codeLine: 5,
                explain: `Removed "${operation.key}" from bucket ${index}.`,
                vars: { key: operation.key, bucket: index },
            });
        }
    }
    steps[steps.length - 1] = { ...steps[steps.length - 1], done: true };
    return cap(steps);
};
/** Two Sum in one pass: compute the complement, then look it up instead of searching. */
export const twoSumHash = (input) => {
    const values = numbers(input, 'array', [2, 7, 11, 15, 3]);
    const target = num(input, 'target', 18);
    const steps = [];
    const seen = new Map();
    const bucketsOf = (highlight) => ({
        caption: 'seen: value → index',
        buckets: [
            {
                index: 0,
                entries: [...seen.entries()].map(([key, value]) => ({
                    key: String(key),
                    value,
                    state: (key === highlight ? 'match' : 'idle'),
                })),
            },
        ],
    });
    steps.push({
        scene: {
            array: { values, states: states(values.length), caption: `nums (target ${target})` },
            buckets: bucketsOf(),
        },
        codeLine: 1,
        explain: 'The map will hold every value we have already walked past, with its index.',
        vars: { target },
    });
    for (let i = 0; i < values.length; i++) {
        const cellStates = states(values.length);
        for (let j = 0; j < i; j++)
            cellStates[j] = 'visited';
        cellStates[i] = 'active';
        const needed = target - values[i];
        steps.push({
            scene: { array: { values, states: cellStates, caption: 'nums' }, buckets: bucketsOf() },
            codeLine: 3,
            explain: `At index ${i}, value ${values[i]}. To reach ${target} we need ${needed}. We know exactly what we are looking for — so look it up, do not scan for it.`,
            vars: { i, value: values[i], need: needed },
        });
        if (seen.has(needed)) {
            const partner = seen.get(needed);
            const matched = states(values.length, 'visited');
            matched[i] = 'match';
            matched[partner] = 'match';
            steps.push({
                scene: { array: { values, states: matched, caption: 'nums' }, buckets: bucketsOf(needed) },
                codeLine: 5,
                explain: `${needed} is in the map at index ${partner}. Answer: [${partner}, ${i}] — found in one pass, O(n) instead of O(n²).`,
                vars: { answer: `[${partner}, ${i}]` },
                done: true,
            });
            return cap(steps);
        }
        seen.set(values[i], i);
        steps.push({
            scene: { array: { values, states: cellStates, caption: 'nums' }, buckets: bucketsOf(values[i]) },
            codeLine: 7,
            explain: `Not there yet. Record ${values[i]} → ${i}. (Storing AFTER the check is what stops an element pairing with itself.)`,
            vars: { i, stored: values[i] },
        });
    }
    steps.push({
        scene: { array: { values, states: states(values.length, 'visited'), caption: 'nums' }, buckets: bucketsOf() },
        codeLine: 9,
        explain: 'No pair adds up to the target.',
        done: true,
    });
    return cap(steps);
};
