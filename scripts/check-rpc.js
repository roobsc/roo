const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function parseRpcUrls() {
  const raw = process.env.BSC_RPC_URLS || process.env.BSC_RPC_URL;
  if (!raw) {
    throw new Error("Missing BSC_RPC_URL or BSC_RPC_URLS");
  }
  return raw
    .split(/[,\r?\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function postJson(urlString, payload, timeoutMs) {
  const url = new URL(urlString);
  const transport = url.protocol === "https:" ? https : http;
  const body = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    const req = transport.request(
      url,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body)
        },
        timeout: timeoutMs
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch (_error) {
            reject(new Error(`Invalid JSON response: ${data.slice(0, 160)}`));
          }
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error(`timeout after ${timeoutMs}ms`)));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  loadEnvFile(path.join(__dirname, "..", ".env"));
  const rpcUrls = parseRpcUrls();
  const timeoutMs = Number(process.env.RPC_TIMEOUT_MS || 15000);

  for (const rpcUrl of rpcUrls) {
    try {
      const chain = await postJson(
        rpcUrl,
        { jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] },
        timeoutMs
      );
      if (chain.error) {
        throw new Error(`eth_chainId: ${chain.error.message || JSON.stringify(chain.error)}`);
      }
      const block = await postJson(
        rpcUrl,
        { jsonrpc: "2.0", id: 2, method: "eth_blockNumber", params: [] },
        timeoutMs
      );
      if (block.error) {
        throw new Error(`eth_blockNumber: ${block.error.message || JSON.stringify(block.error)}`);
      }
      console.log(`OK ${rpcUrl}`);
      console.log(`  chainId: ${chain.result}`);
      console.log(`  block:   ${block.result}`);
    } catch (error) {
      console.log(`FAIL ${rpcUrl}`);
      console.log(`  ${error.message || error}`);
    }
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
