const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const postgres = require("postgres");

const root = __dirname;
const port = Number(process.env.PORT || 4301);
const dataDir = path.join(root, "data");
const dbPath = path.join(dataDir, "launchpad-db.json");
const launchpadSourcePath = path.join(root, "contracts", "FourBscLaunchpad.sol");
const launchpadTokenBinPath = path.join(root, "build-vanity", "contracts_FourBscLaunchpad_sol_LaunchpadToken.bin");
const bscscanApiUrl = process.env.BSCSCAN_API_URL || "https://api.etherscan.io/v2/api";
const bscscanApiKey = process.env.BSCSCAN_API_KEY || "";
const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || "";
const sql = postgresUrl
  ? postgres(postgresUrl, {
      ssl: postgresUrl.includes("sslmode=disable") ? false : "require",
      max: 3,
      idle_timeout: 20
    })
  : null;
let schemaReady = false;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

function ensureDb() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ projects: [], trades: [] }, null, 2));
  }
}

function readDb() {
  ensureDb();
  try {
    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
  } catch {
    return { projects: [], trades: [] };
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
  schemaReady = true;
}

function normalizeProject(project) {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    createdAt: project.createdAt || new Date().toISOString()
  };
}

async function getProjectsStore() {
  if (!sql) {
    const db = readDb();
    return db.projects
      .slice()
      .sort((a, b) => Number(b.marketCap || 0) - Number(a.marketCap || 0));
  }
  await ensureSchema();
  const rows = await sql`
    select data
    from projects
    order by market_cap desc nulls last, updated_at desc
  `;
  return rows.map((row) => row.data);
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

async function getTradesStore(projectId) {
  if (!sql) {
    const db = readDb();
    return db.trades
      .filter((trade) => String(trade.projectId) === String(projectId))
      .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
  }
  await ensureSchema();
  const rows = await sql`
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

async function getCandlesStore(projectId, interval) {
  if (!sql) {
    const db = readDb();
    const trades = db.trades
      .filter((trade) => String(trade.projectId) === String(projectId))
      .sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
    return buildCandles(trades, interval);
  }
  await ensureSchema();
  const bucketMs = intervalToMs(interval);
  const rows = await sql`
    with ordered as (
      select
        floor(timestamp_ms / ${bucketMs}) * ${bucketMs} as bucket,
        timestamp_ms,
        price_bnb::float8 as price,
        bnb_amount::float8 as volume
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
      min(open)::float8 as open,
      max(price)::float8 as high,
      min(price)::float8 as low,
      min(close)::float8 as close,
      sum(volume)::float8 as volume
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
    volume: Number(row.volume || 0)
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

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
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

function getProjectKey(project) {
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
      volume: 0
    };
    candle.high = Math.max(candle.high, price);
    candle.low = Math.min(candle.low, price);
    candle.close = price;
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

function buildStandardJsonInput() {
  const source = fs.readFileSync(launchpadSourcePath, "utf8");
  return JSON.stringify({
    language: "Solidity",
    sources: {
      "contracts/FourBscLaunchpad.sol": {
        content: source
      }
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
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
  const initCodeHash = getLaunchpadTokenInitCodeHash(args);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const userSalt = ethers.keccak256(ethers.toUtf8Bytes(`${seed}:${attempt}`));
    const predicted = predictTokenAddress({ ...args, userSalt, initCodeHash });
    if (predicted.toLowerCase().endsWith(suffix)) {
      return { userSalt, predicted, attempts: attempt + 1, suffix };
    }
  }

  throw new Error(`No vanity salt found in ${maxAttempts} attempts`);
}

async function submitTokenVerification(args) {
  if (!bscscanApiKey) {
    return {
      skipped: true,
      message: "Missing BSCSCAN_API_KEY environment variable"
    };
  }

  const form = new URLSearchParams();
  form.set("apikey", bscscanApiKey);
  form.set("chainid", String(args.chainId || 56));
  form.set("module", "contract");
  form.set("action", "verifysourcecode");
  form.set("contractaddress", args.contractAddress);
  form.set("sourceCode", buildStandardJsonInput());
  form.set("codeformat", "solidity-standard-json-input");
  form.set("contractname", "contracts/FourBscLaunchpad.sol:LaunchpadToken");
  form.set("compilerversion", "v0.8.24+commit.e11b9ed9");
  form.set("optimizationUsed", "1");
  form.set("runs", "200");
  form.set("constructorArguments", encodeLaunchpadTokenConstructor(args));
  form.set("evmVersion", "default");
  form.set("licenseType", "3");

  const response = await fetch(bscscanApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: form
  });
  const text = await response.text();
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

async function checkVerificationStatus(args) {
  if (!bscscanApiKey) {
    return {
      skipped: true,
      message: "Missing BSCSCAN_API_KEY environment variable"
    };
  }
  const form = new URLSearchParams();
  form.set("apikey", bscscanApiKey);
  form.set("chainid", String(args.chainId || 56));
  form.set("module", "contract");
  form.set("action", "checkverifystatus");
  form.set("guid", args.guid);
  const response = await fetch(bscscanApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: form
  });
  const text = await response.text();
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

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/projects") {
    const projects = await getProjectsStore();
    return sendJson(res, 200, { projects });
  }

  if (req.method === "POST" && url.pathname === "/api/projects/upsert") {
    const project = await readJsonBody(req);
    const saved = await upsertProjectStore(project);
    return sendJson(res, 200, { project: saved });
  }

  if (req.method === "GET" && url.pathname === "/api/trades") {
    const projectId = url.searchParams.get("projectId");
    const trades = await getTradesStore(projectId);
    return sendJson(res, 200, { trades });
  }

  if (req.method === "POST" && url.pathname === "/api/trades") {
    const trade = await readJsonBody(req);
    const saved = await saveTradeStore(trade);
    return sendJson(res, 200, { trade: saved });
  }

  if (req.method === "GET" && url.pathname === "/api/candles") {
    const projectId = url.searchParams.get("projectId");
    const interval = url.searchParams.get("interval") || "1m";
    const candles = await getCandlesStore(projectId, interval);
    return sendJson(res, 200, { candles });
  }

  if (req.method === "POST" && url.pathname === "/api/verify-token") {
    const payload = await readJsonBody(req);
    const result = await submitTokenVerification({
      chainId: payload.chainId || 56,
      contractAddress: payload.contractAddress,
      tokenName: payload.tokenName,
      tokenSymbol: payload.tokenSymbol,
      supply: payload.supply || "10000000000000000000000",
      launchpadAddress: payload.launchpadAddress
    });
    return sendJson(res, 200, result);
  }

  if (req.method === "POST" && url.pathname === "/api/vanity-salt") {
    const payload = await readJsonBody(req);
    const result = findVanitySalt({
      launchpadAddress: payload.launchpadAddress,
      creator: payload.creator,
      tokenName: payload.tokenName,
      tokenSymbol: payload.tokenSymbol,
      supply: payload.supply || "10000000000000000000000",
      suffix: payload.suffix || "0000",
      maxAttempts: payload.maxAttempts || 240000
    });
    return sendJson(res, 200, result);
  }

  if (req.method === "POST" && url.pathname === "/api/verify-status") {
    const payload = await readJsonBody(req);
    const result = await checkVerificationStatus({
      chainId: payload.chainId || 56,
      guid: payload.guid
    });
    return sendJson(res, 200, result);
  }

  return sendJson(res, 404, { error: "API not found" });
}

function serveStatic(req, res, url) {
  const urlPath = decodeURIComponent(url.pathname || "/");
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  let filePath = path.join(root, safePath);

  if (urlPath === "/" || urlPath === "") {
    filePath = path.join(root, "index.html");
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
  const server = http.createServer(requestHandler);
  server.listen(port, "127.0.0.1", () => {
    console.log(`roo launchpad running at http://127.0.0.1:${port}`);
  });
}

module.exports = requestHandler;
