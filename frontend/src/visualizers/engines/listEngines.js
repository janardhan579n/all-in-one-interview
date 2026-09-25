import { cap, numbers, text } from '../types';
function toNodes(values, marks) {
    return values.map((node) => ({ id: node.id, value: node.value, state: marks[node.id] ?? 'idle' }));
}
/** Traverse, insert and delete — with the ORDER of the two insert assignments made visible. */
export const linkedListOps = (input) => {
    const initial = numbers(input, 'values', [10, 20, 30, 40]);
    const operations = (Array.isArray(input.operations) ? input.operations : []);
    const steps = [];
    let nodes = initial.map((value, i) => ({ id: `n${i}`, value }));
    let nextId = initial.length;
    const scene = (marks, caption, pointers = []) => ({
        list: {
            nodes: toNodes(nodes, marks),
            pointers: pointers.map((p) => ({ ...p, tone: 'brand' })),
            caption,
        },
    });
    steps.push({
        scene: scene({}, 'head → … → null'),
        explain: 'A chain of nodes. Each holds a value and the address of the next; the last points at null.',
        vars: { length: nodes.length },
    });
    for (const operation of operations) {
        if (operation.op === 'traverse') {
            for (let i = 0; i < nodes.length; i++) {
                const marks = {};
                for (let k = 0; k < i; k++)
                    marks[nodes[k].id] = 'visited';
                marks[nodes[i].id] = 'active';
                steps.push({
                    scene: scene(marks, 'traverse', [{ name: 'cur', nodeId: nodes[i].id }]),
                    codeLine: 1,
                    explain: `Follow next to reach node ${i} (value ${nodes[i].value}). There is no shortcut — reaching index i costs i hops, which is why access is O(n).`,
                    vars: { index: i, value: nodes[i].value },
                });
            }
        }
        if (operation.op === 'insertAfter' && operation.index !== undefined && operation.value !== undefined) {
            const anchor = nodes[operation.index];
            const fresh = { id: `n${nextId++}`, value: operation.value };
            steps.push({
                scene: scene({ [anchor.id]: 'active' }, 'insert: step 1 of 2', [{ name: 'cur', nodeId: anchor.id }]),
                codeLine: 2,
                explain: `Point the NEW node at the rest of the list first. Do this the other way round and everything after \`cur\` becomes unreachable.`,
                vars: { after: anchor.value, inserting: operation.value },
            });
            nodes = [...nodes.slice(0, operation.index + 1), fresh, ...nodes.slice(operation.index + 1)];
            steps.push({
                scene: scene({ [fresh.id]: 'match', [anchor.id]: 'active' }, 'insert: step 2 of 2'),
                codeLine: 3,
                explain: `Only now relink the predecessor. Two assignments, O(1) — no elements were shifted, unlike an array.`,
                vars: { length: nodes.length },
            });
        }
        if (operation.op === 'deleteAt' && operation.index !== undefined) {
            const doomed = nodes[operation.index];
            steps.push({
                scene: scene({ [doomed.id]: 'reject' }, 'delete'),
                codeLine: 4,
                explain: `Skip over node ${operation.index} by pointing its predecessor at its successor. The node itself is simply no longer reachable.`,
                vars: { removing: doomed.value },
            });
            nodes = nodes.filter((node) => node.id !== doomed.id);
            steps.push({
                scene: scene({}, 'after delete'),
                codeLine: 4,
                explain: 'O(1) — given that we already held the predecessor. Finding it would have been O(n).',
                vars: { length: nodes.length },
            });
        }
        if (operation.op === 'insertHead' && operation.value !== undefined) {
            const fresh = { id: `n${nextId++}`, value: operation.value };
            nodes = [fresh, ...nodes];
            steps.push({
                scene: scene({ [fresh.id]: 'match' }, 'insert at head'),
                codeLine: 5,
                explain: `Inserting at the head is always O(1) — which is exactly why a stack can be a linked list.`,
                vars: { length: nodes.length },
            });
        }
    }
    steps[steps.length - 1] = { ...steps[steps.length - 1], done: true };
    return cap(steps);
};
/**
 * In-place reversal with three pointers.
 *
 * The line that matters is saving `next` BEFORE overwriting `curr.next`. Miss it and the rest
 * of the list is lost on the first iteration.
 */
export const linkedListReverse = (input) => {
    const values = numbers(input, 'values', [1, 2, 3, 4, 5]);
    const steps = [];
    const nodes = values.map((value, i) => ({ id: `n${i}`, value }));
    let order = [...nodes];
    let reversed = [];
    const scene = (caption, marks, pointers) => ({
        list: {
            nodes: [...[...reversed].reverse(), ...order].map((node) => ({
                id: node.id,
                value: node.value,
                state: marks[node.id] ?? (reversed.includes(node) ? 'visited' : 'idle'),
            })),
            pointers: pointers.map((p) => ({ ...p, tone: 'brand' })),
            caption,
        },
    });
    steps.push({
        scene: scene('original list', {}, [{ name: 'curr', nodeId: order[0]?.id ?? null }]),
        codeLine: 2,
        explain: 'prev starts at null — it will become the tail of the reversed list.',
        vars: { prev: 'null', curr: order[0]?.value ?? 'null' },
    });
    while (order.length > 0) {
        const current = order[0];
        const next = order[1];
        steps.push({
            scene: scene('remember the rest', { [current.id]: 'active', ...(next ? { [next.id]: 'target' } : {}) }, [{ name: 'curr', nodeId: current.id }, { name: 'next', nodeId: next?.id ?? null }]),
            codeLine: 4,
            explain: next
                ? `Save next = ${next.value} BEFORE overwriting curr.next. Skip this and the remainder of the list is unreachable.`
                : 'curr is the last node; next is null.',
            vars: { curr: current.value, next: next ? next.value : 'null' },
        });
        reversed = [...reversed, current];
        order = order.slice(1);
        steps.push({
            scene: scene('link flipped', { [current.id]: 'match' }, [{ name: 'prev', nodeId: current.id }, { name: 'curr', nodeId: next?.id ?? null }]),
            codeLine: 5,
            explain: `Flip this node's pointer to face backwards. The reversed portion now ends at ${current.value}.`,
            vars: { prev: current.value, curr: next ? next.value : 'null' },
        });
    }
    steps.push({
        scene: scene('reversed', {}, [{ name: 'head', nodeId: reversed[reversed.length - 1]?.id ?? null }]),
        codeLine: 9,
        explain: 'curr is null, so the loop ends and prev is the new head. One pass, O(n) time, O(1) space — nothing was copied.',
        done: true,
    });
    return cap(steps);
};
/**
 * Fast and slow pointers: find the middle, detect a cycle, or locate the cycle entry.
 *
 * The mode comes from the content, so one engine serves all three lessons. The cycle
 * animation is the interesting one — watch the gap between the pointers shrink by exactly
 * one node per step, which is why a meeting is guaranteed rather than lucky.
 */
export const fastSlowPointer = (input) => {
    const values = numbers(input, 'values', [1, 2, 3, 4, 5, 6, 7]);
    const cycleAt = typeof input.cycleAt === 'number' ? input.cycleAt : null;
    const mode = text(input, 'mode', 'middle');
    const steps = [];
    const nodes = values.map((value, i) => ({ id: `n${i}`, value }));
    const nextIndex = (i) => {
        if (i + 1 < nodes.length)
            return i + 1;
        return cycleAt !== null ? cycleAt : null;
    };
    const scene = (slow, fast, caption, extra = {}) => {
        const marks = { ...extra };
        if (slow !== null)
            marks[nodes[slow].id] = marks[nodes[slow].id] ?? 'active';
        if (fast !== null)
            marks[nodes[fast].id] = fast === slow ? 'match' : 'target';
        return {
            list: {
                nodes: nodes.map((node) => ({ id: node.id, value: node.value, state: marks[node.id] ?? 'idle' })),
                pointers: [
                    { name: 'slow', nodeId: slow !== null ? nodes[slow].id : null, tone: 'good' },
                    { name: 'fast', nodeId: fast !== null ? nodes[fast].id : null, tone: 'warn' },
                ],
                cycleTo: cycleAt,
                caption,
            },
        };
    };
    let slow = 0;
    let fast = 0;
    let stepCount = 0;
    steps.push({
        scene: scene(slow, fast, cycleAt !== null ? 'list with a cycle' : 'list'),
        codeLine: 1,
        explain: mode === 'cycle'
            ? 'Both pointers start at the head. If the list loops, the faster one must eventually lap the slower one.'
            : 'Both pointers start at the head. fast moves twice as far, so when it finishes, slow is halfway.',
        vars: { slow: values[0], fast: values[0] },
    });
    // Mirrors `while (fast != null && fast.next != null)` exactly. The subtlety the tests
    // caught: when fast.next.next is null, the body STILL runs — slow advances and fast becomes
    // null — which is why an even-length list ends on the SECOND middle, not the first.
    while (fast !== null) {
        const fastNext = nextIndex(fast);
        if (fastNext === null) {
            steps.push({
                scene: scene(slow, fast, 'fast.next is null — the loop ends'),
                codeLine: 2,
                explain: 'fast has no next node, so the guard fails and the loop ends.',
                vars: { slow: slow !== null ? values[slow] : 'null' },
            });
            break;
        }
        slow = slow !== null ? nextIndex(slow) : null;
        fast = nextIndex(fastNext);
        stepCount++;
        if (fast === null) {
            steps.push({
                scene: scene(slow, null, 'fast ran off the end'),
                codeLine: 4,
                explain: `fast stepped past the last node and is now null; slow advanced to ${slow !== null ? values[slow] : '?'}. fast travelled ${stepCount * 2} nodes, slow ${stepCount}.`,
                vars: { slow: slow !== null ? values[slow] : 'null', 'slow steps': stepCount },
            });
            break;
        }
        const gap = slow !== null && cycleAt !== null ? distanceInCycle(slow, fast, nodes.length, cycleAt) : null;
        steps.push({
            scene: scene(slow, fast, 'one step: slow +1, fast +2'),
            codeLine: 4,
            explain: cycleAt !== null && gap !== null
                ? `slow → ${slow !== null ? values[slow] : '?'}, fast → ${values[fast]}. Gap around the cycle: ${gap}. It shrinks by exactly one every step, so it must reach zero.`
                : `slow → ${slow !== null ? values[slow] : '?'}, fast → ${values[fast]}. fast has travelled ${stepCount * 2} nodes, slow ${stepCount}.`,
            vars: {
                slow: slow !== null ? values[slow] : 'null',
                fast: values[fast],
                'slow steps': stepCount,
                'fast steps': stepCount * 2,
            },
        });
        if (slow !== null && slow === fast) {
            steps.push({
                scene: scene(slow, fast, 'they met', { [nodes[slow].id]: 'match' }),
                codeLine: mode === 'entry' ? 1 : 5,
                explain: 'The pointers are on the same node. A meeting can only happen inside a cycle — this proves one exists.',
                vars: { meetingAt: values[slow] },
            });
            if (mode !== 'entry') {
                steps.push({
                    scene: scene(slow, fast, 'cycle detected', { [nodes[slow].id]: 'match' }),
                    codeLine: 6,
                    explain: 'Return true. O(n) time and — the whole point — O(1) space, unlike the HashSet solution.',
                    done: true,
                });
                return cap(steps);
            }
            // Phase 2: restart one pointer at the head and walk both at speed 1.
            let walker = 0;
            let chaser = slow;
            steps.push({
                scene: scene(chaser, walker, 'phase 2: restart from the head'),
                codeLine: 3,
                explain: 'Because a + b = mc, the distance from the head to the entry equals the distance from the meeting point to the entry. So walk both at the SAME speed.',
                vars: { walker: values[walker], chaser: values[chaser] },
            });
            while (walker !== chaser) {
                walker = nextIndex(walker);
                chaser = nextIndex(chaser);
                steps.push({
                    scene: scene(chaser, walker, 'converging on the entry'),
                    codeLine: 5,
                    explain: `Both advance one node: ${values[walker]} and ${values[chaser]}.`,
                    vars: { walker: values[walker], chaser: values[chaser] },
                });
            }
            steps.push({
                scene: scene(walker, walker, 'cycle entry found', { [nodes[walker].id]: 'match' }),
                codeLine: 8,
                explain: `They meet at ${values[walker]} — the first node of the cycle.`,
                vars: { entry: values[walker] },
                done: true,
            });
            return cap(steps);
        }
    }
    steps.push({
        scene: scene(slow, null, mode === 'cycle' ? 'no cycle' : 'middle found', slow !== null ? { [nodes[slow].id]: 'match' } : {}),
        codeLine: mode === 'cycle' ? 9 : 6,
        explain: mode === 'cycle'
            ? 'fast reached the end, so there is no cycle. Return false.'
            : `slow stopped at ${slow !== null ? values[slow] : '?'} — the middle, found in a single pass with no length count.`,
        vars: { middle: slow !== null ? values[slow] : 'null' },
        done: true,
    });
    return cap(steps);
};
/** Distance from slow forward to fast, measured around the cycle. */
function distanceInCycle(slow, fast, length, cycleAt) {
    const cycleLength = length - cycleAt;
    const positionOf = (index) => (index < cycleAt ? -1 : index - cycleAt);
    const s = positionOf(slow);
    const f = positionOf(fast);
    if (s < 0 || f < 0)
        return Math.abs(fast - slow);
    return (f - s + cycleLength) % cycleLength;
}
