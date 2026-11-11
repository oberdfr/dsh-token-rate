/**
 * Host half: real-time token rate per session, with main/subagent breakdown.
 *
 * Frame facts (verified against live `agent/assistant-stream` output):
 *  - `text-delta` / `reasoning-delta` chunks carry only text (no token count);
 *  - `usage` chunks carry the provider's authoritative `outputTokens`
 *    (already including reasoning tokens) once per step;
 *  - `tool-call-delta` marks a step whose output tokens include tool arguments
 *    we never see as text, so such a step must NOT calibrate the ratio;
 *  - `frame.time` is an epoch-ms timestamp shared by all chunks;
 *  - `session.header.delegationDepth` is 0 for the main session, >0 for subagents.
 *
 * The rate therefore comes from the provider's own counts, calibrated live from
 * steps that have clean text, over a multi-second window to kill burst spikes.
 */

const WINDOW_MS = 2500;
const MIN_WINDOW_MS = 700;
const MIN_STEP_MS = 500;
const MIN_CALIBRATION_CHARS = 150;
const DEFAULT_TOKENS_PER_CHAR = 0.3;
const MIN_TOKENS_PER_CHAR = 0.12;
const MAX_TOKENS_PER_CHAR = 0.75;
const MAX_RATE = 400;
const FRESH_MS = 3000;

export const inject = ['webServer'];

let calibratedTokensPerChar = DEFAULT_TOKENS_PER_CHAR;

/** attemptId -> attempt */
const attempts = new Map();
/** sessionId -> { depth, rate, outputTokens, lastAt, label } */
const sessions = new Map();
/** cached descendant catalogs: rootId -> { at, list } */
const descendantCache = new Map();

function num(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function clamp(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value;
}

function sessionOf(id, depth) {
  let s = sessions.get(id);
  if (s === undefined) {
    s = { depth, rate: 0, outputTokens: 0, tokenAccum: 0, timeAccum: 0, lastAt: 0, steps: 0 };
    sessions.set(id, s);
    if (sessions.size > 64) {
      const oldest = sessions.keys().next().value;
      if (oldest !== undefined && oldest !== id) sessions.delete(oldest);
    }
  }
  if (depth !== undefined) s.depth = depth;
  return s;
}

function windowRate(a, time) {
  const cutoff = time - WINDOW_MS;
  let first = -1;
  for (let i = a.samples.length - 1; i >= 0; i -= 1) {
    if (a.samples[i].time >= cutoff) first = i;
    else break;
  }
  if (first < 0) return undefined;
  const from = a.samples[first];
  const to = a.samples[a.samples.length - 1];
  const dt = to.time - from.time;
  if (dt < MIN_WINDOW_MS) return undefined;
  return ((to.chars - from.chars) * calibratedTokensPerChar) / (dt / 1000);
}

function onFrame(payload) {
  const frame = payload && payload.frame;
  if (frame === undefined || frame === null) return;
  const agent = payload.agent;
  const session = agent && agent.session;
  const sessionId = session && typeof session.id === "string" ? session.id : null;
  if (sessionId === null) return;
  const header = session.header;
  const depth = header && num(header.delegationDepth);
  const sessionState = sessionOf(sessionId, depth);

  const type = frame.type;
  const attemptId = typeof frame.attemptId === "string" ? frame.attemptId : "unknown";
  const time = num(frame.time) ?? Date.now();

  if (type === "start") {
    attempts.set(attemptId, {
      sessionId,
      startTime: time,
      chars: 0,
      hadToolArgs: false,
      samples: [],
      stepRate: 0,
      usageTokens: 0,
      lastAt: time,
    });
    return;
  }

  if (type === "end") {
    attempts.delete(attemptId);
    return;
  }

  if (type !== "chunk") return;
  const chunk = frame.chunk;
  if (chunk === null || typeof chunk !== "object") return;

  let a = attempts.get(attemptId);
  if (a === undefined) {
    a = { sessionId, startTime: time, chars: 0, hadToolArgs: false, samples: [], stepRate: 0, usageTokens: 0, lastAt: time };
    attempts.set(attemptId, a);
  }
  a.lastAt = time;

  if (chunk.type === "tool-call-delta") {
    a.hadToolArgs = true;
    return;
  }

  if (chunk.type === "text-delta" || chunk.type === "reasoning-delta") {
    const text = typeof chunk.text === "string" ? chunk.text : "";
    if (text === "") return;
    if (a.chars === 0) a.startTime = time;
    a.chars += text.length;
    a.samples.push({ time, chars: a.chars });
    while (a.samples.length > 240) a.samples.shift();

    const live = windowRate(a, time);
    if (live !== undefined) {
      const next = clamp(live, 0, MAX_RATE);
      // EMA: the raw window still jitters on bursty providers.
      a.stepRate = a.stepRate > 0 ? a.stepRate * 0.6 + next * 0.4 : next;
      sessionState.rate = a.stepRate;
      sessionState.lastAt = time;
    }
    return;
  }

  if (chunk.type === "usage") {
    const usage = chunk.usage;
    if (usage === null || typeof usage !== "object") return;
    const outputTokens = num(usage.outputTokens);
    if (outputTokens === undefined || outputTokens <= 0) return;
    a.usageTokens = outputTokens;
    sessionState.outputTokens += outputTokens;
    sessionState.steps += 1;

    const elapsedMs = time - a.startTime;

    // Calibrate only from clean, long-enough text steps: a tool-argument step's
    // outputTokens have no matching text, which used to inflate the ratio and
    // produce the 600 tok/s spikes.
    if (!a.hadToolArgs && a.chars >= MIN_CALIBRATION_CHARS && elapsedMs >= MIN_STEP_MS) {
      const ratio = clamp(outputTokens / a.chars, MIN_TOKENS_PER_CHAR, MAX_TOKENS_PER_CHAR);
      calibratedTokensPerChar = calibratedTokensPerChar * 0.5 + ratio * 0.5;
    }

    // Authoritative step rate, only over a meaningful step duration; the
    // accumulator gives a stable average when every step is too short.
    if (elapsedMs >= MIN_STEP_MS) {
      const measured = clamp(outputTokens / (elapsedMs / 1000), 0, MAX_RATE);
      a.stepRate = a.stepRate > 0 ? a.stepRate * 0.4 + measured * 0.6 : measured;
      sessionState.rate = a.stepRate;
      sessionState.tokenAccum += outputTokens;
      sessionState.timeAccum += elapsedMs / 1000;
    }
    sessionState.lastAt = time;
  }
}

async function listSubagents(ctx, rootId) {
  const cached = descendantCache.get(rootId);
  const now = Date.now();
  if (cached !== undefined && now - cached.at < 2000) return cached.list;
  const subagents = ctx.get("subagents");
  let list = [];
  if (subagents !== undefined && typeof subagents.listDescendants === "function") {
    const signal = typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(1500)
      : undefined;
    try {
      const entries = await subagents.listDescendants(rootId, signal);
      if (Array.isArray(entries)) {
        list = entries
          .filter((entry) => entry && entry.kind === "child" && typeof entry.id === "string")
          .map((entry) => ({
            sessionId: entry.id,
            label: typeof entry.label === "string" && entry.label !== "" ? entry.label : entry.id,
            running: entry.activity === "running",
          }));
      }
    } catch (error) {
      list = cached !== undefined ? cached.list : [];
    }
  }
  descendantCache.set(rootId, { at: now, list });
  return list;
}

function latestSessionId() {
  let best = null;
  let bestAt = -1;
  for (const [id, s] of sessions) {
    if (s.lastAt > bestAt) {
      bestAt = s.lastAt;
      best = id;
    }
  }
  return best;
}

function viewOf(sessionId, now) {
  const s = sessions.get(sessionId);
  if (s === undefined) {
    return { sessionId, rate: 0, lastRate: 0, outputTokens: 0, streaming: false, depth: 0 };
  }
  const idleMs = now - s.lastAt;
  const fresh = idleMs < FRESH_MS;
  let rate = s.rate;
  if (rate <= 0 && s.timeAccum > 0) rate = s.tokenAccum / s.timeAccum;
  const clampedRate = Math.round(clamp(rate, 0, MAX_RATE) * 10) / 10;
  return {
    sessionId,
    rate: fresh ? clampedRate : 0,
    lastRate: clampedRate,
    outputTokens: s.outputTokens,
    steps: s.steps,
    depth: s.depth ?? 0,
    streaming: fresh,
    idleMs,
  };
}

export function apply(ctx) {
  ctx.effect(() => ctx.on("agent/assistant-stream", onFrame));

  ctx.effect(() => ctx.webServer.register({
    kind: "prefix",
    path: "/token-rate",
    handler: async (req, res) => {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (url.pathname !== "/token-rate/data") {
        res.writeHead(404, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false }));
        return;
      }
      if (req.method !== "GET") {
        res.writeHead(405, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false }));
        return;
      }

      const now = Date.now();
      const requested = url.searchParams.get("session");
      const rootId = requested !== null && requested !== "" ? requested : latestSessionId();

      let main = rootId === null
        ? { sessionId: null, rate: 0, outputTokens: 0, streaming: false, depth: 0 }
        : viewOf(rootId, now);

      let subagents = [];
      if (rootId !== null) {
        const entries = await listSubagents(ctx, rootId);
        subagents = entries.map((entry) => {
          const view = viewOf(entry.sessionId, now);
          return {
            sessionId: entry.sessionId,
            label: entry.label,
            running: entry.running || view.streaming,
            rate: view.rate,
            outputTokens: view.outputTokens,
            streaming: view.streaming,
          };
        });
      }

      const aggregateRate = Math.round(
        (main.rate + subagents.reduce((sum, s) => sum + s.rate, 0)) * 10,
      ) / 10;
      const anyStreaming = main.streaming || subagents.some((s) => s.streaming);

      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      res.end(JSON.stringify({
        ok: true,
        visible: anyStreaming,
        main,
        subagents,
        aggregateRate,
        activeSubagents: subagents.filter((s) => s.streaming).length,
        tokensPerChar: Math.round(calibratedTokensPerChar * 1000) / 1000,
      }));
    },
  }));
}
