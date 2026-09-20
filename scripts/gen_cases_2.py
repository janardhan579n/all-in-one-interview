"""Case studies batch 2: notification system + chat. Run: python3 scripts/gen_cases_2.py"""
import json, pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "content" / "system-design" / "case-studies"
OUT.mkdir(parents=True, exist_ok=True)
CS = []

CS.append({
  "id": "notification-system",
  "title": "Design a Notification System",
  "difficulty": "intermediate",
  "estimatedMinutes": 45,
  "summary": "Deliver push, SMS and email to millions of users through unreliable third parties, without duplicating messages, losing them, or letting one slow provider stall everything.",
  "steps": [
    {"key": "requirements", "title": "1. Clarify the problem", "content": "- Which channels: push (iOS/Android), SMS, email, in-app?\n- Triggered by user actions, by scheduled campaigns, or both?\n- Does ordering matter between notifications to the same user?\n- What are the delivery guarantees — at-least-once, or best effort per channel?\n- Do users control preferences and quiet hours? (Almost always yes, and it shapes the pipeline.)\n- Is there a rate limit per user so we do not become the thing they mute?"},
    {"key": "functional", "title": "2. Functional requirements", "content": "- Accept a notification request: recipient, template, payload, channel(s), priority.\n- Respect per-user preferences, opt-outs and quiet hours.\n- Render templates with localisation.\n- Deliver through the right third-party provider per channel.\n- Retry transient failures with backoff; give up eventually and record why.\n- Deduplicate: the same logical event must not produce two messages.\n- Expose delivery status and analytics."},
    {"key": "nonfunctional", "title": "3. Non-functional requirements", "content": "- **Scale**: 10M notifications/day average, 100k/s during a campaign burst.\n- **Latency**: transactional (OTP, password reset) under 5 seconds end to end. Marketing can take minutes.\n- **Reliability**: at-least-once with idempotent delivery. Losing an OTP is a support ticket; sending it twice is merely untidy.\n- **Isolation**: one channel's provider outage must not block the others.\n- **Compliance**: honour opt-outs absolutely, and keep an auditable record."},
    {"key": "estimation", "title": "4. Estimation", "content": "**Average rate**: 10M/day ÷ 86,400 ≈ **120/s**. Unremarkable.\n\n**Burst**: a campaign to 5M users sent 'now' at 100k/s is the number that shapes the design. Note the ratio — peak is 800× average. Provisioning synchronously for peak would be absurd; this is exactly what a queue is for.\n\n**Storage**: a delivery record ≈ 200 bytes. 10M/day × 200 B = 2 GB/day, ≈ 730 GB/year. Keep 90 days hot (~180 GB) and archive the rest.\n\n**Fan-out**: one campaign row expands into 5M individual messages. The expansion must happen in workers reading from a queue, never inside the API request."},
    {"key": "architecture", "title": "5. Architecture", "content": "The pipeline: **API → validation & preferences → per-channel queues → channel workers → third-party providers → status callbacks → analytics**.\n\nThe two decisions that matter:\n\n**Separate queues per channel.** If push, SMS and email share one queue, a slow SMS provider blocks email delivery behind it — head-of-line blocking. Separate queues mean each channel fails and scales independently.\n\n**Separate priority lanes.** Transactional OTPs must not queue behind a 5-million-message marketing campaign. A high-priority queue with its own workers keeps the 5-second SLA regardless of what marketing is doing."},
    {"key": "dedup", "title": "6. Deduplication and idempotency", "content": "At-least-once delivery means duplicates are guaranteed, not hypothetical: a worker can crash after calling the provider but before acknowledging the message.\n\nEvery notification carries an idempotency key — typically `hash(userId, eventId, channel)`. Before dispatching, the worker attempts an atomic insert of that key into a store with a TTL (Redis `SET NX`, or a unique constraint). If the insert fails, the notification has already been sent and the worker acknowledges without sending.\n\nThe unavoidable gap: the crash window between calling the provider and recording success. Recording the key *before* dispatch risks losing a message; recording it *after* risks a duplicate. For OTPs, prefer the duplicate."},
    {"key": "providers", "title": "7. Dealing with third-party providers", "content": "Providers are the least reliable part of this system, so design for their failure explicitly.\n\n- **Circuit breaker** per provider: after N consecutive failures, stop calling it for a cooling-off period. Without this, workers burn their time on timeouts and the queue backs up.\n- **Failover**: a secondary provider per channel, with automatic switchover. SMS especially.\n- **Rate limiting outbound**: providers impose their own limits, and exceeding them gets you throttled or blocked.\n- **Retry with exponential backoff and jitter** — 1s, 2s, 4s, 8s. Without jitter, all retries from one outage land simultaneously.\n- **Dead letter queue** after the retry budget, so a poison message never blocks the queue and someone can inspect it.\n- **Status callbacks**: delivery confirmation arrives asynchronously via webhook, so the final status is written by a different path than the send."},
    {"key": "preferences", "title": "8. Preferences, quiet hours and rate limits", "content": "Checked before enqueueing, so suppressed notifications never consume worker capacity.\n\n- Per-user, per-channel, per-category opt-in/out.\n- Quiet hours in the user's local timezone — scheduled for later rather than dropped, for anything non-urgent.\n- A per-user frequency cap ('at most 5 marketing messages per day') — the single most effective protection against users disabling notifications entirely.\n- Transactional notifications (OTP, security alerts) bypass marketing preferences but never bypass a hard legal opt-out."},
    {"key": "failure", "title": "9. Failure handling", "content": "- **Provider down**: circuit breaker opens, traffic fails over to the secondary, messages queue rather than vanish.\n- **Queue backed up**: consumer lag is the alert, not queue depth. Scale out workers; shed low-priority traffic first.\n- **Poison message**: retries exhausted, moved to the DLQ with the failure reason.\n- **Duplicate callback**: status updates must be idempotent too — providers retry webhooks.\n- **Campaign sent by mistake**: a kill switch that drains a campaign's queued messages. Worth designing before it is needed."},
    {"key": "final", "title": "10. Final architecture", "content": "API → preference/validation service → priority-and-channel-partitioned queues → per-channel worker pools with circuit breakers and provider failover → providers → webhook receiver → status store → analytics pipeline.\n\nThe shape is a direct consequence of two facts: the peak is 800× the average, and the providers are unreliable. Everything else follows."}
  ],
  "estimation": {
    "assumptions": ["10M notifications/day", "Campaign burst to 5M users", "~200 bytes per delivery record", "90-day hot retention"],
    "calculations": [
      {"label": "Average rate", "value": "~120/s", "working": "10,000,000 / 86,400"},
      {"label": "Campaign burst", "value": "~100,000/s", "working": "5M users delivered over ~50 s"},
      {"label": "Peak-to-average ratio", "value": "~800×", "working": "The single strongest argument for queueing"},
      {"label": "Storage per day", "value": "~2 GB", "working": "10M × 200 bytes"},
      {"label": "Hot storage (90 days)", "value": "~180 GB", "working": "2 GB × 90"}
    ]
  },
  "api": [
    {"method": "POST", "path": "/api/v1/notifications", "request": "{ \"userId\": \"…\", \"template\": \"order_shipped\", \"channels\": [\"push\",\"email\"], \"data\": {…}, \"priority\": \"transactional\", \"idempotencyKey\": \"…\" }", "response": "202 { \"notificationId\": \"…\", \"status\": \"queued\" }", "notes": "202, not 200 — the work has been accepted, not completed. Returns immediately after enqueueing."},
    {"method": "GET", "path": "/api/v1/notifications/{id}", "request": "—", "response": "200 { \"status\": \"delivered\", \"perChannel\": [{ \"channel\": \"push\", \"status\": \"delivered\", \"at\": \"…\" }] }", "notes": "Status is per channel; a notification can be delivered on push and bounced on email."},
    {"method": "PUT", "path": "/api/v1/users/{id}/preferences", "request": "{ \"marketing\": { \"email\": false }, \"quietHours\": { \"from\": \"22:00\", \"to\": \"08:00\", \"tz\": \"Asia/Kolkata\" } }", "response": "204", "notes": "Enforced before enqueueing."},
    {"method": "POST", "path": "/webhooks/providers/{provider}", "request": "provider-specific delivery receipt", "response": "200", "notes": "Must be idempotent — providers retry webhooks, sometimes for days."}
  ],
  "dataModel": [
    {"name": "notifications", "fields": [
      {"name": "id", "type": "UUID PRIMARY KEY", "notes": ""},
      {"name": "user_id", "type": "BIGINT", "notes": "partition key if sharded"},
      {"name": "template_id", "type": "VARCHAR", "notes": ""},
      {"name": "priority", "type": "VARCHAR", "notes": "transactional | marketing"},
      {"name": "idempotency_key", "type": "VARCHAR UNIQUE", "notes": "the deduplication guarantee"},
      {"name": "created_at", "type": "TIMESTAMP", "notes": ""}
    ], "indexes": ["UNIQUE (idempotency_key)", "INDEX (user_id, created_at)"]},
    {"name": "delivery_attempts", "fields": [
      {"name": "notification_id", "type": "UUID", "notes": ""},
      {"name": "channel", "type": "VARCHAR", "notes": "push | sms | email"},
      {"name": "provider", "type": "VARCHAR", "notes": "which provider handled it"},
      {"name": "status", "type": "VARCHAR", "notes": "queued | sent | delivered | bounced | failed"},
      {"name": "attempt", "type": "INT", "notes": "retry number"},
      {"name": "error", "type": "TEXT", "notes": "populated on failure"}
    ], "indexes": ["INDEX (notification_id)", "INDEX (status, created_at) for the retry sweeper"]},
    {"name": "user_preferences", "fields": [
      {"name": "user_id", "type": "BIGINT PRIMARY KEY", "notes": ""},
      {"name": "channel_opt_in", "type": "JSONB", "notes": "per channel, per category"},
      {"name": "quiet_hours", "type": "JSONB", "notes": "with timezone"},
      {"name": "device_tokens", "type": "JSONB", "notes": "push tokens; expire and must be pruned on rejection"}
    ], "indexes": ["PRIMARY KEY (user_id)"]}
  ],
  "evolution": [
    {
      "stage": "Stage 1 — send it inline",
      "problem": "None yet, but the request thread is calling a third-party API.",
      "change": "The app server calls the email provider directly during the request.",
      "why": "Fine at very low volume. The flaw is structural rather than about throughput: the user's request now depends on a third party's availability and latency.",
      "architecture": {
        "nodes": [
          {"id": "app", "label": "App server", "type": "server", "x": 260, "y": 300},
          {"id": "prov", "label": "Email provider", "type": "monitor", "x": 640, "y": 300, "note": "A slow provider now means slow page loads."}
        ],
        "edges": [{"from": "app", "to": "prov", "label": "synchronous call"}]
      }
    },
    {
      "stage": "Stage 2 — the provider has an outage",
      "problem": "The provider is down for 20 minutes. Requests time out, threads are consumed waiting, and signups start failing. A third party's outage has become yours.",
      "change": "Put a queue between the request and the provider; a worker sends asynchronously.",
      "why": "Fault isolation. The API writes a message and returns 202 in milliseconds. Messages accumulate during the outage and drain afterwards — nothing is lost and no user sees an error.",
      "architecture": {
        "nodes": [
          {"id": "app", "label": "API", "type": "server", "x": 180, "y": 300},
          {"id": "q", "label": "Queue", "type": "queue", "x": 450, "y": 300, "note": "Absorbs provider downtime as queue depth."},
          {"id": "w", "label": "Worker", "type": "worker", "x": 700, "y": 300},
          {"id": "prov", "label": "Provider", "type": "monitor", "x": 930, "y": 300}
        ],
        "edges": [
          {"from": "app", "to": "q"}, {"from": "q", "to": "w"}, {"from": "w", "to": "prov"}
        ]
      }
    },
    {
      "stage": "Stage 3 — three channels, and one blocks the others",
      "problem": "Push, SMS and email share one queue. The SMS provider slows to 2 seconds per message and email delivery stalls behind it — head-of-line blocking. Meanwhile a marketing campaign delays password-reset emails past any acceptable SLA.",
      "change": "Partition the queues by channel and by priority, with independent worker pools.",
      "why": "Independent failure domains. Each channel scales to its own provider's throughput, and transactional traffic gets a dedicated lane so a campaign can never delay an OTP.",
      "architecture": {
        "nodes": [
          {"id": "api", "label": "API", "type": "server", "x": 100, "y": 300},
          {"id": "pref", "label": "Preferences\\n& validation", "type": "server", "x": 290, "y": 300, "note": "Opt-outs and quiet hours applied BEFORE enqueueing."},
          {"id": "qt", "label": "Transactional queue", "type": "queue", "x": 520, "y": 160},
          {"id": "qm", "label": "Marketing queue", "type": "queue", "x": 520, "y": 300},
          {"id": "qs", "label": "SMS queue", "type": "queue", "x": 520, "y": 440},
          {"id": "wt", "label": "Push/email workers", "type": "worker", "x": 780, "y": 220},
          {"id": "ws", "label": "SMS workers", "type": "worker", "x": 780, "y": 440},
          {"id": "prov", "label": "Providers", "type": "monitor", "x": 980, "y": 300}
        ],
        "edges": [
          {"from": "api", "to": "pref"},
          {"from": "pref", "to": "qt"}, {"from": "pref", "to": "qm"}, {"from": "pref", "to": "qs"},
          {"from": "qt", "to": "wt"}, {"from": "qm", "to": "wt"}, {"from": "qs", "to": "ws"},
          {"from": "wt", "to": "prov"}, {"from": "ws", "to": "prov"}
        ]
      }
    },
    {
      "stage": "Stage 4 — scale, resilience and truth",
      "problem": "Campaign bursts of 100k/s, providers failing intermittently, duplicates reaching users, and no reliable record of what was actually delivered.",
      "change": "Add circuit breakers and provider failover, an idempotency store, a dead letter queue, a webhook receiver for delivery receipts, and an analytics pipeline.",
      "why": "Each addition answers a specific failure: breakers stop workers wasting time on a dead provider; the idempotency store prevents duplicates that at-least-once delivery guarantees will otherwise occur; the DLQ stops a poison message blocking the queue; webhooks supply the delivery truth the send path cannot know.",
      "architecture": {
        "nodes": [
          {"id": "api", "label": "API", "type": "server", "x": 80, "y": 300},
          {"id": "q", "label": "Channel queues", "type": "queue", "x": 280, "y": 300},
          {"id": "w", "label": "Workers\\n+ circuit breaker", "type": "worker", "x": 500, "y": 300},
          {"id": "idem", "label": "Idempotency store", "type": "cache", "x": 500, "y": 140, "note": "SET NX with TTL. Atomic claim before dispatch."},
          {"id": "p1", "label": "Provider A", "type": "monitor", "x": 730, "y": 220},
          {"id": "p2", "label": "Provider B (failover)", "type": "monitor", "x": 730, "y": 380},
          {"id": "dlq", "label": "Dead letter queue", "type": "queue", "x": 500, "y": 470},
          {"id": "hook", "label": "Webhook receiver", "type": "server", "x": 930, "y": 300, "note": "Delivery receipts arrive asynchronously and must be handled idempotently."},
          {"id": "store", "label": "Status + analytics", "type": "db", "x": 1000, "y": 460}
        ],
        "edges": [
          {"from": "api", "to": "q"}, {"from": "q", "to": "w"},
          {"from": "w", "to": "idem", "dashed": True},
          {"from": "w", "to": "p1"}, {"from": "w", "to": "p2", "label": "on breaker open", "dashed": True},
          {"from": "w", "to": "dlq", "label": "retries exhausted", "dashed": True},
          {"from": "p1", "to": "hook", "label": "receipt", "dashed": True},
          {"from": "hook", "to": "store"}
        ]
      }
    }
  ],
  "tradeoffs": [
    {"option": "At-least-once delivery", "pros": ["No notification is silently lost", "Simple broker semantics"], "cons": ["Duplicates occur and must be suppressed by an idempotency store"]},
    {"option": "At-most-once delivery", "pros": ["No duplicates"], "cons": ["A lost OTP is a support ticket — unacceptable for transactional traffic"]},
    {"option": "One queue for all channels", "pros": ["Simplest to operate"], "cons": ["Head-of-line blocking: one slow provider stalls every channel"]},
    {"option": "Queue per channel and priority", "pros": ["Independent scaling and failure domains", "Transactional SLA protected from campaigns"], "cons": ["More queues, dashboards and alerts to maintain"]}
  ],
  "interviewStages": [
    {"key": "requirements", "prompt": "What do you clarify first?", "hints": ["Channels, triggers, guarantees, preferences"], "modelAnswer": ["Which channels and who triggers them", "Delivery guarantee per channel — OTP and marketing differ", "Preferences, quiet hours, frequency caps", "Peak versus average volume"]},
    {"key": "isolation", "prompt": "A marketing campaign to 5M users is running. How do you protect password-reset emails?", "hints": ["What blocks what?"], "modelAnswer": ["Separate priority queues with dedicated worker pools", "Transactional traffic never shares a queue with bulk", "Optionally shed or throttle marketing when transactional lag rises"]},
    {"key": "duplicates", "prompt": "A worker crashes after calling the SMS provider but before acknowledging. What happens and how do you handle it?", "hints": ["At-least-once means redelivery"], "modelAnswer": ["The message is redelivered and the user could get two OTPs", "Atomic idempotency claim (SET NX with TTL) keyed on user+event+channel before dispatch", "The crash window cannot be fully closed — choose duplicate over loss for OTPs"]},
    {"key": "providers", "prompt": "Your SMS provider starts timing out on 30% of requests. What does your system do?", "hints": ["What are the workers doing while they wait?"], "modelAnswer": ["Circuit breaker opens after consecutive failures, stopping wasted worker time", "Fail over to the secondary provider", "Retry with exponential backoff and jitter; DLQ after the budget", "Alert on consumer lag, not on error count alone"]}
  ],
  "quiz": [
    {"id": "q1", "type": "architecture", "question": "Why use separate queues per channel rather than one shared queue?",
     "options": ["It is faster", "To avoid head-of-line blocking — a slow SMS provider would otherwise stall push and email behind it", "To save memory", "Queues cannot hold mixed message types"],
     "answerIndex": 1,
     "explanation": "Separate queues create independent failure domains and let each channel scale to its own provider's throughput."},
    {"id": "q2", "type": "architecture", "question": "At-least-once delivery means duplicates will happen. Where do you stop them?",
     "options": ["At the provider", "An atomic idempotency claim keyed on user+event+channel, checked by the worker before dispatching", "By disabling retries", "By using a database transaction around the provider call"],
     "answerIndex": 1,
     "explanation": "You cannot put a third-party API call inside a transaction. An atomic claim in Redis or a unique constraint is the practical mechanism."},
    {"id": "q3", "type": "architecture", "question": "Peak load is 800× the average. What does that justify?",
     "options": ["Provisioning workers for peak permanently", "A queue that absorbs the burst as depth, with workers draining at a sustainable rate", "Rejecting campaign traffic", "Vertical scaling"],
     "answerIndex": 1,
     "explanation": "Provisioning for an 800× peak means paying for idle capacity 99% of the time. Queueing converts a capacity problem into a latency-for-bulk-traffic problem, which is exactly the right trade."}
  ],
  "related": ["message-queue", "rate-limiting", "scaling"]
})

CS.append({
  "id": "chat-application",
  "title": "Design a Chat Application",
  "difficulty": "advanced",
  "estimatedMinutes": 50,
  "summary": "Real-time bidirectional messaging with ordering, delivery receipts, presence and offline delivery — where the interesting problem is that the server must push, not respond.",
  "steps": [
    {"key": "requirements", "title": "1. Clarify the problem", "content": "- One-to-one only, or group chats? What is the maximum group size? (This changes fan-out fundamentally.)\n- Delivery receipts: sent, delivered, read?\n- Presence — online/offline/typing?\n- Message history: how far back, and searchable?\n- Media attachments?\n- End-to-end encryption? (If yes, server-side search and moderation become impossible — a major constraint worth surfacing early.)\n\nFor this walkthrough: 1:1 and groups up to 500, full receipts, presence, unlimited history, media, no E2E encryption."},
    {"key": "functional", "title": "2. Functional requirements", "content": "- Send and receive messages in near real time.\n- Deliver to recipients who are currently offline, once they reconnect.\n- Per-message status: sent → delivered → read.\n- Online/offline presence and typing indicators.\n- Message history with pagination.\n- Group messaging with fan-out.\n- Messages within a conversation appear in a consistent order for everyone."},
    {"key": "nonfunctional", "title": "3. Non-functional requirements", "content": "- **Latency**: under 200 ms end to end for an online recipient. Above roughly 500 ms a conversation stops feeling live.\n- **Scale**: 50M daily active users, 10M concurrent connections, 500k messages/s at peak.\n- **Durability**: a message accepted by the server must never be lost. This is the hardest guarantee here.\n- **Ordering**: consistent per conversation. Global ordering across conversations is unnecessary and expensive.\n- **Availability**: a reconnect must be fast and must not lose messages sent while disconnected."},
    {"key": "estimation", "title": "4. Estimation", "content": "**Messages**: 50M DAU × 40 messages/day = 2B/day ≈ **23,000/s average**, peak ~**100,000/s**.\n\n**Connections**: 10M concurrent WebSockets. A well-tuned server handles roughly 50k–100k idle connections (memory, file descriptors, and kernel tuning are the limits), so **100–200 gateway servers** just to hold connections. Note that this number is driven by *connections*, not by message rate — an important distinction, because connection-holding and message-processing have completely different scaling profiles, which is why they are separated into different tiers.\n\n**Storage**: ~200 bytes per message (id, conversation, sender, timestamp, body, status). 2B/day × 200 B = **400 GB/day**, ≈ 146 TB/year. This obviously must be sharded, and it drives the choice of a write-optimised store.\n\n**Fan-out**: a 500-member group message becomes 500 deliveries. Groups multiply the write and delivery load far more than they multiply the send load."},
    {"key": "transport", "title": "5. Choosing the transport", "content": "The defining problem: the server must push to the client, and HTTP request/response cannot do that.\n\n**Short polling** — the client asks every N seconds. Trivial, but wastes enormous numbers of empty requests and adds up to N seconds of latency.\n\n**Long polling** — the request is held open until a message arrives. Better latency, still one connection per message cycle, awkward at scale.\n\n**Server-Sent Events** — a one-way server→client stream over HTTP. Good for feeds; insufficient here because the client must also send.\n\n**WebSocket** — a persistent bidirectional connection after an HTTP upgrade. The right choice: low per-message overhead and true push in both directions.\n\nThe cost of WebSockets is that connections are **stateful**, which breaks the usual 'any server can handle any request' model. That single consequence shapes the rest of the architecture."},
    {"key": "architecture", "title": "6. Architecture", "content": "Because connections are stateful, the design separates two concerns:\n\n**Connection gateways** hold the WebSocket connections and do almost nothing else. They are memory-bound and scale with concurrent users.\n\n**Chat services** handle message logic, persistence and fan-out. They are stateless and scale with message rate.\n\nBetween them sits a **session registry** (Redis) mapping `userId → gatewayId`, so any chat service can find which gateway holds a given user's connection and route a message there. When the recipient is offline, the message is persisted and a push notification is triggered instead.\n\nThat indirection is the core of the design: it restores 'any service can handle any message' on top of inherently sticky connections."},
    {"key": "ordering", "title": "7. Ordering and message IDs", "content": "Auto-incrementing database IDs do not work across shards, and client timestamps cannot be trusted — clocks are wrong, and a device in a different timezone with a skewed clock will reorder a conversation.\n\nUse **Snowflake-style 64-bit IDs**: timestamp (41 bits) + machine id (10 bits) + sequence (12 bits). These are roughly time-sortable, generated without coordination, and unique. Sorting by ID gives a stable, consistent order.\n\nOrdering is guaranteed **per conversation**, which is all anyone perceives. Global ordering across all conversations would require coordination that buys nothing a user can see."},
    {"key": "delivery", "title": "8. Delivery, receipts and offline users", "content": "The send path:\n\n1. Client sends over its WebSocket; the gateway forwards to a chat service.\n2. The service assigns an ID, **persists the message**, and acknowledges to the sender → status **sent**. Persisting before acknowledging is what makes the durability guarantee real.\n3. It looks up each recipient in the session registry.\n4. **Online**: route to that gateway, which pushes over the recipient's WebSocket. On receipt the client acknowledges → **delivered**.\n5. **Offline**: the message is already persisted; trigger a push notification. On reconnect, the client requests everything after its last received ID.\n6. When the recipient opens the conversation → **read**.\n\nReceipts are themselves messages flowing back through the same path, which keeps one mechanism rather than two."},
    {"key": "groups", "title": "9. Group messaging and fan-out", "content": "**Fan-out on write** — at send time, write a copy into each recipient's inbox. Reads are then a single fast query per user. Costs 500 writes for a 500-member group.\n\n**Fan-out on read** — store the message once per conversation; each reader queries the conversations they belong to. Cheap writes, more expensive reads.\n\nFor chat, **fan-out on write** is usually right: people read far more often than they send, and a per-user inbox makes unread counts and sync trivial. Very large groups (thousands) are the exception, and are typically handled as broadcast channels with fan-out on read — the same hybrid split that social feeds use for celebrity accounts."},
    {"key": "presence", "title": "10. Presence", "content": "Presence is deceptively expensive: naively, every status change notifies every contact, so it can generate more traffic than messaging itself.\n\n- Store presence in Redis with a TTL, refreshed by a heartbeat every ~30 seconds. A missed heartbeat expires the key naturally — no cleanup job, and it handles crashed clients correctly.\n- Only notify users who currently have that conversation open, rather than all contacts.\n- Batch and debounce updates; nobody needs sub-second presence accuracy.\n- Typing indicators are ephemeral and fire-and-forget: never persist them, and let them expire client-side after a few seconds."},
    {"key": "failure", "title": "11. Failure handling", "content": "- **Gateway dies**: its ~50k connections drop. Clients reconnect with exponential backoff *and jitter* — without jitter, 50k clients reconnect simultaneously and take down the replacement. On reconnect the client sends its last received message ID and receives the gap.\n- **Message sent while disconnected**: it is persisted, so it is delivered on reconnect. This is why persistence happens before the acknowledgement.\n- **Duplicate sends**: the client generates a UUID per message; the server deduplicates on it.\n- **Session registry down**: online delivery fails, and messages fall back to the persisted-plus-push path. Degraded but not broken.\n- **Hot conversation**: a very active group concentrates load on one partition; cap group size or split the partition."},
    {"key": "final", "title": "12. Final architecture", "content": "Clients → load balancer (WebSocket-aware) → connection gateways → message queue → chat services → Cassandra for messages, Redis for sessions and presence, object storage for media, push providers for offline delivery.\n\nThe two ideas that carry the design: separate the stateful connection tier from the stateless logic tier, and persist before acknowledging."}
  ],
  "estimation": {
    "assumptions": ["50M daily active users", "40 messages per user per day", "10M concurrent connections", "~200 bytes per message", "Groups up to 500"],
    "calculations": [
      {"label": "Messages/s average", "value": "~23,000/s", "working": "50M × 40 / 86,400"},
      {"label": "Messages/s peak", "value": "~100,000/s", "working": "~4x average"},
      {"label": "Gateway servers", "value": "100–200", "working": "10M connections / ~50-100k per server"},
      {"label": "Storage per day", "value": "~400 GB", "working": "2B messages × 200 bytes"},
      {"label": "Storage per year", "value": "~146 TB", "working": "Sharding is mandatory, not optional"}
    ]
  },
  "api": [
    {"method": "WS", "path": "/ws/connect", "request": "Upgrade with an auth token", "response": "Persistent connection; server pushes message/receipt/presence frames", "notes": "The hot path. Heartbeat every ~30 s to detect dead connections."},
    {"method": "WS", "path": "(frame) send_message", "request": "{ \"clientMsgId\": \"uuid\", \"conversationId\": \"…\", \"body\": \"…\" }", "response": "{ \"serverMsgId\": \"snowflake\", \"status\": \"sent\", \"ts\": … }", "notes": "clientMsgId makes the send idempotent across reconnects."},
    {"method": "GET", "path": "/api/v1/conversations/{id}/messages?before={msgId}&limit=50", "request": "—", "response": "200 { \"messages\": [...], \"hasMore\": true }", "notes": "Cursor pagination by message id, never by offset — the collection changes underneath."},
    {"method": "GET", "path": "/api/v1/sync?since={msgId}", "request": "—", "response": "200 { \"messages\": [...] }", "notes": "Called on reconnect to fetch everything missed. This is what makes offline delivery work."},
    {"method": "POST", "path": "/api/v1/media", "request": "multipart or a pre-signed upload URL request", "response": "201 { \"mediaId\": \"…\", \"url\": \"…\" }", "notes": "Media goes to object storage directly via a pre-signed URL — never through the chat servers."}
  ],
  "dataModel": [
    {"name": "messages (Cassandra)", "fields": [
      {"name": "conversation_id", "type": "UUID", "notes": "PARTITION KEY — all of a conversation's messages live together"},
      {"name": "message_id", "type": "BIGINT", "notes": "CLUSTERING KEY, Snowflake, descending for recent-first reads"},
      {"name": "sender_id", "type": "BIGINT", "notes": ""},
      {"name": "body", "type": "TEXT", "notes": ""},
      {"name": "media_id", "type": "UUID", "notes": "nullable"},
      {"name": "created_at", "type": "TIMESTAMP", "notes": "server time, not client time"}
    ], "indexes": ["PRIMARY KEY ((conversation_id), message_id DESC) — one partition per conversation, ordered reads for free"]},
    {"name": "user_inbox (fan-out on write)", "fields": [
      {"name": "user_id", "type": "BIGINT", "notes": "PARTITION KEY"},
      {"name": "message_id", "type": "BIGINT", "notes": "CLUSTERING KEY DESC"},
      {"name": "conversation_id", "type": "UUID", "notes": ""},
      {"name": "status", "type": "VARCHAR", "notes": "delivered | read"}
    ], "indexes": ["PRIMARY KEY ((user_id), message_id DESC) — makes sync and unread counts a single partition read"]},
    {"name": "sessions (Redis)", "fields": [
      {"name": "user:{id}:gateway", "type": "STRING", "notes": "which gateway holds the connection; TTL refreshed by heartbeat"},
      {"name": "user:{id}:presence", "type": "STRING", "notes": "online/away; expires naturally when heartbeats stop"}
    ], "indexes": ["TTL ~60 s, refreshed every 30 s"]}
  ],
  "evolution": [
    {
      "stage": "Stage 1 — polling",
      "problem": "Nothing yet. It works, and it is the right place to start.",
      "change": "Clients poll GET /messages every 3 seconds.",
      "why": "Simple and stateless. The flaws are structural: up to 3 seconds of latency, and with 10,000 users that is 3,300 requests/s of which almost all return nothing.",
      "architecture": {
        "nodes": [
          {"id": "c", "label": "Clients", "type": "client", "x": 220, "y": 300},
          {"id": "app", "label": "App server", "type": "server", "x": 540, "y": 300, "note": "Mostly answering 'nothing new'."},
          {"id": "db", "label": "Database", "type": "db", "x": 860, "y": 300}
        ],
        "edges": [{"from": "c", "to": "app", "label": "poll every 3s"}, {"from": "app", "to": "db"}]
      }
    },
    {
      "stage": "Stage 2 — WebSockets",
      "problem": "Polling latency makes conversation feel broken, and empty polls dominate the traffic.",
      "change": "Persistent WebSocket connections; the server pushes messages as they arrive.",
      "why": "Latency drops from seconds to tens of milliseconds and the wasted traffic disappears. The new problem it creates is that connections are now stateful — a specific user is attached to a specific server, which breaks the assumption that any instance can serve any request.",
      "architecture": {
        "nodes": [
          {"id": "c", "label": "Clients", "type": "client", "x": 180, "y": 300},
          {"id": "lb", "label": "LB (WS-aware)", "type": "lb", "x": 420, "y": 300},
          {"id": "ws", "label": "WebSocket server", "type": "server", "x": 700, "y": 300, "note": "Holds connections AND runs message logic — fine at one instance, a problem at two."},
          {"id": "db", "label": "Database", "type": "db", "x": 950, "y": 300}
        ],
        "edges": [
          {"from": "c", "to": "lb", "label": "WSS"}, {"from": "lb", "to": "ws"}, {"from": "ws", "to": "db"}
        ]
      }
    },
    {
      "stage": "Stage 3 — several servers, and messages go missing",
      "problem": "Alice is connected to server 1 and Bob to server 2. Server 1 receives Alice's message and has no way to reach Bob's connection. Cross-server delivery simply does not happen.",
      "change": "Add a session registry (Redis) mapping user → gateway, and a message bus between servers.",
      "why": "This is the defining problem of stateful connections at scale. The registry lets any server discover where a recipient is attached and route to it, restoring the ability to scale horizontally on top of sticky connections.",
      "architecture": {
        "nodes": [
          {"id": "c", "label": "Clients", "type": "client", "x": 90, "y": 300},
          {"id": "lb", "label": "Load Balancer", "type": "lb", "x": 270, "y": 300},
          {"id": "g1", "label": "Gateway 1", "type": "server", "x": 490, "y": 180},
          {"id": "g2", "label": "Gateway 2", "type": "server", "x": 490, "y": 420},
          {"id": "sess", "label": "Session registry\\n(Redis)", "type": "cache", "x": 730, "y": 140, "note": "userId -> gatewayId. The piece that makes cross-server delivery possible."},
          {"id": "bus", "label": "Message bus", "type": "queue", "x": 730, "y": 300, "note": "Routes a message to whichever gateway holds the recipient."},
          {"id": "db", "label": "Database", "type": "db", "x": 960, "y": 300}
        ],
        "edges": [
          {"from": "c", "to": "lb"}, {"from": "lb", "to": "g1"}, {"from": "lb", "to": "g2"},
          {"from": "g1", "to": "sess", "dashed": True}, {"from": "g2", "to": "sess", "dashed": True},
          {"from": "g1", "to": "bus"}, {"from": "bus", "to": "g2"}, {"from": "bus", "to": "db"}
        ]
      }
    },
    {
      "stage": "Stage 4 — 10M concurrent users",
      "problem": "Connection handling and message processing have completely different scaling profiles, but they are running in the same process. Message storage has outgrown any single database, and offline users receive nothing.",
      "change": "Split into a thin connection tier and a stateless chat-service tier; move messages to Cassandra partitioned by conversation; add push notifications for offline recipients and object storage for media.",
      "why": "Gateways are memory-bound and scale with connections; chat services are CPU-bound and scale with message rate — separating them lets each scale on its own axis. Cassandra suits the access pattern exactly: high write throughput, partition by conversation, clustered by message id so 'the last 50 messages' is a single ordered partition read.",
      "architecture": {
        "nodes": [
          {"id": "c", "label": "Clients", "type": "client", "x": 70, "y": 300},
          {"id": "lb", "label": "LB", "type": "lb", "x": 210, "y": 300},
          {"id": "gw", "label": "Connection gateways\\n(100-200 nodes)", "type": "server", "x": 390, "y": 300, "note": "Hold WebSockets. Almost no logic."},
          {"id": "sess", "label": "Session + presence\\n(Redis)", "type": "cache", "x": 590, "y": 140},
          {"id": "q", "label": "Message bus", "type": "queue", "x": 590, "y": 300},
          {"id": "chat", "label": "Chat services\\n(stateless)", "type": "worker", "x": 790, "y": 300, "note": "IDs, persistence, fan-out, receipts."},
          {"id": "cass", "label": "Cassandra\\n(messages)", "type": "db", "x": 990, "y": 220, "note": "Partitioned by conversation, clustered by message id."},
          {"id": "push", "label": "Push service", "type": "monitor", "x": 990, "y": 380, "note": "For recipients who are offline."},
          {"id": "s3", "label": "Object storage\\n(media)", "type": "storage", "x": 790, "y": 470, "note": "Pre-signed uploads: media never transits the chat servers."}
        ],
        "edges": [
          {"from": "c", "to": "lb"}, {"from": "lb", "to": "gw"},
          {"from": "gw", "to": "q"}, {"from": "q", "to": "chat"},
          {"from": "chat", "to": "sess", "dashed": True},
          {"from": "chat", "to": "cass"},
          {"from": "chat", "to": "push", "label": "offline", "dashed": True},
          {"from": "c", "to": "s3", "label": "direct upload", "dashed": True}
        ]
      }
    }
  ],
  "tradeoffs": [
    {"option": "WebSocket", "pros": ["True bidirectional push, low per-message overhead, low latency"], "cons": ["Stateful connections complicate load balancing and deploys", "Some corporate proxies interfere", "Memory cost per idle connection"]},
    {"option": "Long polling", "pros": ["Works through any proxy, no special infrastructure"], "cons": ["Higher latency and overhead, one connection cycle per message"]},
    {"option": "Fan-out on write", "pros": ["Fast reads, trivial unread counts and sync"], "cons": ["N writes per group message; expensive for very large groups"]},
    {"option": "Fan-out on read", "pros": ["One write per message regardless of group size"], "cons": ["Reads must merge across conversations; slower and harder to paginate"]}
  ],
  "interviewStages": [
    {"key": "transport", "prompt": "How does the server push a message to a client that did not ask for it?", "hints": ["Compare polling, long polling, SSE and WebSocket"], "modelAnswer": ["WebSocket — persistent bidirectional connection after an HTTP upgrade", "Polling wastes requests and adds latency; SSE is one-directional", "The cost is stateful connections, which shapes everything downstream"]},
    {"key": "routing", "prompt": "Alice is on gateway 1, Bob on gateway 2. How does Alice's message reach Bob?", "hints": ["What does gateway 1 not know?"], "modelAnswer": ["A session registry maps userId to gatewayId", "Gateway 1 (or the chat service) looks Bob up and routes via the message bus", "If Bob is absent from the registry, he is offline: persist and send a push notification"]},
    {"key": "ordering", "prompt": "How do you guarantee messages appear in the same order for everyone?", "hints": ["Why not client timestamps? Why not auto-increment?"], "modelAnswer": ["Snowflake-style IDs: time-sortable, generated without coordination", "Client clocks are unreliable; auto-increment does not work across shards", "Order per conversation, which is all a user can perceive"]},
    {"key": "offline", "prompt": "Bob's phone is off. Alice sends five messages. Bob reconnects. Walk me through it.", "hints": ["When is the message persisted relative to the acknowledgement?"], "modelAnswer": ["Each message is persisted before Alice is acknowledged, so nothing depends on Bob being reachable", "Push notifications are triggered for an offline recipient", "On reconnect Bob calls /sync?since=lastMessageId and receives the gap, then acknowledges delivery"]},
    {"key": "failure", "prompt": "A gateway holding 50,000 connections crashes. What happens?", "hints": ["What do 50,000 clients do at the same instant?"], "modelAnswer": ["Connections drop; clients reconnect with exponential backoff AND jitter, or they stampede the replacement", "The load balancer distributes them across healthy gateways", "Each client syncs from its last received id, so no message is lost — because persistence already happened"]}
  ],
  "quiz": [
    {"id": "q1", "type": "architecture", "question": "Why does WebSocket complicate horizontal scaling in a way that HTTP does not?",
     "options": ["It uses more bandwidth", "Connections are stateful — a user is attached to one specific server, so another server cannot reach them without a session registry", "It is not supported by load balancers", "It requires more CPU"],
     "answerIndex": 1,
     "explanation": "HTTP's statelessness is what lets any instance serve any request. Persistent connections break that, and the session registry is what restores routability."},
    {"id": "q2", "type": "architecture", "question": "Why not order messages by the timestamp the client attaches?",
     "options": ["Timestamps are too large", "Client clocks are unreliable and can be skewed or deliberately wrong, so a conversation would display out of order", "Timestamps are not unique", "It works fine"],
     "answerIndex": 1,
     "explanation": "Never trust a client clock for ordering. Server-assigned, time-sortable IDs (Snowflake) give ordering without requiring coordination between shards."},
    {"id": "q3", "type": "architecture", "question": "A 500-member group receives a message. With fan-out on write, what happens?",
     "options": ["One write", "500 inbox writes, making reads and unread counts cheap for every member afterwards", "Nothing until someone reads", "The message is rejected"],
     "answerIndex": 1,
     "explanation": "Write amplification in exchange for cheap reads. Since chat is read-heavy this is usually right — but very large groups flip the trade, which is why broadcast channels use fan-out on read."},
    {"id": "q4", "type": "architecture", "question": "A gateway with 50,000 connections dies and all clients reconnect at once. What prevents a cascade?",
     "options": ["Nothing, it is unavoidable", "Exponential backoff with jitter, so reconnections spread over time instead of arriving simultaneously", "Rejecting reconnections", "Restarting the load balancer"],
     "answerIndex": 1,
     "explanation": "Without jitter, synchronised retries recreate the spike on the replacement instance. Jitter is what turns a thundering herd into a manageable ramp."}
  ],
  "related": ["message-queue", "sharding", "replication", "cap-theorem"]
})

for c in CS:
    (OUT / (c["id"] + ".json")).write_text(json.dumps(c, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("wrote", len(CS), "case studies")
