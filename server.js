const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT || 4301);
const dataDir = path.join(root, "data");
const dbPath = path.join(dataDir, "launchpad-db.json");
const launchpadSourcePath = path.join(root, "contracts", "FourBscLaunchpad.sol");
const launchpadTokenBinPath = path.join(root, "build-vanity", "contracts_FourBscLaunchpad_sol_LaunchpadToken.bin");
const bscscanApiUrl = process.env.BSCSCAN_API_URL || "https://api.etherscan.io/v2/api";
const bscscanApiKey = process.env.BSCSCAN_API_KEY || "";

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
  const db = readDb();

  if (req.method === "GET" && url.pathname === "/api/projects") {
    const projects = db.projects
      .slice()
      .sort((a, b) => Number(b.marketCap || 0) - Number(a.marketCap || 0));
    return sendJson(res, 200, { projects });
  }

  if (req.method === "POST" && url.pathname === "/api/projects/upsert") {
    const project = await readJsonBody(req);
    const saved = upsertProject(db, project);
    writeDb(db);
    return sendJson(res, 200, { project: saved });
  }

  if (req.method === "GET" && url.pathname === "/api/trades") {
    const projectId = url.searchParams.get("projectId");
    const trades = db.trades
      .filter((trade) => String(trade.projectId) === String(projectId))
      .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
    return sendJson(res, 200, { trades });
  }

  if (req.method === "POST" && url.pathname === "/api/trades") {
    const trade = await readJsonBody(req);
    const saved = {
      ...trade,
      id: trade.id || `${trade.txHash || "tx"}-${Date.now()}`,
      timestamp: trade.timestamp || Date.now()
    };
    db.trades.push(saved);
    writeDb(db);
    return sendJson(res, 200, { trade: saved });
  }

  if (req.method === "GET" && url.pathname === "/api/candles") {
    const projectId = url.searchParams.get("projectId");
    const interval = url.searchParams.get("interval") || "1m";
    const trades = db.trades
      .filter((trade) => String(trade.projectId) === String(projectId))
      .sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
    return sendJson(res, 200, { candles: buildCandles(trades, interval) });
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

const server = http.createServer(async (req, res) => {
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
});

server.listen(port, "127.0.0.1", () => {
  console.log(`roo launchpad running at http://127.0.0.1:${port}`);
});
