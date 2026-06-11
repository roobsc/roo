const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { Worker, isMainThread, parentPort, workerData } = require("node:worker_threads");
const postgres = require("postgres");
const { put } = require("@vercel/blob");

if (!isMainThread) {
  const { ethers } = require("ethers");
  const args = workerData;
  const suffix = String(args.suffix || "0000").toLowerCase().replace(/^0x/, "");
  const seed = args.seed;
  const creatorBytes = Buffer.from(String(args.creator).replace(/^0x/, ""), "hex");
  const launchpadBytes = Buffer.from(String(args.launchpadAddress).replace(/^0x/, ""), "hex");
  const initCodeHashBytes = Buffer.from(String(args.initCodeHash).replace(/^0x/, ""), "hex");
  const create2Prefix = Buffer.concat([Buffer.from("ff", "hex"), launchpadBytes]);
  for (let attempt = args.start; attempt < args.maxAttempts; attempt += args.step) {
    const userSalt = ethers.keccak256(ethers.toUtf8Bytes(`${seed}:${attempt}`));
    const userSaltBytes = Buffer.from(userSalt.slice(2), "hex");
    const salt = ethers.keccak256(Buffer.concat([creatorBytes, userSaltBytes]));
    const saltBytes = Buffer.from(salt.slice(2), "hex");
    const addressHash = ethers.keccak256(Buffer.concat([create2Prefix, saltBytes, initCodeHashBytes]));
    const addressHex = `0x${addressHash.slice(-40)}`;
    if (addressHex.endsWith(suffix)) {
      const predicted = ethers.getAddress(addressHex);
      parentPort.postMessage({ userSalt, predicted, attempts: attempt + 1, suffix });
      process.exit(0);
    }
  }
  parentPort.postMessage(null);
  process.exit(0);
}

const root = __dirname;
const publicRoot = path.join(root, "public");
const port = Number(process.env.PORT || 4301);
const dataDir = path.join(root, "data");
const dbPath = path.join(dataDir, "launchpad-db.json");
const launchpadSourcePath = path.join(root, "contracts", "RooBscLaunchpad.sol");
const launchpadTokenBinPath = path.join(root, "build-vanity", "contracts_RooBscLaunchpad_sol_LaunchpadToken.bin");
const bscscanApiUrl = process.env.BSCSCAN_API_URL || "https://api.etherscan.io/v2/api";
const bscscanApiKey = process.env.BSCSCAN_API_KEY || "";
const verificationSourceCandidates = [
  "contracts/RooBscLaunchpad.sol",
  "RooBscLaunchpad.sol",
  "contracts/FourBscLaunchpad.sol",
  "FourBscLaunchpad.sol",
  "browser/RooBscLaunchpad.sol",
  "browser/FourBscLaunchpad.sol"
].map((sourceKey) => ({
  sourceKey,
  contractName: `${sourceKey}:LaunchpadToken`
}));
const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || "";
const blobToken = process.env.BLOB_READ_WRITE_TOKEN || "";
const maxAvatarBytes = 2 * 1024 * 1024;
const dexscreenerApiBase = process.env.DEXSCREENER_API_URL || "https://api.dexscreener.com/latest/dex/tokens";
const verificationSweepIntervalMs = Math.max(15_000, Number(process.env.VERIFICATION_SWEEP_INTERVAL_MS || 60_000));
const verificationStatusRetryMs = Math.max(15_000, Number(process.env.VERIFICATION_STATUS_RETRY_MS || 45_000));
const verificationFailureRetryMs = Math.max(60_000, Number(process.env.VERIFICATION_FAILURE_RETRY_MS || 180_000));
const verificationPostSubmitDelayMs = Math.max(10_000, Number(process.env.VERIFICATION_POST_SUBMIT_DELAY_MS || 20_000));
const verificationRetryLimit = Math.max(1, Number(process.env.VERIFICATION_RETRY_LIMIT || 6));
const sql = postgresUrl
  ? postgres(postgresUrl, {
      ssl: postgresUrl.includes("sslmode=disable") ? false : "require",
      max: 3,
      idle_timeout: 20
    })
  : null;
let schemaReady = false;
let verificationSweepTimer = null;
let verificationSweepRunning = false;
let lastVerificationSweepAt = 0;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

function ensureDb() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ projects: [], trades: [], verificationTasks: [] }, null, 2));
  }
}

function readDb() {
  ensureDb();
  try {
    const parsed = JSON.parse(fs.readFileSync(dbPath, "utf8"));
    return {
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      trades: Array.isArray(parsed.trades) ? parsed.trades : [],
      verificationTasks: Array.isArray(parsed.verificationTasks) ? parsed.verificationTasks : []
    };
  } catch {
    return { projects: [], trades: [], verificationTasks: [] };
  }
}

function writeDb(db) {
  ensureDb();
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

async function ensureSchema() {
  if (!sql || schemaReady) {
    return;
  }
  await sql`
    create table if not exists projects (
      project_key text primary key,
      project_id text,
      contract text,
      data jsonb not null,
      market_cap numeric default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists projects_market_cap_idx on projects (market_cap desc)`;
  await sql`create index if not exists projects_contract_idx on projects (lower(contract))`;
  await sql`
    create table if not exists trades (
      id text primary key,
      project_id text,
      token text,
      symbol text,
      account text,
      side text,
      tx_hash text,
      bnb_amount numeric,
      token_amount numeric,
      price_bnb numeric,
      usd_amount numeric,
      timestamp_ms bigint not null,
      data jsonb not null,
      created_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists trades_project_time_idx on trades (project_id, timestamp_ms)`;
  await sql`create index if not exists trades_token_time_idx on trades (lower(token), timestamp_ms)`;
  await sql`
    create table if not exists verification_tasks (
      task_key text primary key,
      contract text not null,
      status text not null,
      guid text,
      next_retry_at timestamptz,
      updated_at timestamptz not null default now(),
      data jsonb not null
    )
  `;
  await sql`create index if not exists verification_tasks_status_retry_idx on verification_tasks (status, next_retry_at asc)`;
  await sql`create index if not exists verification_tasks_contract_idx on verification_tasks (lower(contract))`;
  schemaReady = true;
}

function normalizeProject(project) {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    createdAt: project.createdAt || new Date().toISOString()
  };
}

function normalizeVerificationTask(task) {
  const nowIso = new Date().toISOString();
  return {
    chainId: Number(task.chainId || 56),
    contractAddress: task.contractAddress,
    tokenName: task.tokenName || "",
    tokenSymbol: task.tokenSymbol || "",
    supply: task.supply || "10000000000000000000000",
    launchpadAddress: task.launchpadAddress || "",
    status: task.status || "queued",
    guid: task.guid || "",
    sourceKey: task.sourceKey || "",
    contractName: task.contractName || "",
    submitAttempts: Number(task.submitAttempts || 0),
    statusChecks: Number(task.statusChecks || 0),
    lastMessage: task.lastMessage || "",
    nextRetryAt: task.nextRetryAt || nowIso,
    verifiedAt: task.verifiedAt || "",
    createdAt: task.createdAt || nowIso,
    updatedAt: nowIso
  };
}

function getVerificationTaskKey(contractAddress) {
  return `verify:${normalizeToken(contractAddress)}`;
}

async function getVerificationTaskStore(contractAddress) {
  const normalizedContract = normalizeToken(contractAddress);
  if (!normalizedContract) {
    return null;
  }
  if (!sql) {
    const db = readDb();
    return db.verificationTasks.find((task) => normalizeToken(task.contractAddress) === normalizedContract) || null;
  }
  await ensureSchema();
  const rows = await sql`
    select data
    from verification_tasks
    where lower(contract) = ${normalizedContract}
    limit 1
  `;
  return rows.length ? rows[0].data : null;
}

async function upsertVerificationTaskStore(task) {
  const saved = normalizeVerificationTask(task);
  const key = getVerificationTaskKey(saved.contractAddress);
  if (!sql) {
    const db = readDb();
    const index = db.verificationTasks.findIndex((item) => getVerificationTaskKey(item.contractAddress) === key);
    if (index >= 0) {
      db.verificationTasks[index] = { ...db.verificationTasks[index], ...saved };
    } else {
      db.verificationTasks.unshift(saved);
    }
    writeDb(db);
    return saved;
  }
  await ensureSchema();
  await sql`
    insert into verification_tasks (task_key, contract, status, guid, next_retry_at, updated_at, data)
    values (
      ${key},
      ${saved.contractAddress},
      ${saved.status},
      ${saved.guid || null},
      ${saved.nextRetryAt || null},
      now(),
      ${sql.json(saved)}
    )
    on conflict (task_key) do update set
      contract = excluded.contract,
      status = excluded.status,
      guid = excluded.guid,
      next_retry_at = excluded.next_retry_at,
      updated_at = now(),
      data = verification_tasks.data || excluded.data
  `;
  return saved;
}

async function getVerificationTasksDue(limit = 10) {
  if (!sql) {
    const db = readDb();
    const now = Date.now();
    return db.verificationTasks
      .filter((task) => ["queued", "submitted"].includes(String(task.status || "")))
      .filter((task) => !task.nextRetryAt || Date.parse(task.nextRetryAt) <= now)
      .slice(0, limit);
  }
  await ensureSchema();
  const rows = await sql`
    select data
    from verification_tasks
    where status in ('queued', 'submitted')
      and (next_retry_at is null or next_retry_at <= now())
    order by next_retry_at asc nulls first, updated_at asc
    limit ${limit}
  `;
  return rows.map((row) => row.data);
}

async function getProjectsStore(launchpadAddress = "") {
  const launchpadAddresses = Array.isArray(launchpadAddress) ? launchpadAddress : [launchpadAddress];
  const normalizedLaunchpads = launchpadAddresses
    .map((address) => normalizeToken(address))
    .filter(Boolean);
  if (!sql) {
    const db = readDb();
    return db.projects
      .filter((project) => {
        if (!normalizedLaunchpads.length) {
          return true;
        }
        return normalizedLaunchpads.includes(normalizeToken(project.launchpadAddress));
      })
      .slice()
      .sort((a, b) => Number(b.marketCap || 0) - Number(a.marketCap || 0));
  }
  await ensureSchema();
  const rows = await sql`
    select data
    from projects
    order by market_cap desc nulls last, updated_at desc
  `;
  return rows
    .map((row) => row.data)
    .filter((project) => {
      if (!normalizedLaunchpads.length) {
        return true;
      }
      return normalizedLaunchpads.includes(normalizeToken(project.launchpadAddress));
    });
}

async function upsertProjectStore(project) {
  if (!sql) {
    const db = readDb();
    const saved = upsertProject(db, project);
    writeDb(db);
    return saved;
  }
  await ensureSchema();
  const saved = normalizeProject(project);
  const key = getProjectKey(saved);
  await sql`
    insert into projects (project_key, project_id, contract, data, market_cap, created_at, updated_at)
    values (
      ${key},
      ${saved.projectId === undefined || saved.projectId === null ? null : String(saved.projectId)},
      ${saved.contract || null},
      ${sql.json(saved)},
      ${Number(saved.marketCap || 0)},
      ${saved.createdAt},
      now()
    )
    on conflict (project_key) do update set
      project_id = excluded.project_id,
      contract = excluded.contract,
      data = projects.data || excluded.data,
      market_cap = excluded.market_cap,
      updated_at = now()
  `;
  return saved;
}

function normalizeToken(token) {
  return String(token || "").toLowerCase();
}

async function getTradesStore(projectId, token = "") {
  const normalizedToken = normalizeToken(token);
  if (!sql) {
    const db = readDb();
    return db.trades
      .filter((trade) => normalizedToken
        ? normalizeToken(trade.token) === normalizedToken
        : String(trade.projectId) === String(projectId))
      .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
  }
  await ensureSchema();
  const rows = normalizedToken
    ? await sql`
      select data
      from trades
      where lower(token) = ${normalizedToken}
      order by timestamp_ms desc
      limit 300
    `
    : await sql`
      select data
      from trades
      where project_id = ${String(projectId || "")}
      order by timestamp_ms desc
      limit 300
    `;
  return rows.map((row) => row.data);
}

async function saveTradeStore(trade) {
  const saved = {
    ...trade,
    id: trade.id || `${trade.txHash || "tx"}-${Date.now()}`,
    timestamp: trade.timestamp || Date.now()
  };
  if (!sql) {
    const db = readDb();
    db.trades.push(saved);
    writeDb(db);
    return saved;
  }
  await ensureSchema();
  await sql`
    insert into trades (
      id, project_id, token, symbol, account, side, tx_hash,
      bnb_amount, token_amount, price_bnb, usd_amount, timestamp_ms, data
    )
    values (
      ${saved.id},
      ${saved.projectId === undefined || saved.projectId === null ? null : String(saved.projectId)},
      ${saved.token || null},
      ${saved.symbol || null},
      ${saved.account || null},
      ${saved.side || null},
      ${saved.txHash || null},
      ${Number(saved.bnbAmount || 0)},
      ${Number(saved.tokenAmount || 0)},
      ${Number(saved.priceBnb || 0)},
      ${Number(saved.usdAmount || 0)},
      ${Number(saved.timestamp || Date.now())},
      ${sql.json(saved)}
    )
    on conflict (id) do update set data = excluded.data
  `;
  return saved;
}

async function getCandlesStore(projectId, interval, token = "") {
  const normalizedToken = normalizeToken(token);
  if (!sql) {
    const db = readDb();
    const trades = db.trades
      .filter((trade) => normalizedToken
        ? normalizeToken(trade.token) === normalizedToken
        : String(trade.projectId) === String(projectId))
      .sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
    return buildCandles(trades, interval);
  }
  await ensureSchema();
  const bucketMs = intervalToMs(interval);
  const rows = normalizedToken ? await sql`
    with ordered as (
      select
        floor(timestamp_ms / ${bucketMs}) * ${bucketMs} as bucket,
        timestamp_ms,
        price_bnb::float8 as price,
        bnb_amount::float8 as volume,
        side
      from trades
      where lower(token) = ${normalizedToken}
        and price_bnb > 0
    ),
    ranked as (
      select
        *,
        first_value(price) over (partition by bucket order by timestamp_ms asc) as open,
        first_value(price) over (partition by bucket order by timestamp_ms desc) as close
      from ordered
    )
    select
      bucket::bigint as time,
      (array_agg(price order by timestamp_ms asc))[1]::float8 as open,
      max(price)::float8 as high,
      min(price)::float8 as low,
      (array_agg(price order by timestamp_ms desc))[1]::float8 as close,
      sum(volume)::float8 as volume,
      (array_agg(side order by timestamp_ms desc))[1] as side
    from ranked
    group by bucket
    order by bucket asc
    limit 500
  ` : await sql`
    with ordered as (
      select
        floor(timestamp_ms / ${bucketMs}) * ${bucketMs} as bucket,
        timestamp_ms,
        price_bnb::float8 as price,
        bnb_amount::float8 as volume,
        side
      from trades
      where project_id = ${String(projectId || "")}
        and price_bnb > 0
    ),
    ranked as (
      select
        *,
        first_value(price) over (partition by bucket order by timestamp_ms asc) as open,
        first_value(price) over (partition by bucket order by timestamp_ms desc) as close
      from ordered
    )
    select
      bucket::bigint as time,
      (array_agg(price order by timestamp_ms asc))[1]::float8 as open,
      max(price)::float8 as high,
      min(price)::float8 as low,
      (array_agg(price order by timestamp_ms desc))[1]::float8 as close,
      sum(volume)::float8 as volume,
      (array_agg(side order by timestamp_ms desc))[1] as side
    from ranked
    group by bucket
    order by bucket asc
    limit 500
  `;
  return rows.map((row) => ({
    time: Number(row.time),
    open: Number(row.open),
    high: Number(row.high),
    low: Number(row.low),
    close: Number(row.close),
    volume: Number(row.volume || 0),
    side: String(row.side || "").toLowerCase()
  }));
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    ...headers
  });
  res.end(body);
}

function sendJson(res, status, data) {
  send(res, status, JSON.stringify(data), { "Content-Type": "application/json; charset=utf-8" });
}

async function fetchDexPairStats(token, pairAddress = "") {
  const normalizedToken = normalizeToken(token);
  if (!normalizedToken) {
    return { pairAddress: "", volume24h: 0, liquidityUsd: 0, priceUsd: 0, priceChange24h: 0 };
  }
  const normalizedPair = normalizeToken(pairAddress);
  const response = await fetch(`${dexscreenerApiBase}/${normalizedToken}`);
  if (!response.ok) {
    throw new Error(`DexScreener request failed: ${response.status}`);
  }
  const payload = await response.json();
  const pairs = Array.isArray(payload && payload.pairs) ? payload.pairs : [];
  const match = pairs.find((pair) => normalizeToken(pair.pairAddress) === normalizedPair)
    || pairs.find((pair) => String(pair.chainId || "").toLowerCase() === "bsc")
    || null;
  if (!match) {
    return { pairAddress: "", volume24h: 0, liquidityUsd: 0, priceUsd: 0, priceChange24h: 0 };
  }
  return {
    pairAddress: match.pairAddress || "",
    volume24h: Number(match.volume && match.volume.h24 ? match.volume.h24 : 0),
    liquidityUsd: Number(match.liquidity && match.liquidity.usd ? match.liquidity.usd : 0),
    priceUsd: Number(match.priceUsd || 0),
    priceChange24h: Number(match.priceChange && match.priceChange.h24 ? match.priceChange.h24 : 0)
  };
}

function readJsonBody(req, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > limit) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function safeSlug(value, fallback = "token") {
  const slug = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
  return slug || fallback;
}

function parseAvatarDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([a-z0-9+/=\s]+)$/i);
  if (!match) {
    throw new Error("Only png, jpg and webp avatar images are supported");
  }
  const contentType = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!buffer.length || buffer.length > maxAvatarBytes) {
    throw new Error("Avatar image must be smaller than 2MB");
  }
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  return { buffer, contentType, ext };
}

async function uploadAvatar(payload) {
  const { buffer, contentType, ext } = parseAvatarDataUrl(payload.dataUrl);
  if (!blobToken) {
    return {
      avatarUrl: payload.dataUrl,
      skipped: true,
      message: "Missing BLOB_READ_WRITE_TOKEN; using local data URL fallback"
    };
  }
  const symbol = safeSlug(payload.symbol || payload.fileName || "token");
  const pathname = `avatars/${Date.now()}-${symbol}.${ext}`;
  const blob = await put(pathname, buffer, {
    access: "public",
    contentType,
    token: blobToken
  });
  return {
    avatarUrl: blob.url,
    pathname: blob.pathname,
    contentType,
    size: buffer.length
  };
}

function getProjectKey(project) {
  if (project.contract) {
    return `token:${String(project.contract).toLowerCase()}`;
  }
  if (project.projectId !== undefined && project.projectId !== null) {
    return `id:${project.projectId}`;
  }
  return `token:${String(project.contract || "").toLowerCase()}`;
}

function upsertProject(db, project) {
  const key = getProjectKey(project);
  const index = db.projects.findIndex((item) => getProjectKey(item) === key);
  const nextProject = {
    ...project,
    updatedAt: new Date().toISOString(),
    createdAt: project.createdAt || new Date().toISOString()
  };
  if (index >= 0) {
    db.projects[index] = { ...db.projects[index], ...nextProject };
  } else {
    db.projects.unshift(nextProject);
  }
  return nextProject;
}

function intervalToMs(interval) {
  const map = {
    "1m": 60_000,
    "5m": 300_000,
    "15m": 900_000,
    "1h": 3_600_000,
    "4h": 14_400_000,
    "1d": 86_400_000
  };
  return map[interval] || map["1m"];
}

function buildCandles(trades, interval) {
  const bucketMs = intervalToMs(interval);
  const buckets = new Map();
  trades.forEach((trade) => {
    const time = Number(trade.timestamp || Date.now());
    const bucket = Math.floor(time / bucketMs) * bucketMs;
    const price = Number(trade.priceBnb || 0);
    const volume = Number(trade.bnbAmount || 0);
    if (!price) {
      return;
    }
    const candle = buckets.get(bucket) || {
      time: bucket,
      open: price,
      high: price,
      low: price,
      close: price,
      volume: 0,
      side: String(trade.side || "").toLowerCase()
    };
    candle.high = Math.max(candle.high, price);
    candle.low = Math.min(candle.low, price);
    candle.close = price;
    candle.side = String(trade.side || candle.side || "").toLowerCase();
    candle.volume += volume;
    buckets.set(bucket, candle);
  });
  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

function getEthers() {
  try {
    return require("ethers");
  } catch {
    return null;
  }
}

function buildStandardJsonInput(sourceKey = "contracts/RooBscLaunchpad.sol") {
  const source = fs.readFileSync(launchpadSourcePath, "utf8");
  return JSON.stringify({
    language: "Solidity",
    sources: {
      [sourceKey]: {
        content: source
      }
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 1
      },
      viaIR: true,
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"]
        }
      }
    }
  });
}

function encodeLaunchpadTokenConstructor(args) {
  const ethers = getEthers();
  if (!ethers) {
    throw new Error("ethers dependency is required for constructor encoding");
  }
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  return abiCoder.encode(
    ["string", "string", "uint256", "address"],
    [args.tokenName, args.tokenSymbol, args.supply, args.launchpadAddress]
  ).replace(/^0x/, "");
}

function parseVerificationApiResponse(response, text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return {
    ok: response.ok,
    status: response.status,
    data
  };
}

function isAcceptedVerificationResponse(result) {
  const data = result && result.data ? result.data : {};
  const message = String(data.result || data.message || "").toLowerCase();
  if (String(data.status || "") === "1") {
    return true;
  }
  return message.includes("already verified")
    || message.includes("source code already verified")
    || message.includes("pending in queue")
    || message.includes("already pending")
    || message.includes("pass - verified");
}

function isVerifiedVerificationStatus(result) {
  const data = result && result.data ? result.data : {};
  const message = String(data.result || data.message || "").toLowerCase();
  return String(data.status || "") === "1"
    || message.includes("pass - verified")
    || message.includes("already verified")
    || message.includes("source code already verified");
}

function isPendingVerificationStatus(result) {
  const data = result && result.data ? result.data : {};
  const message = String(data.result || data.message || "").toLowerCase();
  return message.includes("pending")
    || message.includes("queue")
    || message.includes("in progress")
    || message.includes("already pending")
    || message.includes("please try again");
}

function readLaunchpadTokenBytecode() {
  if (!fs.existsSync(launchpadTokenBinPath)) {
    throw new Error("Missing build-vanity LaunchpadToken bytecode. Run solc build first.");
  }
  const bytecode = fs.readFileSync(launchpadTokenBinPath, "utf8").trim();
  return bytecode.startsWith("0x") ? bytecode : `0x${bytecode}`;
}

function scopedSalt(creator, userSalt) {
  const ethers = getEthers();
  return ethers.keccak256(ethers.solidityPacked(["address", "bytes32"], [creator, userSalt]));
}

function getLaunchpadTokenInitCodeHash(args) {
  const ethers = getEthers();
  const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
    ["string", "string", "uint256", "address"],
    [args.tokenName, args.tokenSymbol, args.supply, args.launchpadAddress]
  );
  const initCode = ethers.concat([readLaunchpadTokenBytecode(), constructorArgs]);
  return ethers.keccak256(initCode);
}

function predictTokenAddress(args) {
  const ethers = getEthers();
  const initCodeHash = args.initCodeHash || getLaunchpadTokenInitCodeHash(args);
  const salt = scopedSalt(args.creator, args.userSalt);
  return ethers.getCreate2Address(args.launchpadAddress, salt, initCodeHash);
}

function fastPredictTokenAddress(args) {
  const ethers = getEthers();
  const initCodeHash = args.initCodeHash || getLaunchpadTokenInitCodeHash(args);
  const creatorBytes = Buffer.from(String(args.creator).replace(/^0x/, ""), "hex");
  const userSaltBytes = Buffer.from(String(args.userSalt).replace(/^0x/, ""), "hex");
  const launchpadBytes = Buffer.from(String(args.launchpadAddress).replace(/^0x/, ""), "hex");
  const initCodeHashBytes = Buffer.from(String(initCodeHash).replace(/^0x/, ""), "hex");
  const salt = ethers.keccak256(Buffer.concat([creatorBytes, userSaltBytes]));
  const addressHash = ethers.keccak256(Buffer.concat([
    Buffer.from("ff", "hex"),
    launchpadBytes,
    Buffer.from(salt.slice(2), "hex"),
    initCodeHashBytes
  ]));
  return ethers.getAddress(`0x${addressHash.slice(-40)}`);
}

function findVanitySalt(args) {
  const ethers = getEthers();
  if (!ethers) {
    throw new Error("ethers dependency is required for vanity salt generation");
  }
  if (!ethers.isAddress(args.launchpadAddress) || !ethers.isAddress(args.creator)) {
    throw new Error("Invalid launchpad or creator address");
  }
  const suffix = String(args.suffix || "0000").toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{1,8}$/.test(suffix)) {
    throw new Error("Invalid vanity suffix");
  }
  const maxAttempts = Math.min(Number(args.maxAttempts || 240000), 1_000_000);
  const seed = `${args.creator}:${args.tokenName}:${args.tokenSymbol}:${Date.now()}:${Math.random()}`;
  const initCodeHash = args.initCodeHash || getLaunchpadTokenInitCodeHash(args);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const userSalt = ethers.keccak256(ethers.toUtf8Bytes(`${seed}:${attempt}`));
    const predicted = fastPredictTokenAddress({ ...args, userSalt, initCodeHash });
    if (predicted.toLowerCase().endsWith(suffix)) {
      return { userSalt, predicted, attempts: attempt + 1, suffix };
    }
  }

  throw new Error(`No vanity salt found in ${maxAttempts} attempts`);
}

async function findVanitySaltParallel(args) {
  const ethers = getEthers();
  if (!ethers) {
    throw new Error("ethers dependency is required for vanity salt generation");
  }
  if (!ethers.isAddress(args.launchpadAddress) || !ethers.isAddress(args.creator)) {
    throw new Error("Invalid launchpad or creator address");
  }
  const suffix = String(args.suffix || "0000").toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{1,8}$/.test(suffix)) {
    throw new Error("Invalid vanity suffix");
  }
  const maxAttempts = Math.min(Number(args.maxAttempts || 240000), 1_000_000);
  const workerCount = Math.max(2, Math.min(Number(process.env.VANITY_WORKERS || 6), os.cpus().length || 2, 8));
  const seed = `${args.creator}:${args.tokenName}:${args.tokenSymbol}:${Date.now()}:${Math.random()}`;
  const initCodeHash = args.initCodeHash || getLaunchpadTokenInitCodeHash(args);

  return new Promise((resolve, reject) => {
    const workers = [];
    let finished = 0;
    let settled = false;
    const cleanup = () => workers.forEach((worker) => worker.terminate().catch(() => {}));

    for (let index = 0; index < workerCount; index += 1) {
      const worker = new Worker(__filename, {
        workerData: {
          launchpadAddress: args.launchpadAddress,
          creator: args.creator,
          suffix,
          seed,
          initCodeHash,
          maxAttempts,
          start: index,
          step: workerCount
        }
      });
      workers.push(worker);
      worker.on("message", (result) => {
        if (settled) {
          return;
        }
        if (result) {
          settled = true;
          cleanup();
          resolve({ ...result, workers: workerCount });
        }
      });
      worker.on("error", (error) => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(error);
        }
      });
      worker.on("exit", () => {
        finished += 1;
        if (!settled && finished === workerCount) {
          reject(new Error(`No vanity salt found in ${maxAttempts} attempts`));
        }
      });
    }
  });
}

async function submitTokenVerification(args) {
  if (!bscscanApiKey) {
    return {
      skipped: true,
      message: "Missing BSCSCAN_API_KEY environment variable"
    };
  }

  const requestUrl = new URL(bscscanApiUrl);
  requestUrl.searchParams.set("apikey", bscscanApiKey);
  requestUrl.searchParams.set("chainid", String(args.chainId || 56));
  requestUrl.searchParams.set("module", "contract");
  requestUrl.searchParams.set("action", "verifysourcecode");

  const attempts = [];
  for (const candidate of verificationSourceCandidates) {
    const form = new URLSearchParams();
    form.set("contractaddress", args.contractAddress);
    form.set("sourceCode", buildStandardJsonInput(candidate.sourceKey));
    form.set("codeformat", "solidity-standard-json-input");
    form.set("contractname", candidate.contractName);
    form.set("compilerversion", "v0.8.24+commit.e11b9ed9");
    form.set("optimizationUsed", "1");
    form.set("runs", "1");
    form.set("constructorArguments", encodeLaunchpadTokenConstructor(args));
    form.set("evmVersion", "default");
    form.set("licenseType", "3");

    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: form
    });
    const text = await response.text();
    const result = parseVerificationApiResponse(response, text);
    attempts.push({
      sourceKey: candidate.sourceKey,
      contractName: candidate.contractName,
      response: result.data
    });
    if (isAcceptedVerificationResponse(result)) {
      return {
        ...result,
        sourceKey: candidate.sourceKey,
        contractName: candidate.contractName,
        attempts
      };
    }
  }

  const lastAttempt = attempts[attempts.length - 1] || null;
  return {
    ok: false,
    status: 200,
    data: lastAttempt ? lastAttempt.response : { message: "No verification attempts were made" },
    sourceKey: lastAttempt ? lastAttempt.sourceKey : "",
    contractName: lastAttempt ? lastAttempt.contractName : "",
    attempts
  };
}

async function checkVerificationStatus(args) {
  if (!bscscanApiKey) {
    return {
      skipped: true,
      message: "Missing BSCSCAN_API_KEY environment variable"
    };
  }

  const requestUrl = new URL(bscscanApiUrl);
  requestUrl.searchParams.set("apikey", bscscanApiKey);
  requestUrl.searchParams.set("chainid", String(args.chainId || 56));
  requestUrl.searchParams.set("module", "contract");
  requestUrl.searchParams.set("action", "checkverifystatus");
  requestUrl.searchParams.set("guid", args.guid);

  const response = await fetch(requestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });
  const text = await response.text();
  return parseVerificationApiResponse(response, text);
}

async function submitVerificationTask(task) {
  const current = normalizeVerificationTask(task);
  const result = await submitTokenVerification(current);
  const now = new Date();
  const nextTask = {
    ...current,
    submitAttempts: Number(current.submitAttempts || 0) + 1,
    lastMessage: String(result && result.data && (result.data.result || result.data.message) || result.message || ""),
    sourceKey: result.sourceKey || current.sourceKey || "",
    contractName: result.contractName || current.contractName || ""
  };
  if (result.skipped) {
    nextTask.status = "skipped";
    nextTask.nextRetryAt = new Date(now.getTime() + verificationFailureRetryMs).toISOString();
    return upsertVerificationTaskStore(nextTask);
  }
  if (isAcceptedVerificationResponse(result)) {
    nextTask.status = isVerifiedVerificationStatus(result) ? "verified" : "submitted";
    nextTask.guid = String(result && result.data && result.data.result || nextTask.guid || "");
    nextTask.verifiedAt = nextTask.status === "verified" ? now.toISOString() : current.verifiedAt || "";
    nextTask.nextRetryAt = nextTask.status === "verified"
      ? now.toISOString()
      : new Date(now.getTime() + verificationPostSubmitDelayMs).toISOString();
    return upsertVerificationTaskStore(nextTask);
  }
  nextTask.status = nextTask.submitAttempts >= verificationRetryLimit ? "failed" : "queued";
  nextTask.nextRetryAt = new Date(now.getTime() + verificationFailureRetryMs).toISOString();
  return upsertVerificationTaskStore(nextTask);
}

async function refreshVerificationTaskStatus(task) {
  const current = normalizeVerificationTask(task);
  if (!current.guid) {
    return submitVerificationTask(current);
  }
  const result = await checkVerificationStatus({
    chainId: current.chainId,
    guid: current.guid
  });
  const now = new Date();
  const nextTask = {
    ...current,
    statusChecks: Number(current.statusChecks || 0) + 1,
    lastMessage: String(result && result.data && (result.data.result || result.data.message) || result.message || "")
  };
  if (result.skipped) {
    nextTask.status = "skipped";
    nextTask.nextRetryAt = new Date(now.getTime() + verificationFailureRetryMs).toISOString();
    return upsertVerificationTaskStore(nextTask);
  }
  if (isVerifiedVerificationStatus(result)) {
    nextTask.status = "verified";
    nextTask.verifiedAt = now.toISOString();
    nextTask.nextRetryAt = now.toISOString();
    return upsertVerificationTaskStore(nextTask);
  }
  if (isPendingVerificationStatus(result)) {
    nextTask.status = "submitted";
    nextTask.nextRetryAt = new Date(now.getTime() + verificationStatusRetryMs).toISOString();
    return upsertVerificationTaskStore(nextTask);
  }
  nextTask.status = Number(current.submitAttempts || 0) >= verificationRetryLimit ? "failed" : "queued";
  nextTask.guid = "";
  nextTask.nextRetryAt = new Date(now.getTime() + verificationFailureRetryMs).toISOString();
  return upsertVerificationTaskStore(nextTask);
}

async function processVerificationQueue(limit = 6) {
  if (verificationSweepRunning) {
    return;
  }
  verificationSweepRunning = true;
  lastVerificationSweepAt = Date.now();
  try {
    const tasks = await getVerificationTasksDue(limit);
    for (const task of tasks) {
      try {
        if (task.guid) {
          await refreshVerificationTaskStatus(task);
        } else {
          await submitVerificationTask(task);
        }
      } catch (error) {
        await upsertVerificationTaskStore({
          ...task,
          status: Number(task.submitAttempts || 0) >= verificationRetryLimit ? "failed" : "queued",
          lastMessage: error.message || "Verification queue processing failed",
          nextRetryAt: new Date(Date.now() + verificationFailureRetryMs).toISOString()
        });
      }
    }
  } finally {
    verificationSweepRunning = false;
  }
}

function kickVerificationMaintenance() {
  if (verificationSweepRunning) {
    return;
  }
  if (Date.now() - lastVerificationSweepAt < verificationSweepIntervalMs / 2) {
    return;
  }
  processVerificationQueue().catch(() => {});
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/projects") {
    const launchpadAddress = url.searchParams.getAll("launchpadAddress");
    const projects = await getProjectsStore(launchpadAddress);
    return sendJson(res, 200, { projects });
  }

  if (req.method === "POST" && url.pathname === "/api/projects/upsert") {
    const project = await readJsonBody(req);
    const saved = await upsertProjectStore(project);
    return sendJson(res, 200, { project: saved });
  }

  if (req.method === "POST" && url.pathname === "/api/upload-avatar") {
    const payload = await readJsonBody(req, 4_000_000);
    const result = await uploadAvatar(payload);
    return sendJson(res, 200, result);
  }

  if (req.method === "GET" && url.pathname === "/api/trades") {
    const projectId = url.searchParams.get("projectId");
    const token = url.searchParams.get("token");
    const trades = await getTradesStore(projectId, token);
    return sendJson(res, 200, { trades });
  }

  if (req.method === "POST" && url.pathname === "/api/trades") {
    const trade = await readJsonBody(req);
    const saved = await saveTradeStore(trade);
    return sendJson(res, 200, { trade: saved });
  }

  if (req.method === "GET" && url.pathname === "/api/candles") {
    const projectId = url.searchParams.get("projectId");
    const token = url.searchParams.get("token");
    const interval = url.searchParams.get("interval") || "1m";
    const candles = await getCandlesStore(projectId, interval, token);
    return sendJson(res, 200, { candles });
  }

  if (req.method === "GET" && url.pathname === "/api/pair-stats") {
    const token = url.searchParams.get("token");
    const pair = url.searchParams.get("pair");
    const stats = await fetchDexPairStats(token, pair);
    return sendJson(res, 200, stats);
  }

  if (req.method === "POST" && url.pathname === "/api/verify-token") {
    const payload = await readJsonBody(req);
    const verificationArgs = {
      chainId: payload.chainId || 56,
      contractAddress: payload.contractAddress,
      tokenName: payload.tokenName,
      tokenSymbol: payload.tokenSymbol,
      supply: payload.supply || "10000000000000000000000",
      launchpadAddress: payload.launchpadAddress
    };
    const result = await submitTokenVerification(verificationArgs);
    await upsertVerificationTaskStore({
      ...verificationArgs,
      status: result.skipped ? "skipped" : (isAcceptedVerificationResponse(result) ? (isVerifiedVerificationStatus(result) ? "verified" : "submitted") : "queued"),
      guid: isAcceptedVerificationResponse(result) ? String(result && result.data && result.data.result || "") : "",
      sourceKey: result.sourceKey || "",
      contractName: result.contractName || "",
      submitAttempts: 1,
      statusChecks: 0,
      lastMessage: String(result && result.data && (result.data.result || result.data.message) || result.message || ""),
      verifiedAt: isVerifiedVerificationStatus(result) ? new Date().toISOString() : "",
      nextRetryAt: isVerifiedVerificationStatus(result)
        ? new Date().toISOString()
        : new Date(Date.now() + (isAcceptedVerificationResponse(result) ? verificationPostSubmitDelayMs : verificationFailureRetryMs)).toISOString()
    });
    kickVerificationMaintenance();
    return sendJson(res, 200, result);
  }

  if (req.method === "POST" && url.pathname === "/api/vanity-salt") {
    const payload = await readJsonBody(req);
    const startedAt = Date.now();
    const result = await findVanitySaltParallel({
      launchpadAddress: payload.launchpadAddress,
      creator: payload.creator,
      tokenName: payload.tokenName,
      tokenSymbol: payload.tokenSymbol,
      supply: payload.supply || "10000000000000000000000",
      initCodeHash: payload.initCodeHash || "",
      suffix: payload.suffix || "0000",
      maxAttempts: payload.maxAttempts || 240000
    });
    result.elapsedMs = Date.now() - startedAt;
    console.log("vanity-salt", JSON.stringify({
      suffix: result.suffix,
      attempts: result.attempts,
      workers: result.workers,
      elapsedMs: result.elapsedMs,
      predicted: result.predicted
    }));
    return sendJson(res, 200, result);
  }

  if (req.method === "POST" && url.pathname === "/api/verify-status") {
    const payload = await readJsonBody(req);
    const result = await checkVerificationStatus({
      chainId: payload.chainId || 56,
      guid: payload.guid
    });
    if (payload.contractAddress) {
      const existing = await getVerificationTaskStore(payload.contractAddress);
      if (existing) {
        await upsertVerificationTaskStore({
          ...existing,
          status: isVerifiedVerificationStatus(result) ? "verified" : (isPendingVerificationStatus(result) ? "submitted" : existing.status || "queued"),
          lastMessage: String(result && result.data && (result.data.result || result.data.message) || result.message || ""),
          statusChecks: Number(existing.statusChecks || 0) + 1,
          verifiedAt: isVerifiedVerificationStatus(result) ? new Date().toISOString() : existing.verifiedAt || "",
          nextRetryAt: isVerifiedVerificationStatus(result)
            ? new Date().toISOString()
            : new Date(Date.now() + verificationStatusRetryMs).toISOString()
        });
      }
    }
    return sendJson(res, 200, result);
  }

  return sendJson(res, 404, { error: "API not found" });
}

function serveStatic(req, res, url) {
  const urlPath = decodeURIComponent(url.pathname || "/");
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  let filePath = path.join(publicRoot, safePath);

  if (urlPath === "/" || urlPath === "") {
    filePath = path.join(publicRoot, "index.html");
  }

  fs.stat(filePath, (err, stat) => {
    if (err) {
      return send(res, 404, "Not found");
    }

    if (stat.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        return send(res, 404, "Not found");
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || "application/octet-stream";
      res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": "no-store"
      });
      res.end(data);
    });
  });
}

async function requestHandler(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
  try {
    kickVerificationMaintenance();
    if (req.method === "OPTIONS") {
      send(res, 204, "");
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    serveStatic(req, res, url);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Server error" });
  }
}

if (require.main === module) {
  verificationSweepTimer = setInterval(() => {
    processVerificationQueue().catch(() => {});
  }, verificationSweepIntervalMs);
  const server = http.createServer(requestHandler);
  server.listen(port, "127.0.0.1", () => {
    console.log(`roo launchpad running at http://127.0.0.1:${port}`);
  });
}

module.exports = requestHandler;
