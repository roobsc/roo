const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const os = require("os");
const { ethers } = require("ethers");

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
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function findSolcModule() {
  const explicit = process.env.SOLC_MODULE_PATH;
  if (explicit) {
    return require(explicit);
  }

  try {
    return require("solc");
  } catch (_error) {
    // Fall through to npm cache lookup.
  }

  const cacheRoot = path.join(os.homedir(), "AppData", "Local", "npm-cache", "_npx");
  if (fs.existsSync(cacheRoot)) {
    const dirs = fs.readdirSync(cacheRoot, { withFileTypes: true });
    for (const dirent of dirs) {
      if (!dirent.isDirectory()) {
        continue;
      }
      const candidate = path.join(cacheRoot, dirent.name, "node_modules", "solc");
      if (fs.existsSync(candidate)) {
        return require(candidate);
      }
    }
  }

  throw new Error(
    "Cannot find the solc module. Install solc@0.8.24 with npm, or set SOLC_MODULE_PATH to a local solc package path."
  );
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseRpcUrls() {
  const raw = process.env.BSC_RPC_URLS || process.env.BSC_RPC_URL;
  if (!raw) {
    throw new Error("Missing required environment variable: BSC_RPC_URL or BSC_RPC_URLS");
  }
  return raw
    .split(/[,\r?\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function makeProvider(rpcUrl, timeoutMs) {
  const request = new ethers.FetchRequest(rpcUrl);
  request.timeout = timeoutMs;
  return new ethers.JsonRpcProvider(request, { chainId: 56, name: "bnb" }, {
    staticNetwork: true
  });
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

    req.on("timeout", () => {
      req.destroy(new Error(`timeout after ${timeoutMs}ms`));
    });
    req.on("error", (error) => {
      reject(error);
    });
    req.write(body);
    req.end();
  });
}

async function probeRpcEndpoint(rpcUrl, timeoutMs) {
  const chainResponse = await postJson(
    rpcUrl,
    {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_chainId",
      params: []
    },
    timeoutMs
  );
  if (chainResponse.error) {
    throw new Error(chainResponse.error.message || "eth_chainId failed");
  }

  const blockResponse = await postJson(
    rpcUrl,
    {
      jsonrpc: "2.0",
      id: 2,
      method: "eth_blockNumber",
      params: []
    },
    timeoutMs
  );
  if (blockResponse.error) {
    throw new Error(blockResponse.error.message || "eth_blockNumber failed");
  }

  const chainId = Number(BigInt(chainResponse.result));
  const blockNumber = Number(BigInt(blockResponse.result));
  return { chainId, blockNumber };
}

async function connectProvider(rpcUrls, timeoutMs) {
  const errors = [];
  for (const rpcUrl of rpcUrls) {
    try {
      const { chainId, blockNumber } = await probeRpcEndpoint(rpcUrl, timeoutMs);
      const provider = makeProvider(rpcUrl, timeoutMs);
      return {
        provider,
        rpcUrl,
        network: { chainId: BigInt(chainId), name: chainId === 56 ? "bnb" : "unknown" },
        blockNumber
      };
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      errors.push(`- ${rpcUrl}: ${message}`);
    }
  }
  throw new Error(`All RPC endpoints failed:\n${errors.join("\n")}`);
}

function compileLaunchpad(solc, contractPath) {
  const source = fs.readFileSync(contractPath, "utf8");
  const input = {
    language: "Solidity",
    sources: {
      "RooBscLaunchpad.sol": {
        content: source
      }
    },
    settings: {
      optimizer: { enabled: true, runs: 1 },
      viaIR: true,
      outputSelection: {
        "*": {
          "*": [
            "abi",
            "evm.bytecode.object",
            "evm.deployedBytecode.object"
          ]
        }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors && output.errors.length) {
    const hardErrors = output.errors.filter((item) => item.severity === "error");
    if (hardErrors.length) {
      throw new Error(hardErrors.map((item) => item.formattedMessage).join("\n\n"));
    }
    for (const warning of output.errors.filter((item) => item.severity === "warning")) {
      console.warn(warning.formattedMessage);
    }
  }

  const contract = output.contracts["RooBscLaunchpad.sol"].RooBscLaunchpad;
  const abi = contract.abi;
  const bytecode = `0x${contract.evm.bytecode.object}`;
  const deployedBytecode = `0x${contract.evm.deployedBytecode.object}`;
  const runtimeBytes = (deployedBytecode.length - 2) / 2;

  return { abi, bytecode, runtimeBytes };
}

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  loadEnvFile(path.join(projectRoot, ".env"));

  const rpcUrls = parseRpcUrls();
  const privateKey = requireEnv("DEPLOYER_PRIVATE_KEY");
  const router = process.env.PANCAKE_ROUTER || "0x10ED43C718714eb63d5aA57B78B54704E256024E";
  const platformWallet = requireEnv("PLATFORM_FEE_WALLET");
  const timeoutMs = Number(process.env.RPC_TIMEOUT_MS || 30000);
  const solc = findSolcModule();
  const contractPath = path.join(projectRoot, "contracts", "RooBscLaunchpad.sol");
  const { abi, bytecode, runtimeBytes } = compileLaunchpad(solc, contractPath);

  console.log(`Compiled runtime size: ${runtimeBytes} bytes`);
  if (runtimeBytes > 24576) {
    throw new Error(`Runtime bytecode still exceeds the BSC limit: ${runtimeBytes} bytes`);
  }

  console.log(`Trying RPC endpoints (${rpcUrls.length}) with timeout ${timeoutMs}ms...`);
  const { provider, rpcUrl, network, blockNumber } = await connectProvider(rpcUrls, timeoutMs);
  const wallet = new ethers.Wallet(privateKey, provider);
  const balance = await provider.getBalance(wallet.address);
  const feeData = await provider.getFeeData();

  console.log(`RPC: ${rpcUrl}`);
  console.log(`Network chainId: ${network.chainId}`);
  console.log(`Latest block: ${blockNumber}`);
  console.log(`Deployer: ${wallet.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} BNB`);
  console.log(`Router: ${router}`);
  console.log(`Platform wallet: ${platformWallet}`);

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const deployTx = await factory.getDeployTransaction(router, platformWallet);
  const estimated = await provider.estimateGas({
    ...deployTx,
    from: wallet.address
  });

  deployTx.gasLimit = estimated + (estimated / 5n);
  if (!deployTx.maxFeePerGas && feeData.maxFeePerGas) {
    deployTx.maxFeePerGas = feeData.maxFeePerGas;
  }
  if (!deployTx.maxPriorityFeePerGas && feeData.maxPriorityFeePerGas) {
    deployTx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
  }
  if (!deployTx.gasPrice && feeData.gasPrice) {
    deployTx.gasPrice = feeData.gasPrice;
  }

  console.log("Submitting deployment transaction...");
  const response = await wallet.sendTransaction(deployTx);
  console.log(`Tx hash: ${response.hash}`);

  const receipt = await response.wait();
  if (!receipt || !receipt.contractAddress) {
    throw new Error("Deployment mined but contractAddress was not returned.");
  }

  console.log(`Launchpad deployed: ${receipt.contractAddress}`);
  console.log("Next: put this address into public/config.js -> launchpadAddress");
}

main().catch((error) => {
  console.error(error && error.message ? error.message : error);
  process.exitCode = 1;
});
