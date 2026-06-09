const config = window.LAUNCHPAD_CONFIG || {};
const defaultAvatar = "./assets/roo-avatar.jpg";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const TOTAL_TOKEN_SUPPLY = 10_000;
const INTERNAL_SALE_SUPPLY = 8_000;
const WBNB_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
const PANCAKE_V2_FACTORY = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
const BNB_USD_FALLBACK = Number(config.bnbUsd || 600);

const LAUNCHPAD_ABI = [
  {
    inputs: [
      {
        name: "config",
        type: "tuple",
        components: [
          { name: "tokenName", type: "string" },
          { name: "tokenSymbol", type: "string" },
          { name: "walletCapEnabled", type: "bool" },
          { name: "walletCapTokens", type: "uint256" },
          { name: "launchThresholdBnb", type: "uint256" },
          { name: "marketingWallet", type: "address" }
        ]
      },
      {
        name: "taxConfig",
        type: "tuple",
        components: [
          { name: "taxEnabled", type: "bool" },
          { name: "projectTaxBps", type: "uint16" },
          {
            name: "allocation",
            type: "tuple",
            components: [
              { name: "marketingBps", type: "uint16" },
              { name: "burnBps", type: "uint16" },
              { name: "dividendBps", type: "uint16" },
              { name: "lpTreasuryBps", type: "uint16" }
            ]
          }
        ]
      }
    ],
    name: "createProject",
    outputs: [
      { name: "projectId", type: "uint256" },
      { name: "token", type: "address" }
    ],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      {
        name: "config",
        type: "tuple",
        components: [
          { name: "tokenName", type: "string" },
          { name: "tokenSymbol", type: "string" },
          { name: "walletCapEnabled", type: "bool" },
          { name: "walletCapTokens", type: "uint256" },
          { name: "launchThresholdBnb", type: "uint256" },
          { name: "marketingWallet", type: "address" }
        ]
      },
      {
        name: "taxConfig",
        type: "tuple",
        components: [
          { name: "taxEnabled", type: "bool" },
          { name: "projectTaxBps", type: "uint16" },
          {
            name: "allocation",
            type: "tuple",
            components: [
              { name: "marketingBps", type: "uint16" },
              { name: "burnBps", type: "uint16" },
              { name: "dividendBps", type: "uint16" },
              { name: "lpTreasuryBps", type: "uint16" }
            ]
          }
        ]
      },
      { name: "userSalt", type: "bytes32" }
    ],
    name: "createProjectVanity",
    outputs: [
      { name: "projectId", type: "uint256" },
      { name: "token", type: "address" }
    ],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      { name: "tokenName", type: "string" },
      { name: "tokenSymbol", type: "string" },
      { name: "userSalt", type: "bytes32" },
      { name: "creator", type: "address" }
    ],
    name: "predictTokenAddress",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "tokenName", type: "string" },
      { name: "tokenSymbol", type: "string" }
    ],
    name: "launchpadTokenInitCodeHash",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "projectId", type: "uint256" },
      { indexed: true, name: "creator", type: "address" },
      { indexed: true, name: "token", type: "address" },
      { indexed: false, name: "walletCap", type: "uint256" },
      { indexed: false, name: "launchThreshold", type: "uint256" }
    ],
    name: "ProjectCreated",
    type: "event"
  },
  {
    inputs: [
      { name: "projectId", type: "uint256" },
      { name: "tokenAmount", type: "uint256" }
    ],
    name: "quoteBuy",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "projectId", type: "uint256" },
      { name: "tokenAmount", type: "uint256" }
    ],
    name: "quoteSell",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "projectId", type: "uint256" },
      { name: "tokenAmount", type: "uint256" }
    ],
    name: "buy",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      { name: "projectId", type: "uint256" },
      { name: "tokenAmount", type: "uint256" }
    ],
    name: "sell",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        name: "config",
        type: "tuple",
        components: [
          { name: "tokenName", type: "string" },
          { name: "tokenSymbol", type: "string" },
          { name: "walletCapEnabled", type: "bool" },
          { name: "walletCapTokens", type: "uint256" },
          { name: "launchThresholdBnb", type: "uint256" },
          { name: "marketingWallet", type: "address" }
        ]
      },
      {
        name: "taxConfig",
        type: "tuple",
        components: [
          { name: "taxEnabled", type: "bool" },
          { name: "projectTaxBps", type: "uint16" },
          {
            name: "allocation",
            type: "tuple",
            components: [
              { name: "marketingBps", type: "uint16" },
              { name: "burnBps", type: "uint16" },
              { name: "dividendBps", type: "uint16" },
              { name: "lpTreasuryBps", type: "uint16" }
            ]
          }
        ]
      },
      { name: "userSalt", type: "bytes32" },
      { name: "initialBuyTokenAmount", type: "uint256" }
    ],
    name: "createProjectVanityAndBuy",
    outputs: [
      { name: "projectId", type: "uint256" },
      { name: "token", type: "address" }
    ],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [{ name: "projectId", type: "uint256" }],
    name: "launchToPancake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "token", type: "address" }],
    name: "launchToPancakeByToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "projectId", type: "uint256" },
      { name: "receiver", type: "address" }
    ],
    name: "rescueLaunchLiquidity",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "token", type: "address" },
      { name: "receiver", type: "address" }
    ],
    name: "rescueLaunchLiquidityByToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "token", type: "address" }],
    name: "rescueLaunchLiquidityToPlatformByToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "projectId", type: "uint256" }],
    name: "confirmExternalLaunchAndRenounce",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "token", type: "address" }],
    name: "confirmExternalLaunchAndRenounceByToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "newRouter", type: "address" }],
    name: "setPancakeRouter",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "launchLpReceiver",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "newReceiver", type: "address" }],
    name: "setLaunchLpReceiver",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "MIN_LAUNCH_THRESHOLD",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "projectCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "projectId", type: "uint256" }],
    name: "getProjectBasics",
    outputs: [
      { name: "token", type: "address" },
      { name: "creator", type: "address" },
      { name: "walletCap", type: "uint256" },
      { name: "launchThreshold", type: "uint256" },
      { name: "bnbRaised", type: "uint256" },
      { name: "tokensSold", type: "uint256" },
      { name: "launched", type: "bool" },
      { name: "taxEnabled", type: "bool" },
      { name: "projectTaxBps", type: "uint16" }
    ],
    stateMutability: "view",
    type: "function"
  }
];

const ERC20_ABI = [
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  }
];

const PANCAKE_FACTORY_ABI = [
  {
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" }
    ],
    name: "getPair",
    outputs: [{ name: "pair", type: "address" }],
    stateMutability: "view",
    type: "function"
  }
];

const PANCAKE_PAIR_ABI = [
  {
    inputs: [],
    name: "getReserves",
    outputs: [
      { name: "reserve0", type: "uint112" },
      { name: "reserve1", type: "uint112" },
      { name: "blockTimestampLast", type: "uint32" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "token0",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "token1",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  }
];

const state = {
  wallet: "",
  cap: Number(config.defaultBuyCapTokens || 25),
  threshold: Number(config.defaultLaunchThresholdBnb || 5),
  avatarUrl: "",
  avatarFileName: "",
  walletCapEnabled: true,
  pendingCreateParams: null,
  devBuyBnb: 0,
  devBuyTokens: 0,
  marketFilter: "all",
  marketSearch: "",
  hardCapFilter: "all",
  marketSort: "default",
  marketLoading: false,
  marketPage: 1,
  language: "zh",
  listedOnly: false,
  selectedProject: null,
  tradeView: "chart",
  chartInterval: "1m",
  swapSide: "buy",
  buyInputMode: "bnb",
  mevProtection: false,
  slippagePercent: 15,
  selectedTokenBalance: 0,
  chainSyncing: false,
  rankingLoading: false,
  rankingMode: "marketCap",
  rankingItems: [],
  taxEnabled: false,
  projectTaxRate: 1,
  taxes: {
    wallet: 32,
    burn: 34,
    reward: 21,
    lp: 13
  }
};

let projects = [];
let tradeChartApi = null;
let tradeCandleSeries = null;
let tradeVolumeSeries = null;
let tradeLineSeries = null;
let tradeChartResizeObserver = null;
const projectLaunchpadCache = new Map();

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function shortAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function compactAddress(address, head = 10, tail = 8) {
  if (!address || address.length <= head + tail + 3) {
    return address || "--";
  }
  return `${address.slice(0, head)}...${address.slice(-tail)}`;
}

function clampNumber(value, min, max) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return min;
  }
  return Math.min(max, Math.max(min, parsed));
}

function compactLink(url) {
  const value = url.trim();
  if (!value) {
    return t("notFilled");
  }
  try {
    const parsed = new URL(value);
    return parsed.host + parsed.pathname.replace(/\/$/, "");
  } catch {
    return value;
  }
}

function escapeAttr(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getProjectAvatarMarkup(project) {
  const avatarUrl = project.avatarUrl || defaultAvatar;
  if (avatarUrl) {
    return `<img class="project-avatar-image" src="${escapeAttr(avatarUrl)}" alt="${escapeAttr(project.symbol || project.name || "token")}">`;
  }
  return `<span>${project.avatar || String(project.symbol || "?").slice(0, 1)}</span>`;
}

function hasConfiguredAddress(address) {
  return Boolean(address)
    && window.ethers
    && ethers.isAddress(address)
    && address !== ethers.ZeroAddress;
}

async function apiGet(path) {
  const response = await fetch(`${config.apiBaseUrl || ""}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`API ${path} failed`);
  }
  return response.json();
}

async function apiPost(path, data) {
  const response = await fetch(`${config.apiBaseUrl || ""}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    throw new Error(`API ${path} failed`);
  }
  return response.json();
}

function mergeProjects(realProjects) {
  const byKey = new Map();
  realProjects.forEach((project) => {
    const key = project.contract
      ? `token:${normalizeAddress(project.contract)}`
      : `id:${project.projectId ?? project.symbol}`;
    const existing = byKey.get(key);
    const next = existing ? { ...existing, ...project } : { ...project };
    if (existing && (!project.avatarUrl || project.avatarUrl === defaultAvatar) && existing.avatarUrl && existing.avatarUrl !== defaultAvatar) {
      next.avatarUrl = existing.avatarUrl;
    }
    byKey.set(key, { ...next, avatarUrl: next.avatarUrl || defaultAvatar });
  });
  projects = Array.from(byKey.values());
}

async function loadBackendProjects() {
  try {
    state.marketLoading = true;
    renderProjects();
    const data = await apiGet("/api/projects");
    mergeProjects(data.projects || []);
    renderTradeTicker();
    renderProjects();
    refreshProjectHolderCounts();
  } catch {
    projects = [];
  } finally {
    state.marketLoading = false;
    renderProjects();
  }
}

async function refreshProjectHolderCounts(limit = 80) {
  const candidates = projects
    .filter((project) => project.projectId !== undefined && project.projectId !== null && project.contract)
    .slice(0, limit);
  await Promise.all(candidates.map(async (project) => {
    try {
      const data = await apiGet(`/api/trades?projectId=${encodeURIComponent(project.projectId)}&token=${encodeURIComponent(project.contract || "")}`);
      const holderCount = computeHoldersFromTrades(data.trades || []).length;
      if (Number(project.holders || 0) !== holderCount) {
        project.holders = holderCount;
        apiPost("/api/projects/upsert", project).catch(() => {});
      }
    } catch {
      // Holder counts are supplemental; keep the market usable if a trade request fails.
    }
  }));
  renderProjects();
}

function normalizeAddress(address) {
  return String(address || "").toLowerCase();
}

function isSameAddress(a, b) {
  return normalizeAddress(a) === normalizeAddress(b);
}

function getKnownLaunchpadAddresses() {
  if (!window.ethers) {
    return [];
  }
  const addresses = [
    config.launchpadAddress,
    ...(Array.isArray(config.legacyLaunchpadAddresses) ? config.legacyLaunchpadAddresses : [])
  ];
  const unique = [];
  addresses.forEach((address) => {
    if (!hasConfiguredAddress(address)) {
      return;
    }
    const normalized = normalizeAddress(address);
    if (!unique.some((item) => normalizeAddress(item) === normalized)) {
      unique.push(address);
    }
  });
  return unique;
}

function getProjectLaunchpadAddress(project) {
  return hasConfiguredAddress(project && project.launchpadAddress)
    ? project.launchpadAddress
    : config.launchpadAddress;
}

async function findProjectOnLaunchpads(tokenAddress, provider, preferredProject = null) {
  const target = normalizeAddress(tokenAddress);
  const preferredId = preferredProject && preferredProject.projectId !== undefined && preferredProject.projectId !== null
    ? BigInt(preferredProject.projectId)
    : null;
  const cacheKey = target;
  if (projectLaunchpadCache.has(cacheKey)) {
    return projectLaunchpadCache.get(cacheKey);
  }

  for (const launchpadAddress of getKnownLaunchpadAddresses()) {
    const launchpad = getLaunchpadContract(provider, launchpadAddress);
    if (preferredId !== null) {
      try {
        const basics = await launchpad.getProjectBasics(preferredId);
        if (normalizeAddress(basics.token) === target) {
          const found = {
            projectId: String(preferredId),
            launchpadAddress,
            basics,
            launchpad
          };
          projectLaunchpadCache.set(cacheKey, found);
          return found;
        }
      } catch {
        // This launchpad does not have the preferred projectId; scan below.
      }
    }

    try {
      const count = Number(await launchpad.projectCount());
      for (let projectId = 0; projectId < count; projectId += 1) {
        const basics = await launchpad.getProjectBasics(BigInt(projectId));
        if (normalizeAddress(basics.token) !== target) {
          continue;
        }
        const found = {
          projectId: String(projectId),
          launchpadAddress,
          basics,
          launchpad
        };
        projectLaunchpadCache.set(cacheKey, found);
        return found;
      }
    } catch {
      // Keep trying the remaining known launchpads.
    }
  }
  return null;
}

async function ensureProjectLaunchpad(project, signerOrProvider) {
  if (!project || !window.ethers || !ethers.isAddress(project.contract || "")) {
    return project;
  }
  const launchpadAddress = getProjectLaunchpadAddress(project);
  if (hasConfiguredAddress(launchpadAddress)) {
    try {
      const launchpad = getLaunchpadContract(signerOrProvider, launchpadAddress);
      const basics = await launchpad.getProjectBasics(BigInt(project.projectId));
      if (normalizeAddress(basics.token) === normalizeAddress(project.contract)) {
        project.launchpadAddress = launchpadAddress;
        return project;
      }
    } catch {
      // Fall through and try all known launchpads.
    }
  }

  const found = await findProjectOnLaunchpads(project.contract, signerOrProvider, project);
  if (!found) {
    return project;
  }
  const updated = {
    ...project,
    projectId: found.projectId,
    launchpadAddress: found.launchpadAddress
  };
  const index = projects.findIndex((item) => normalizeAddress(item.contract) === normalizeAddress(project.contract));
  if (index >= 0) {
    projects[index] = { ...projects[index], ...updated };
    state.selectedProject = projects[index];
    apiPost("/api/projects/upsert", projects[index]).catch(() => {});
    return projects[index];
  }
  return updated;
}

function upsertLocalProject(project) {
  const key = project.contract
    ? (item) => normalizeAddress(item.contract) === normalizeAddress(project.contract)
    : (item) => String(item.projectId) === String(project.projectId);
  const index = projects.findIndex(key);
  const existing = index >= 0 ? projects[index] : null;
  const merged = existing ? { ...existing, ...project } : { ...project };
  if (existing && (!project.avatarUrl || project.avatarUrl === defaultAvatar) && existing.avatarUrl && existing.avatarUrl !== defaultAvatar) {
    merged.avatarUrl = existing.avatarUrl;
  }
  if (existing && !project.createdAt && existing.createdAt) {
    merged.createdAt = existing.createdAt;
  }
  if (existing && existing.metadata && !project.metadata) {
    merged.metadata = existing.metadata;
  }
  if (index >= 0) {
    projects[index] = merged;
  } else {
    projects.unshift(merged);
  }
  renderTradeTicker();
  renderProjects();
  apiPost("/api/projects/upsert", merged).catch(() => {});
  return merged;
}

function getProjectStage(launched, progress) {
  if (launched) {
    return "launched";
  }
  if (progress >= 80) {
    return "launching";
  }
  return "new";
}

function getDisplayProgress(project) {
  if (!project) {
    return 0;
  }
  if (project.listed || project.stage === "launched") {
    return 100;
  }
  return Math.min(100, Number(project.progress || 0));
}

function renderLeaderboardPanel() {
  const panel = $("#treasuryPanel");
  if (!panel || panel.dataset.leaderboardReady === "1") {
    return;
  }
  panel.setAttribute("aria-label", "Leaderboard");
  panel.innerHTML = `
    <div class="leaderboard-layout">
      <div class="leaderboard-shell">
        <div class="leaderboard-head">
          <div class="leaderboard-tabs">
            <button class="active" type="button" data-rank-mode="marketCap" data-i18n="rankMarketCap">${t("rankMarketCap")}</button>
            <button type="button" data-rank-mode="volume24h" data-i18n="rankVolume24h">${t("rankVolume24h")}</button>
          </div>
          <button id="refreshRankingButton" class="rank-filter" type="button" data-i18n="rankRefresh">${t("rankRefresh")}</button>
        </div>
        <div id="leaderboardList" class="leaderboard-list">
          <div class="leaderboard-empty">${t("rankLoading")}</div>
        </div>
      </div>
    </div>
  `;
  panel.dataset.leaderboardReady = "1";
  panel.querySelectorAll("[data-rank-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.rankingMode = button.dataset.rankMode || "marketCap";
      panel.querySelectorAll("[data-rank-mode]").forEach((item) => {
        item.classList.toggle("active", item === button);
      });
      renderRanking();
    });
  });
  $("#refreshRankingButton").addEventListener("click", () => loadRanking(true));
  $("#leaderboardList").addEventListener("click", (event) => {
    const row = event.target.closest("[data-rank-token]");
    if (!row) {
      return;
    }
    const project = projects.find((item) => normalizeAddress(item.contract) === normalizeAddress(row.dataset.rankToken));
    if (project) {
      openTradeModal(project);
    }
  });
}

async function readCurrentPriceBnb(projectId, launchpad, fallbackPrice = 0) {
  try {
    const oneTokenCost = await launchpad.quoteBuy(BigInt(projectId), ethers.parseEther("1"));
    return Number(ethers.formatEther(oneTokenCost));
  } catch {
    return Number(fallbackPrice || 0);
  }
}

async function buildProjectFromChain(projectId, basics, provider, launchpadContract = null, launchpadAddress = config.launchpadAddress) {
  const token = new ethers.Contract(basics.token, ERC20_ABI, provider);
  let name = `Project ${projectId}`;
  let symbol = `P${projectId}`;
  let totalSupply = TOTAL_TOKEN_SUPPLY;
  try {
    [name, symbol] = await Promise.all([token.name(), token.symbol()]);
  } catch {
    // Some tokens may not expose metadata cleanly; keep fallback names.
  }
  try {
    totalSupply = Number(ethers.formatEther(await token.totalSupply()));
  } catch {
    totalSupply = TOTAL_TOKEN_SUPPLY;
  }
  const launchThreshold = Number(ethers.formatEther(basics.launchThreshold || 0n));
  const bnbRaised = Number(ethers.formatEther(basics.bnbRaised || 0n));
  const tokensSold = Number(ethers.formatEther(basics.tokensSold || 0n));
  const averagePriceBnb = tokensSold > 0 ? bnbRaised / tokensSold : 0;
  const launchpad = launchpadContract || getLaunchpadContract(provider);
  const priceBnb = await readCurrentPriceBnb(projectId, launchpad, averagePriceBnb);
  const marketCap = priceBnb > 0 ? priceBnb * TOTAL_TOKEN_SUPPLY * 600 : bnbRaised * 600;
  const launched = Boolean(basics.launched);
  const progress = launched ? 100 : launchThreshold > 0
    ? Math.min(100, Number(((bnbRaised / launchThreshold) * 100).toFixed(3)))
    : 0;
  return {
    projectId: String(projectId),
    name,
    symbol,
    status: launched ? "已发射" : "内盘",
    stage: getProjectStage(launched, progress),
    progress,
    cap: basics.walletCap ? Math.max(0, Number(ethers.formatEther(basics.walletCap))) : 0,
    raised: `${bnbRaised.toFixed(3)} / ${launchThreshold || 0} BNB`,
    holders: 0,
    marketCap: Math.round(marketCap),
    liquidityUsd: Number((bnbRaised * 600).toFixed(2)),
    bnbRaised,
    tokensSold,
    totalSupply,
    priceBnb,
    creator: basics.creator,
    contract: basics.token,
    launchpadAddress,
    change: 0,
    listed: launched,
    avatar: symbol.slice(0, 1).toUpperCase()
  };
}

async function refreshProjectFromChain(project, signerOrProvider) {
  if (
    !project
    || project.projectId === undefined
    || project.projectId === null
    || !window.ethers
    || !ethers.isAddress(project.contract || "")
  ) {
    return project;
  }
  const tradeProject = await ensureProjectLaunchpad(project, signerOrProvider);
  const launchpadAddress = getProjectLaunchpadAddress(tradeProject);
  const launchpad = getLaunchpadContract(signerOrProvider, launchpadAddress);
  const basics = await launchpad.getProjectBasics(BigInt(tradeProject.projectId));
  if (normalizeAddress(basics.token) !== normalizeAddress(tradeProject.contract)) {
    return tradeProject;
  }
  const chainProject = await buildProjectFromChain(
    tradeProject.projectId,
    basics,
    signerOrProvider,
    launchpad,
    launchpadAddress
  );
  return upsertLocalProject({
    ...tradeProject,
    ...chainProject,
    avatarUrl: tradeProject.avatarUrl || chainProject.avatarUrl,
    metadata: tradeProject.metadata || chainProject.metadata
  });
}

async function syncChainProjects(limit = 120) {
  if (state.chainSyncing || !window.ethers || !hasConfiguredAddress(config.launchpadAddress)) {
    return;
  }
  state.chainSyncing = true;
  try {
    const provider = window.ethereum
      ? new ethers.BrowserProvider(window.ethereum)
      : new ethers.JsonRpcProvider(config.rpcUrl || "https://bsc-dataseed.binance.org");
    const launchpad = getLaunchpadContract(provider);
    const count = Number(await launchpad.projectCount());
    const start = Math.max(0, count - Number(limit || 120));
    for (let projectId = count - 1; projectId >= start; projectId -= 1) {
      try {
        const basics = await launchpad.getProjectBasics(BigInt(projectId));
        const chainProject = await buildProjectFromChain(projectId, basics, provider, launchpad, config.launchpadAddress);
        upsertLocalProject(chainProject);
      } catch {
        // Keep syncing the rest even if one historical project cannot be read.
      }
    }
  } finally {
    state.chainSyncing = false;
  }
}

async function findProjectByTokenAddress(tokenAddress) {
  if (!window.ethers || !ethers.isAddress(tokenAddress)) {
    throw new Error("请输入正确的 0x 代币合约地址。");
  }
  const existing = projects.find((project) => normalizeAddress(project.contract) === normalizeAddress(tokenAddress));
  if (existing) {
    return existing;
  }
  if (!hasConfiguredAddress(config.launchpadAddress)) {
    throw new Error("config.js 里还没有填写 launchpadAddress，无法从链上反查项目。");
  }

  const provider = window.ethereum
    ? new ethers.BrowserProvider(window.ethereum)
    : new ethers.JsonRpcProvider(config.rpcUrl || "https://bsc-dataseed.binance.org");
  const found = await findProjectOnLaunchpads(tokenAddress, provider);
  if (found) {
    const project = await buildProjectFromChain(found.projectId, found.basics, provider, found.launchpad, found.launchpadAddress);
    return upsertLocalProject(project);
  }
  const launchpad = getLaunchpadContract(provider);
  const count = Number(await launchpad.projectCount());
  const target = normalizeAddress(tokenAddress);

  for (let projectId = 0; projectId < count; projectId += 1) {
    const basics = await launchpad.getProjectBasics(BigInt(projectId));
    if (normalizeAddress(basics.token) !== target) {
      continue;
    }
    const token = new ethers.Contract(basics.token, ERC20_ABI, provider);
    let name = `Project ${projectId}`;
    let symbol = `P${projectId}`;
    let totalSupply = TOTAL_TOKEN_SUPPLY;
    try {
      [name, symbol] = await Promise.all([token.name(), token.symbol()]);
    } catch {
      // Some tokens may not expose metadata cleanly; keep fallback names.
    }
    try {
      totalSupply = Number(ethers.formatEther(await token.totalSupply()));
    } catch {
      totalSupply = TOTAL_TOKEN_SUPPLY;
    }
    const launchThreshold = Number(ethers.formatEther(basics.launchThreshold || 0n));
    const bnbRaised = Number(ethers.formatEther(basics.bnbRaised || 0n));
    const tokensSold = Number(ethers.formatEther(basics.tokensSold || 0n));
    const averagePriceBnb = tokensSold > 0 ? bnbRaised / tokensSold : 0;
    const priceBnb = await readCurrentPriceBnb(projectId, launchpad, averagePriceBnb);
    const marketCap = priceBnb > 0 ? priceBnb * TOTAL_TOKEN_SUPPLY * 600 : bnbRaised * 600;
    const launched = Boolean(basics.launched);
    const progress = launched ? 100 : launchThreshold > 0 ? Math.min(100, Number(((bnbRaised / launchThreshold) * 100).toFixed(3))) : 0;
    return upsertLocalProject({
      projectId: String(projectId),
      name,
      symbol,
      status: basics.launched ? "已发射" : "内盘",
      stage: basics.launched ? "launched" : "new",
      progress,
      cap: basics.walletCap ? Math.max(0, Number(ethers.formatEther(basics.walletCap))) : 0,
      raised: `${bnbRaised.toFixed(3)} / ${launchThreshold || 0} BNB`,
      holders: 0,
      marketCap: Math.round(marketCap),
      liquidityUsd: Number((bnbRaised * 600).toFixed(2)),
      bnbRaised,
      tokensSold,
      totalSupply,
      priceBnb,
      creator: basics.creator,
      contract: basics.token,
      change: 0,
      listed: Boolean(basics.launched),
      avatar: symbol.slice(0, 1).toUpperCase()
    });
  }

  throw new Error("没有在当前发射台合约里找到这个代币地址。");
}

function setCreateStatus(message, mode = "") {
  const status = $("#createStatus");
  status.textContent = message;
  status.classList.toggle("success", mode === "success");
  status.classList.toggle("error", mode === "error");
  status.classList.toggle("warning", mode === "warning");
}

function formatMarketCap(value) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 100_000 ? 0 : 2)}K`;
  }
  return String(value);
}

function formatTokenAmount(value, digits = 3) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) {
    return "0";
  }
  return number.toLocaleString(undefined, {
    maximumFractionDigits: digits
  });
}

function formatUsd(value, digits = 2) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) {
    return "$0";
  }
  return `$${formatMarketCap(Number(number.toFixed(digits)))}`;
}

function formatBnb(value, digits = 6) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) {
    return "0 BNB";
  }
  return `${number.toFixed(digits).replace(/\.?0+$/, "")} BNB`;
}

function normalizeDecimalInput(value) {
  let text = String(value ?? "").trim().replace(/,/g, "");
  if (text.startsWith(".")) {
    text = `0${text}`;
  }
  if (text.endsWith(".")) {
    text = text.slice(0, -1);
  }
  return text;
}

function parsePositiveEtherInput(value) {
  const text = normalizeDecimalInput(value);
  if (!text) {
    return null;
  }
  if (!/^\d+(\.\d{0,18})?$/.test(text)) {
    throw new Error("请输入正确的数量，最多支持 18 位小数。");
  }
  const wei = ethers.parseEther(text);
  if (wei <= 0n) {
    return null;
  }
  return { text, wei };
}

function estimateInitialBuyTokens(bnbAmount, params) {
  const bnb = Number(bnbAmount || 0);
  const launchThreshold = Number(params.launchThresholdBnb || state.threshold || 0);
  if (!Number.isFinite(bnb) || bnb <= 0 || !Number.isFinite(launchThreshold) || launchThreshold <= 0) {
    return 0;
  }
  const projectTaxBps = Number(params.projectMechanismTaxBps || 0);
  const totalTaxBps = 100 + projectTaxBps;
  const poolBudget = bnb * (10_000 - totalTaxBps) / 10_000;
  const supply = INTERNAL_SALE_SUPPLY;
  const cap = params.walletCapEnabled ? Number(params.maxWalletBuyTokens || 0) : supply;
  const maxTokens = Math.max(0, Math.min(cap || supply, supply));
  let low = 0;
  let high = maxTokens;
  for (let index = 0; index < 80; index += 1) {
    const mid = (low + high) / 2;
    const poolCost = launchThreshold * ((mid * 0.5) / supply + (mid * mid) / (supply * supply));
    if (poolCost <= poolBudget) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return Math.max(0, Math.min(maxTokens, low));
}

function formatCreatedTime(project) {
  const raw = project.createdAt || project.created_at || project.updatedAt || "";
  const time = raw ? Date.parse(raw) : Number.NaN;
  if (Number.isNaN(time)) {
    return "--";
  }
  return new Date(time).toLocaleString();
}

function parseRaisedBnb(project) {
  const match = String(project.raised || "").match(/^([0-9.]+)/);
  return match ? Number(match[1]) : 0;
}

function parseLaunchThreshold(project) {
  const match = String(project.raised || "").match(/\/\s*([0-9.]+)/);
  return match ? Number(match[1]) : 0;
}

function isWalletCapEnabled(project) {
  return Number(project && project.cap) > 0;
}

function formatCapDisplay(project) {
  return isWalletCapEnabled(project) ? `${Number(project.cap)} ${t("tokenUnit")}` : t("noWalletCap");
}

function computeHoldersFromTrades(trades = []) {
  const holderMap = new Map();
  trades.forEach((trade) => {
    const account = normalizeAddress(trade.account);
    if (!account) {
      return;
    }
    const current = holderMap.get(account) || { account: trade.account, amount: 0 };
    const delta = Number(trade.tokenAmount || 0) * (trade.side === "sell" ? -1 : 1);
    current.amount += delta;
    holderMap.set(account, current);
  });
  return Array.from(holderMap.values())
    .filter((holder) => holder.amount > 0.000001)
    .sort((a, b) => b.amount - a.amount);
}

function getProjectTimeValue(project) {
  const raw = project.createdAt || project.created_at || project.updatedAt || "";
  const parsed = raw ? Date.parse(raw) : Number.NaN;
  if (!Number.isNaN(parsed)) {
    return parsed;
  }
  return Number(project.projectId || 0);
}

function getVisibleProjects() {
  const keyword = state.marketSearch.trim().toLowerCase();
  const filtered = projects
    .filter((project) => {
      if (state.marketFilter === "all") {
        return true;
      }
      if (state.marketFilter === "launched") {
        return project.listed;
      }
      return project.stage === state.marketFilter;
    })
    .filter((project) => !state.listedOnly || project.listed)
    .filter((project) => {
      const threshold = parseLaunchThreshold(project);
      if (state.hardCapFilter === "low") {
        return threshold > 0 && threshold <= 4;
      }
      if (state.hardCapFilter === "mid") {
        return threshold > 4 && threshold <= 6;
      }
      if (state.hardCapFilter === "high") {
        return threshold > 6;
      }
      return true;
    })
    .filter((project) => {
      if (!keyword) {
        return true;
      }
      return `${project.name} ${project.symbol} ${project.contract || ""}`.toLowerCase().includes(keyword);
    });
  const sorters = {
    marketCap: (a, b) => Number(b.marketCap || 0) - Number(a.marketCap || 0),
    progress: (a, b) => Number(b.progress || 0) - Number(a.progress || 0),
    newest: (a, b) => getProjectTimeValue(b) - getProjectTimeValue(a),
    endSoon: (a, b) => Number(b.progress || 0) - Number(a.progress || 0),
    hot: (a, b) => (Number(b.holders || 0) * 2 + Number(b.progress || 0) + Number(b.marketCap || 0) / 10000)
      - (Number(a.holders || 0) * 2 + Number(a.progress || 0) + Number(a.marketCap || 0) / 10000),
    default: (a, b) => {
      const score = (project) => (project.listed ? 300 : 0)
        + Number(project.progress || 0)
        + (Number(project.marketCap || 0) / 10000);
      return score(b) - score(a);
    }
  };
  return filtered.sort(sorters[state.marketSort] || sorters.default);
}

function renderTradeTicker() {
  const items = projects
    .slice()
    .filter((project) => Number(project.marketCap || 0) > 0 || Number(project.progress || 0) > 0)
    .sort((a, b) => b.marketCap - a.marketCap)
    .map((project, index) => `
      <span class="trade-chip chip-${index % 6}">
        <b>${project.creator}</b>
        底池 ${project.raised || "--"}
        <strong>${project.symbol}</strong>
      </span>
    `);
  $("#tradeTickerTrack").innerHTML = items.length ? [...items, ...items].join("") : "";
}

function renderProjects() {
  const list = $("#projectList");
  if (state.marketLoading) {
    list.innerHTML = `<div class="empty-market loading-state">${t("loadingProjects")}</div>`;
    return;
  }
  const visibleProjects = getVisibleProjects();
  const pageSize = window.matchMedia("(max-width: 760px)").matches ? 6 : 9;
  const totalPages = Math.max(1, Math.ceil(visibleProjects.length / pageSize));
  state.marketPage = Math.min(Math.max(1, Number(state.marketPage || 1)), totalPages);
  const pageProjects = visibleProjects.slice((state.marketPage - 1) * pageSize, state.marketPage * pageSize);
  if (visibleProjects.length === 0) {
    list.innerHTML = `
      <div class="empty-market empty-market-rich">
        <div class="empty-illustration" aria-hidden="true">🪹</div>
        <h2>袋鼠仓还是空的</h2>
        <p>成为第一个发射项目的人，前 3 个项目可获平台流量扶持。</p>
        <div class="empty-actions">
          <button class="primary-action" type="button" data-open-create>✨ 创建首个项目</button>
          <button class="ghost-action" type="button" data-empty-refresh>🔄 刷新历史数据</button>
        </div>
      </div>
    `;
    return;
  }
  list.innerHTML = `
    ${pageProjects.map((project) => {
    const displayProgress = getDisplayProgress(project);
    return `
    <article class="project-card" data-project-symbol="${project.symbol}">
      <div class="project-thumb">
        ${getProjectAvatarMarkup(project)}
        <button type="button" aria-label="收藏 ${project.name}">★</button>
      </div>
      <div class="project-body">
        <div class="project-title-row">
          <div>
            <h3>${project.symbol}</h3>
            <span class="token-kind">${project.name} / BSC</span>
          </div>
          <strong class="change-badge">+${project.change}%</strong>
        </div>
        <dl class="project-facts">
          <div>
            <dt>合约地址:</dt>
            <dd>
              <button class="inline-copy-address" type="button" data-copy-address="${project.contract || ""}" title="${project.contract || ""}">
                ${compactAddress(project.contract)}
              </button>
            </dd>
          </div>
          <div>
            <dt>${t("marketCapLabel")}:</dt>
            <dd>${formatMarketCap(project.marketCap)}</dd>
          </div>
          <div>
            <dt>${t("walletCapLabel")}:</dt>
            <dd>${formatCapDisplay(project)}</dd>
          </div>
          <div>
            <dt>${t("holdersLabel")}:</dt>
            <dd>${project.holders}</dd>
          </div>
        </dl>
        <div class="project-progress-line">
          <i style="--value: ${displayProgress}%"></i>
          <b>${displayProgress}%</b>
        </div>
        <div class="project-card-footer">
          <span class="badge">${project.status}</span>
          <span>${t("poolLabel")} ${project.raised}</span>
        </div>
      </div>
    </article>
    `;
  }).join("")}
    ${totalPages > 1 ? `
      <nav class="market-pagination" aria-label="Project pages">
        <button type="button" data-page-action="prev" ${state.marketPage <= 1 ? "disabled" : ""}>${t("previousPage")}</button>
        <span>${state.marketPage} / ${totalPages}</span>
        <button type="button" data-page-action="next" ${state.marketPage >= totalPages ? "disabled" : ""}>${t("nextPage")}</button>
      </nav>
    ` : ""}
  `;
}

function renderProfileList(selector, items, emptyText) {
  const target = $(selector);
  if (!target) {
    return;
  }
  if (!items.length) {
    target.innerHTML = `<div class="profile-empty">${emptyText}</div>`;
    return;
  }
  target.innerHTML = items.map((project) => `
    <button class="profile-token-row" type="button" data-profile-project="${project.symbol}">
      ${getProjectAvatarMarkup(project)}
      <span>
        <strong>${project.name}</strong>
        <small>${project.symbol} · ${project.raised || "--"}</small>
      </span>
      <b>${project.listed ? t("statusListed") : t("statusInternal")}</b>
    </button>
  `).join("");
}

const translations = {
  zh: {
    tabMarket: "市场",
    tabCreate: "创建",
    tabTreasury: "排行榜",
    heroKicker: "roo pouch exchange",
    heroTitle: "袋鼠仓里的公平发射",
    heroCopy: "BSC 限购内盘、满池发射、LP 测试期进入平台钱包。每个新项目先进入 roo 袋鼠仓，靠成交和曲线自己长出来。",
    createToken: "创建代币",
    searchPlaceholder: "搜索名称 / 符号 / 合约地址",
    search: "搜索",
    totalSupply: "固定总量",
    launchPool: "发射底池",
    buyLimitRange: "限购范围",
    listedOnly: "已上线 Pancake Swap",
    filterAll: "当前项目",
    filterLaunching: "即将发射",
    filterNew: "新创建",
    filterLaunched: "已发射",
    filterHardCapAll: "硬顶",
    sortDefault: "默认推荐",
    sortMarketCap: "市值",
    sortProgress: "进度",
    sortStartTime: "开始时间",
    sortEndTime: "接近结束",
    sortHot: "热度",
    marketCapRank: "市值排名",
    refresh: "刷新",
    syncing: "同步中...",
    connectWallet: "连接钱包",
    walletMissing: "未检测到钱包",
    walletNotConnected: "未连接",
    notFilled: "未填写",
    createEyebrow: "创建 BSC 项目",
    createTitle: "创建限购发射项目",
    updatePreview: "更新预览",
    projectAvatar: "项目头像",
    avatarSupport: "支持 PNG / JPG / WEBP",
    uploadAvatar: "上传项目头像",
    noImageSelected: "未选择图片",
    avatarHelp: "创建项目时可以带上头像，预览卡片会同步展示。",
    projectName: "项目名称",
    tokenSymbol: "代币符号",
    launchPoolBnb: "发射底池 BNB",
    socialInfo: "社媒信息",
    socialHelp: "创建页同步收集",
    website: "网站",
    walletCapTitle: "单钱包限购",
    enableWalletCap: "启用限购",
    walletCapSteps: "限购阶梯",
    tokensPerWallet: "枚 / 钱包",
    manualWalletCap: "手动限购 1-100 枚",
    tokenUnit: "枚",
    noWalletCap: "不限购",
    devBuyModalTitle: "选择你想买入的代币数量",
    devBuyModalCopy: "创建代币时必须进行 dev 首买，创建和买入会在同一笔链上交易中完成，避免第二笔交易被抢跑。",
    devBuySwitchLabel: "以 BNB 买入",
    confirmDevBuy: "确认买入！",
    devBuyReceiveText: "你将收到约 {amount} {symbol}",
    devBuyThresholdWarning: "提醒：当前金额已达到或超过发射阈值 {threshold}，确认后可能一笔打满并触发发射。",
    devBuyCreatingStatus: "正在创建...",
    previousPage: "上一页",
    nextPage: "下一页",
    launchThresholdTitle: "发射阈值",
    projectTax: "项目税收",
    enableTax: "启用税收",
    taxNote: "关闭时项目不收机制税；启用后可设置 1%-10% 税率，营销收 BNB，分红自动发给达到 1 枚的持币者，LP 回流自动进入项目池。",
    marketingWallet: "营销钱包",
    marketingWalletHelp: "启用税收后才需要填写；留空自动使用当前连接钱包",
    marketingWalletBnb: "营销钱包（收 BNB）",
    marketingWalletPlaceholder: "营销收款钱包地址 0x...",
    taxRate: "税率",
    manualTaxRate: "手动税率 1-10%",
    taxAllocation: "税收分配",
    taxTotalLabel: "总计：",
    taxRemainLabel: "未分配：",
    taxFull: "分配已满 100%。",
    taxInvalid: "当前分配为 {total}%，需要刚好等于 100%。",
    taxMarketingRow: "营销钱包（营销、捐赠等，BNB）",
    taxBurnRow: "销毁（减少供应量）",
    taxRewardRow: "持币分红（>= 1 枚自动收 BNB）",
    taxLpRow: "回流 LP（BNB 自动进项目池）",
    summarySupply: "总供应量",
    summaryWalletCap: "单钱包限购",
    summaryLaunchPool: "发射底池",
    summaryLpDestination: "LP 去向",
    createParams: "创建参数",
    copy: "复制",
    copied: "已复制",
    createInitialStatus: "点击后会连接钱包、调用发射台合约并提交创建交易。",
    submitPending: "提交中...",
    createConnectStatus: "正在连接钱包并检查 BSC 网络...",
    createReadVanityStatus: "正在读取发射台合约规则...",
    createGenerateAddressStatus: "正在生成合约代币地址...",
    launchpadOutdatedError: "当前 config.js 里的发射台合约不是最新版，不支持自动生成 0000 后缀代币地址。请先用当前代码重新部署新版发射台合约，然后把新合约地址填到 config.js 的 launchpadAddress。",
    createVerifyAddressStatus: "已找到候选地址：{address}，正在链上校验合约代币地址...",
    createConfirmTxStatus: "链上确认预测地址：{address}，正在唤起钱包确认创建交易。",
    createSubmittedStatus: "交易已提交：{hash}，正在等待链上确认...",
    createSaveAvatarStatus: "创建成功：Project #{id}。正在保存项目头像...",
    createVerifySourceStatus: "创建成功：Project #{id}，代币 {token}。正在自动开源...",
    createVerifiedStatus: "创建成功：Project #{id}，代币 {token}。{message}",
    createConfirmedNoEventStatus: "交易已确认：{hash}。未解析到 ProjectCreated 事件，请到 BscScan 查看详情。",
    createFailedStatus: "创建交易失败，请检查钱包弹窗和参数。",
    createPreviewUpdated: "预览已更新，确认无误后点击“创建代币”。",
    walletReadyStatus: "钱包已连接，可以创建代币。",
    walletConnectFailed: "连接钱包失败。",
    networkSwitchFailed: "切换 BSC 网络失败。",
    avatarTypeError: "头像只支持 PNG、JPG、WebP 格式。",
    avatarSizeError: "头像需要小于 2MB，请压缩后再上传。",
    treasuryEyebrow: "金库",
    treasuryTitle: "项目金库流向",
    treasuryInternalKicker: "内盘交易",
    treasuryInternalTitle: "限购成交",
    treasuryInternalCopy: "项目在内盘阶段按单钱包 1-100 枚限购成交，达到设定底池后再发射到 Pancake Swap。",
    treasuryTaxKicker: "项目税机制",
    treasuryTaxTitle: "四路分配",
    treasuryTaxCopy: "营销收 BNB；分红自动发给达到 1 枚的持币者；回流 LP 自动进入项目池；销毁用于减少供应量。",
    treasuryLaunchKicker: "外盘发射",
    treasuryLaunchTitle: "LP 测试托管",
    treasuryLaunchCopy: "测试阶段可用 0.05-8 BNB 的手动阈值创建 Pancake 流动池，LP token 先发送到平台钱包。",
    profileEyebrow: "个人资料",
    profileTitle: "个人资料",
    profileWalletLabel: "钱包",
    profileCreatedLabel: "创建项目",
    profileTradedLabel: "交易代币",
    profileHoldingLabel: "当前持仓",
    profileCreatedTitle: "我创建的代币",
    profileTradedTitle: "我交易过的代币",
    profileHoldingTitle: "我的持仓",
    profileCreatedConnectEmpty: "连接钱包后显示你创建的代币。",
    profileTradedConnectEmpty: "连接钱包后显示你交易过的代币。",
    profileHoldingConnectEmpty: "连接钱包后显示你的持仓。",
    profileCreatedEmpty: "还没有创建过代币。",
    profileTradedEmpty: "还没有真实交易记录。",
    profileHoldingEmpty: "没有读取到持仓。",
    drawerMarket: "发射台",
    drawerCreate: "创建代币",
    drawerTreasury: "排行榜",
    rankMarketCap: "市值排行榜",
    rankVolume24h: "24小时交易量",
    rankRefresh: "刷新链上数据",
    rankLoading: "正在读取链上市值...",
    rankEmpty: "暂无已发射并上线 Pancake V2 的项目",
    rankMarketCapLabel: "市值",
    rankVolumeLabel: "24h 交易量",
    drawerProfile: "个人资料",
    faqTitle: "常见问题",
    faqInternalQuestion: "什么是内盘发射？",
    faqInternalAnswer: "项目先在 roo 内盘完成限购交易和底池积累，达到设置的 BNB 阈值后再发射到 Pancake Swap。",
    faqLaunchedQuestion: "什么是已发射项目？",
    faqLaunchedAnswer: "已发射表示发射台合约记录该项目已经迁移到 Pancake Swap；测试阶段外盘 LP 会先进入平台钱包。",
    faqStorageQuestion: "头像和 K 线数据存在哪里？",
    faqStorageAnswer: "头像保存在 Vercel Blob，项目、交易和 K 线原始成交记录保存在 Neon/Postgres。",
    faqAuditQuestion: "什么是审计代币？",
    faqAuditAnswer: "审计代币通常指合约代码经过第三方安全检查的代币。roo 页面展示不等于审计背书，用户仍需自行判断风险。",
    creatorLabel: "创建者",
    marketCapLabel: "市值",
    walletCapLabel: "限购",
    holdersLabel: "持有人",
    poolLabel: "底池",
    statusListed: "已上线",
    statusInternal: "内盘",
    loadingProjects: "正在加载项目...",
    emptyProjects: "暂无真实项目。请创建项目，或点击刷新同步链上历史项目。",
    contractLabel: "合约",
    creatorLabelFull: "创建者",
    copyButton: "复制",
    copiedButton: "已复制",
    tradeListedDescription: "该项目已上线 Pancake Swap，可从外盘继续交易。",
    tradeInternalDescription: "该项目仍在 roo 内盘，达到发射阈值后可进入 Pancake Swap。",
    tradeUnsyncedWarning: "这个项目还没有同步到链上 projectId，暂时不能交易。",
    tradeVolumeTemplate: "{volume} / {count} 笔",
    bondingText: "联合曲线中仍有 <strong>{remaining} {symbol}</strong> 可供出售；当前底池 <strong>{raised}</strong>。"
  },
  en: {
    tabMarket: "Market",
    tabCreate: "Create",
    tabTreasury: "Ranking",
    heroKicker: "roo pouch exchange",
    heroTitle: "Fair launches from the roo pouch",
    heroCopy: "BSC limited-buy bonding, pool-triggered launch, and platform-held LP during testing. Every project starts inside roo and grows through real trades.",
    createToken: "Create Token",
    searchPlaceholder: "Search name / symbol / contract",
    search: "Search",
    totalSupply: "Total supply",
    launchPool: "Launch pool",
    buyLimitRange: "Buy limit",
    listedOnly: "Listed on Pancake Swap",
    filterAll: "All projects",
    filterLaunching: "Launching soon",
    filterNew: "New",
    filterLaunched: "Launched",
    filterHardCapAll: "Hard cap",
    sortDefault: "Default",
    sortMarketCap: "Market cap",
    sortProgress: "Progress",
    sortStartTime: "Start time",
    sortEndTime: "End time",
    sortHot: "Hot",
    marketCapRank: "Market cap rank",
    refresh: "Refresh",
    syncing: "Syncing...",
    connectWallet: "Connect Wallet",
    walletMissing: "Wallet not found",
    walletNotConnected: "Not connected",
    notFilled: "Not filled",
    createEyebrow: "Create BSC Project",
    createTitle: "Create a limited-buy launch",
    updatePreview: "Update Preview",
    projectAvatar: "Project Avatar",
    avatarSupport: "PNG / JPG / WEBP supported",
    uploadAvatar: "Upload project avatar",
    noImageSelected: "No image selected",
    avatarHelp: "Add an avatar when creating the project. The preview card updates automatically.",
    projectName: "Project name",
    tokenSymbol: "Token symbol",
    launchPoolBnb: "Launch pool BNB",
    socialInfo: "Social links",
    socialHelp: "Collected on the create page",
    website: "Website",
    walletCapTitle: "Wallet buy limit",
    enableWalletCap: "Enable limit",
    walletCapSteps: "Limit steps",
    tokensPerWallet: "tokens / wallet",
    manualWalletCap: "Manual limit 1-100 tokens",
    tokenUnit: "tokens",
    noWalletCap: "No limit",
    devBuyModalTitle: "Choose your first-buy amount",
    devBuyModalCopy: "A dev first buy is required when creating a token. Creation and buy happen in the same on-chain transaction to prevent second-transaction sniping.",
    devBuySwitchLabel: "Buy with BNB",
    confirmDevBuy: "Confirm Buy!",
    devBuyReceiveText: "You will receive about {amount} {symbol}",
    devBuyThresholdWarning: "Heads up: this amount reaches or exceeds the launch threshold {threshold}; confirming may fill the pool and trigger launch.",
    devBuyCreatingStatus: "Creating...",
    previousPage: "Previous",
    nextPage: "Next",
    launchThresholdTitle: "Launch threshold",
    projectTax: "Project tax",
    enableTax: "Enable tax",
    taxNote: "When off, the project charges no mechanism tax. When enabled, you can set 1%-10%; marketing receives BNB, holders with at least 1 token receive BNB rewards automatically, and LP flow returns to the project pool.",
    marketingWallet: "Marketing wallet",
    marketingWalletHelp: "Only needed when tax is enabled. Leave blank to use the connected wallet.",
    marketingWalletBnb: "Marketing wallet (receives BNB)",
    marketingWalletPlaceholder: "Marketing wallet address 0x...",
    taxRate: "Tax rate",
    manualTaxRate: "Manual tax rate 1-10%",
    taxAllocation: "Tax allocation",
    taxTotalLabel: "Total: ",
    taxRemainLabel: "Unallocated: ",
    taxFull: "Allocation is full at 100%.",
    taxInvalid: "Current allocation is {total}%; it must equal exactly 100%.",
    taxMarketingRow: "Marketing wallet (marketing, donations, BNB)",
    taxBurnRow: "Burn (reduce supply)",
    taxRewardRow: "Holder rewards (>= 1 token auto BNB)",
    taxLpRow: "Return to LP (BNB auto into project pool)",
    summarySupply: "Total supply",
    summaryWalletCap: "Wallet limit",
    summaryLaunchPool: "Launch pool",
    summaryLpDestination: "LP destination",
    createParams: "Create parameters",
    copy: "Copy",
    copied: "Copied",
    createInitialStatus: "This will connect your wallet, call the launchpad contract, and submit the create transaction.",
    submitPending: "Submitting...",
    createConnectStatus: "Connecting wallet and checking BSC network...",
    createReadVanityStatus: "Reading launchpad contract rules...",
    createGenerateAddressStatus: "Generating token contract address...",
    launchpadOutdatedError: "The launchpad contract in config.js is not the latest version and does not support automatic 0000-suffix token address generation. Deploy the current launchpad contract and update config.js launchpadAddress.",
    createVerifyAddressStatus: "Candidate address found: {address}. Verifying token contract address on-chain...",
    createConfirmTxStatus: "On-chain predicted address confirmed: {address}. Opening wallet confirmation...",
    createSubmittedStatus: "Transaction submitted: {hash}. Waiting for confirmation...",
    createSaveAvatarStatus: "Created: Project #{id}. Saving project avatar...",
    createVerifySourceStatus: "Created: Project #{id}, token {token}. Auto-verifying source...",
    createVerifiedStatus: "Created: Project #{id}, token {token}. {message}",
    createConfirmedNoEventStatus: "Transaction confirmed: {hash}. ProjectCreated event was not parsed; check BscScan for details.",
    createFailedStatus: "Create transaction failed. Please check wallet prompts and parameters.",
    createPreviewUpdated: "Preview updated. If everything looks good, click Create Token.",
    walletReadyStatus: "Wallet connected. You can create a token.",
    walletConnectFailed: "Wallet connection failed.",
    networkSwitchFailed: "BSC network switch failed.",
    avatarTypeError: "Avatar must be PNG, JPG, or WebP.",
    avatarSizeError: "Avatar must be under 2MB. Please compress it and upload again.",
    treasuryEyebrow: "Treasury",
    treasuryTitle: "Project treasury flow",
    treasuryInternalKicker: "Internal trading",
    treasuryInternalTitle: "Limited buys",
    treasuryInternalCopy: "During the internal phase, each wallet can buy 1-100 tokens. After the target pool is reached, the project launches to Pancake Swap.",
    treasuryTaxKicker: "Project tax",
    treasuryTaxTitle: "Four-way allocation",
    treasuryTaxCopy: "Marketing receives BNB; holders with at least 1 token receive rewards automatically; LP flow returns to the project pool; burn reduces supply.",
    treasuryLaunchKicker: "External launch",
    treasuryLaunchTitle: "LP test custody",
    treasuryLaunchCopy: "For testing, projects can launch Pancake liquidity with a manual 0.05-8 BNB threshold, and LP tokens are sent to the platform wallet.",
    profileEyebrow: "Profile",
    profileTitle: "Profile",
    profileWalletLabel: "Wallet",
    profileCreatedLabel: "Created",
    profileTradedLabel: "Traded tokens",
    profileHoldingLabel: "Holdings",
    profileCreatedTitle: "Created tokens",
    profileTradedTitle: "Traded tokens",
    profileHoldingTitle: "Holdings",
    profileCreatedConnectEmpty: "Connect your wallet to see tokens you created.",
    profileTradedConnectEmpty: "Connect your wallet to see tokens you traded.",
    profileHoldingConnectEmpty: "Connect your wallet to see your holdings.",
    profileCreatedEmpty: "No created tokens yet.",
    profileTradedEmpty: "No real trade records yet.",
    profileHoldingEmpty: "No holdings found.",
    drawerMarket: "Launchpad",
    drawerCreate: "Create Token",
    drawerTreasury: "Ranking",
    rankMarketCap: "Market cap ranking",
    rankVolume24h: "24h volume",
    rankRefresh: "Refresh chain data",
    rankLoading: "Reading on-chain market caps...",
    rankEmpty: "No launched Pancake V2 projects yet.",
    rankMarketCapLabel: "Market cap",
    rankVolumeLabel: "24h volume",
    drawerProfile: "Profile",
    faqTitle: "FAQ",
    faqInternalQuestion: "What is an internal launch?",
    faqInternalAnswer: "A project first trades inside roo with wallet limits and pool growth, then launches to Pancake Swap after reaching its BNB threshold.",
    faqLaunchedQuestion: "What is a launched project?",
    faqLaunchedAnswer: "Launched means the launchpad contract records that the project migrated to Pancake Swap; during testing, external LP goes to the platform wallet.",
    faqStorageQuestion: "Where are avatars and chart data stored?",
    faqStorageAnswer: "Avatars are stored in Vercel Blob. Projects, trades, and candle source records are stored in Neon/Postgres.",
    faqAuditQuestion: "What is an audited token?",
    faqAuditAnswer: "An audited token usually means the contract code was reviewed by a third party. roo display is not an audit endorsement, so users still need to judge risk.",
    creatorLabel: "Creator",
    marketCapLabel: "Market cap",
    walletCapLabel: "Limit",
    holdersLabel: "Holders",
    poolLabel: "Pool",
    statusListed: "Listed",
    statusInternal: "Internal",
    loadingProjects: "Loading microsales...",
    emptyProjects: "No real projects yet. Create one or refresh to sync chain history.",
    contractLabel: "Contract",
    creatorLabelFull: "Creator",
    copyButton: "Copy",
    copiedButton: "Copied",
    tradeListedDescription: "This project is listed on Pancake Swap and can continue trading externally.",
    tradeInternalDescription: "This project is still inside roo. It can launch to Pancake Swap after reaching its threshold.",
    tradeUnsyncedWarning: "This project has not synced an on-chain projectId yet, so trading is temporarily unavailable.",
    tradeVolumeTemplate: "{volume} / {count} trades",
    bondingText: "The bonding curve still has <strong>{remaining} {symbol}</strong> available; current pool <strong>{raised}</strong>."
  }
};

function t(key) {
  return (translations[state.language] && translations[state.language][key])
    || translations.zh[key]
    || key;
}

function getRankingProvider() {
  if (!window.ethers) {
    return null;
  }
  return window.ethereum
    ? new ethers.BrowserProvider(window.ethereum)
    : new ethers.JsonRpcProvider(config.rpcUrl || "https://bsc-dataseed.binance.org");
}

async function readPancakeMarketData(project, provider, bnbUsd = BNB_USD_FALLBACK) {
  if (!project || !project.listed || !ethers.isAddress(project.contract || "")) {
    return null;
  }
  const factory = new ethers.Contract(PANCAKE_V2_FACTORY, PANCAKE_FACTORY_ABI, provider);
  const pairAddress = await factory.getPair(project.contract, WBNB_ADDRESS);
  if (!hasConfiguredAddress(pairAddress)) {
    return null;
  }

  const pair = new ethers.Contract(pairAddress, PANCAKE_PAIR_ABI, provider);
  const [token0, reserves] = await Promise.all([pair.token0(), pair.getReserves()]);
  const wbnbIsToken0 = isSameAddress(token0, WBNB_ADDRESS);
  const reserveBnbRaw = wbnbIsToken0 ? reserves.reserve0 : reserves.reserve1;
  const reserveTokenRaw = wbnbIsToken0 ? reserves.reserve1 : reserves.reserve0;
  const reserveBnb = Number(ethers.formatEther(reserveBnbRaw));
  const reserveToken = Number(ethers.formatEther(reserveTokenRaw));
  if (!Number.isFinite(reserveBnb) || !Number.isFinite(reserveToken) || reserveBnb <= 0 || reserveToken <= 0) {
    return null;
  }

  const priceBnb = reserveBnb / reserveToken;
  const totalSupply = Number(project.totalSupply || TOTAL_TOKEN_SUPPLY);
  const marketCap = priceBnb * totalSupply * bnbUsd;
  const liquidityUsd = reserveBnb * 2 * bnbUsd;
  return {
    ...project,
    pairAddress,
    priceBnb,
    marketCap,
    liquidityUsd,
    volume24h: Number(project.volume24h || 0)
  };
}

async function readBnbUsdPrice(provider) {
  try {
    const factory = new ethers.Contract(PANCAKE_V2_FACTORY, PANCAKE_FACTORY_ABI, provider);
    const pairAddress = await factory.getPair(WBNB_ADDRESS, USDT_ADDRESS);
    if (!hasConfiguredAddress(pairAddress)) {
      return BNB_USD_FALLBACK;
    }
    const pair = new ethers.Contract(pairAddress, PANCAKE_PAIR_ABI, provider);
    const [token0, reserves] = await Promise.all([pair.token0(), pair.getReserves()]);
    const wbnbIsToken0 = isSameAddress(token0, WBNB_ADDRESS);
    const reserveBnb = Number(ethers.formatEther(wbnbIsToken0 ? reserves.reserve0 : reserves.reserve1));
    const reserveUsdt = Number(ethers.formatEther(wbnbIsToken0 ? reserves.reserve1 : reserves.reserve0));
    return reserveBnb > 0 && reserveUsdt > 0 ? reserveUsdt / reserveBnb : BNB_USD_FALLBACK;
  } catch {
    return BNB_USD_FALLBACK;
  }
}

function renderRanking() {
  renderLeaderboardPanel();
  const list = $("#leaderboardList");
  if (!list) {
    return;
  }
  if (state.rankingLoading) {
    list.innerHTML = `<div class="leaderboard-empty">${t("rankLoading")}</div>`;
    return;
  }
  const sortKey = state.rankingMode === "volume24h" ? "volume24h" : "marketCap";
  const items = state.rankingItems
    .slice()
    .sort((a, b) => Number(b[sortKey] || 0) - Number(a[sortKey] || 0))
    .slice(0, 20);
  if (!items.length) {
    list.innerHTML = `<div class="leaderboard-empty">${t("rankEmpty")}</div>`;
    return;
  }
  list.innerHTML = items.map((project, index) => {
    const rank = index + 1;
    const displayValue = sortKey === "volume24h"
      ? formatUsd(project.volume24h || 0, 2)
      : formatUsd(project.marketCap || 0, 2);
    const rankClass = rank <= 3 ? `rank-top rank-${rank}` : "";
    return `
      <button class="leaderboard-row ${rankClass}" type="button" data-rank-token="${escapeAttr(project.contract || "")}">
        <span class="rank-index">${rank <= 3 ? rank : String(rank).padStart(2, "0")}</span>
        <span class="rank-avatar">${getProjectAvatarMarkup(project)}</span>
        <span class="rank-token">
          <strong>${escapeAttr(project.symbol || project.name || "--")}</strong>
          <em>${escapeAttr(project.name || project.symbol || "--")}</em>
        </span>
        <span class="rank-value">
          <strong>${displayValue}</strong>
          <em>${sortKey === "volume24h" ? t("rankVolumeLabel") : t("rankMarketCapLabel")}</em>
        </span>
      </button>
    `;
  }).join("");
}

async function loadRanking(force = false) {
  renderLeaderboardPanel();
  if (state.rankingLoading) {
    return;
  }
  if (!force && state.rankingItems.length) {
    renderRanking();
    return;
  }
  state.rankingLoading = true;
  renderRanking();
  try {
    if (!projects.length) {
      await loadBackendProjects();
    }
    await syncChainProjects();
    const provider = getRankingProvider();
    if (!provider) {
      throw new Error("No ethers provider");
    }
    const bnbUsd = await readBnbUsdPrice(provider);
    const launchedProjects = projects
      .filter((project) => (project.listed || project.stage === "launched") && ethers.isAddress(project.contract || ""))
      .slice(0, 120);
    const results = [];
    for (const project of launchedProjects) {
      try {
        const item = await readPancakeMarketData(project, provider, bnbUsd);
        if (item) {
          results.push(item);
          const index = projects.findIndex((candidate) => normalizeAddress(candidate.contract) === normalizeAddress(project.contract));
          if (index >= 0) {
            projects[index] = { ...projects[index], ...item };
          }
        }
      } catch {
        // Ignore pairs that cannot be read.
      }
    }
    state.rankingItems = results
      .sort((a, b) => Number(b.marketCap || 0) - Number(a.marketCap || 0))
      .slice(0, 20);
    renderProjects();
  } finally {
    state.rankingLoading = false;
    renderRanking();
  }
}

async function refreshProfile() {
  const wallet = normalizeAddress(state.wallet);
  $("#profileWallet").textContent = wallet ? shortAddress(state.wallet) : t("walletNotConnected");
  if (!wallet) {
    $("#profileCreatedCount").textContent = "0";
    $("#profileTradedCount").textContent = "0";
    $("#profileHoldingCount").textContent = "0";
    renderProfileList("#createdTokenList", [], t("profileCreatedConnectEmpty"));
    renderProfileList("#tradedTokenList", [], t("profileTradedConnectEmpty"));
    renderProfileList("#holdingTokenList", [], t("profileHoldingConnectEmpty"));
    return;
  }

  const created = projects.filter((project) => normalizeAddress(project.creator) === wallet);
  const tradedMap = new Map();
  for (const project of projects.slice(0, 80)) {
    if (project.projectId === undefined || project.projectId === null) {
      continue;
    }
    try {
      const data = await apiGet(`/api/trades?projectId=${encodeURIComponent(project.projectId)}&token=${encodeURIComponent(project.contract || "")}`);
      if ((data.trades || []).some((trade) => normalizeAddress(trade.account) === wallet)) {
        tradedMap.set(project.symbol, project);
      }
    } catch {
      // Profile should stay usable even if one trade list fails.
    }
  }

  const holdings = [];
  if (window.ethers && window.ethereum) {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      for (const project of projects.slice(0, 80)) {
        if (!ethers.isAddress(project.contract || "")) {
          continue;
        }
        try {
          const token = new ethers.Contract(project.contract, ERC20_ABI, provider);
          const balance = await token.balanceOf(state.wallet);
          if (balance > 0n) {
            holdings.push(project);
          }
        } catch {
          // Ignore tokens that cannot be read.
        }
      }
    } catch {
      // Wallet/provider unavailable.
    }
  }

  const traded = Array.from(tradedMap.values());
  $("#profileCreatedCount").textContent = String(created.length);
  $("#profileTradedCount").textContent = String(traded.length);
  $("#profileHoldingCount").textContent = String(holdings.length);
  renderProfileList("#createdTokenList", created, t("profileCreatedEmpty"));
  renderProfileList("#tradedTokenList", traded, t("profileTradedEmpty"));
  renderProfileList("#holdingTokenList", holdings, t("profileHoldingEmpty"));
}

function openMenu() {
  if (window.matchMedia("(min-width: 761px)").matches) {
    $(".app-shell").classList.toggle("sidebar-expanded");
    $(".app-shell").classList.toggle("sidebar-collapsed", !$(".app-shell").classList.contains("sidebar-expanded"));
    return;
  }
  $("#sideDrawer").hidden = false;
  document.body.classList.add("drawer-open");
}

function closeMenu() {
  $("#sideDrawer").hidden = true;
  document.body.classList.remove("drawer-open");
}

function refreshOpenModalTranslations() {
  if ($("#devBuyModal") && !$("#devBuyModal").hidden) {
    updateDevBuyModalQuote();
  }
  if ($("#tradeModal") && !$("#tradeModal").hidden && state.selectedProject) {
    const project = state.selectedProject;
    const contractAddress = project.contract || project.creator || ZERO_ADDRESS;
    $("#tradeContract").textContent = `${t("contractLabel")} ${shortAddress(contractAddress)}`;
    $("#copyTradeContract").textContent = t("copyButton");
    $("#tradeCreator").textContent = `${t("creatorLabelFull")} ${project.creator}`;
    $("#infoDescription").textContent = project.listed
      ? t("tradeListedDescription")
      : t("tradeInternalDescription");
  }
}

function setLanguage(lang) {
  state.language = lang || "zh";
  $$(".language-toggle button").forEach((button) => {
    button.classList.toggle("active", button.dataset.lang === state.language);
  });
  document.documentElement.lang = state.language === "zh" ? "zh-CN" : "en";
  $$("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  $$("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
  if (!state.wallet) {
    $("#connectButton").textContent = t("connectWallet");
    $("#profileConnectButton").textContent = t("connectWallet");
    $("#profileWallet").textContent = t("walletNotConnected");
  }
  if (!state.avatarFileName) {
    $("#avatarFileName").textContent = t("noImageSelected");
  }
  updateTaxState();
  updateCreateState();
  refreshOpenModalTranslations();
  if ($("#projectList")) {
    renderProjects();
  }
  if ($("#profilePanel").classList.contains("active")) {
    refreshProfile();
  }
}

function normalizeChartCandles(rawCandles = [], fallbackPrice = 0) {
  const sorted = (rawCandles || [])
    .map((candle) => ({
      time: Number(candle.time || candle.timestamp || Date.now()),
      open: Number(candle.open || 0),
      high: Number(candle.high || 0),
      low: Number(candle.low || 0),
      close: Number(candle.close || 0),
      volume: Number(candle.volume || 0),
      side: String(candle.side || candle.lastSide || "").toLowerCase()
    }))
    .filter((candle) => candle.close > 0)
    .sort((a, b) => a.time - b.time);

  if (!sorted.length && fallbackPrice > 0) {
    return [{
      time: Date.now(),
      open: fallbackPrice,
      high: fallbackPrice,
      low: fallbackPrice,
      close: fallbackPrice,
      volume: 0
    }];
  }

  return sorted.map((candle, index) => {
    const previous = sorted[index - 1];
    const open = candle.open || previous?.close || candle.close;
    return {
      ...candle,
      open,
      high: Math.max(candle.high || candle.close, open, candle.close),
      low: Math.min(candle.low || candle.close, open, candle.close)
    };
  });
}

function formatChartPrice(value) {
  return Number(value || 0).toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
}

function toChartTimestamp(time) {
  const value = Number(time || Date.now());
  return Math.floor((value > 1_000_000_000_000 ? value : value * 1000) / 1000);
}

function compactSparseChartTimes(candles) {
  if (candles.length > 12) {
    return candles;
  }
  const lastTime = candles[candles.length - 1]?.time || Date.now();
  return candles.map((candle, index) => ({
    ...candle,
    time: lastTime - (candles.length - 1 - index) * 60_000
  }));
}

function ensureTradeChart(container) {
  if (!window.LightweightCharts || !container) {
    return null;
  }
  const { createChart, CandlestickSeries, HistogramSeries, LineSeries, CrosshairMode } = window.LightweightCharts;
  if (tradeChartApi && tradeCandleSeries && tradeVolumeSeries && tradeLineSeries) {
    return { chart: tradeChartApi, candleSeries: tradeCandleSeries, volumeSeries: tradeVolumeSeries, lineSeries: tradeLineSeries };
  }

  tradeChartApi = createChart(container, {
    width: container.clientWidth || 900,
    height: container.clientHeight || 360,
    autoSize: true,
    layout: {
      background: { color: "#171717" },
      textColor: "rgba(255, 255, 255, 0.72)",
      fontFamily: "'Segoe UI', sans-serif",
      fontSize: 12
    },
    grid: {
      vertLines: { color: "rgba(255, 255, 255, 0.07)" },
      horzLines: { color: "rgba(255, 255, 255, 0.07)" }
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: { color: "rgba(255,255,255,0.55)", style: 2 },
      horzLine: { color: "rgba(255,255,255,0.55)", style: 2 }
    },
    rightPriceScale: {
      borderColor: "rgba(255, 255, 255, 0.12)",
      scaleMargins: { top: 0.1, bottom: 0.22 }
    },
    timeScale: {
      borderColor: "rgba(255, 255, 255, 0.12)",
      timeVisible: true,
      secondsVisible: false,
      rightOffset: 6,
      barSpacing: 18,
      minBarSpacing: 6
    },
    localization: {
      priceFormatter: formatChartPrice
    },
    handleScroll: true,
    handleScale: true
  });

  tradeCandleSeries = tradeChartApi.addSeries(CandlestickSeries, {
    upColor: "#37ff14",
    downColor: "#ff3b30",
    borderUpColor: "#37ff14",
    borderDownColor: "#ff3b30",
    wickUpColor: "#37ff14",
    wickDownColor: "#ff3b30",
    priceFormat: {
      type: "price",
      precision: 10,
      minMove: 0.0000000001
    }
  });
  tradeVolumeSeries = tradeChartApi.addSeries(HistogramSeries, {
    priceFormat: { type: "volume" },
    priceScaleId: "volume",
    lastValueVisible: false,
    priceLineVisible: false
  });
  tradeVolumeSeries.priceScale().applyOptions({
    scaleMargins: { top: 0.82, bottom: 0 },
    borderVisible: false
  });
  tradeLineSeries = tradeChartApi.addSeries(LineSeries, {
    color: "rgba(0, 240, 255, 0.78)",
    lineWidth: 2,
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    priceFormat: {
      type: "price",
      precision: 10,
      minMove: 0.0000000001
    }
  });

  if (window.ResizeObserver) {
    tradeChartResizeObserver = new ResizeObserver(() => {
      if (container.clientWidth && container.clientHeight) {
        tradeChartApi.resize(container.clientWidth, container.clientHeight);
      }
    });
    tradeChartResizeObserver.observe(container);
  }

  return { chart: tradeChartApi, candleSeries: tradeCandleSeries, volumeSeries: tradeVolumeSeries, lineSeries: tradeLineSeries };
}

function drawTradeChart(project = {}, backendCandles = null) {
  const container = $("#tradeChart");
  const fallbackPrice = Number(project.priceBnb || 0);
  const candles = normalizeChartCandles(backendCandles || [], fallbackPrice);
  const displayPrice = Number((candles.length ? candles[candles.length - 1].close : fallbackPrice) || 0);
  const chart = ensureTradeChart(container);
  const priceTag = $("#chartPriceTag");

  if (!chart || !candles.length) {
    container.innerHTML = `<div class="chart-empty">暂无真实成交 K 线</div>`;
    priceTag.textContent = displayPrice > 0 ? formatChartPrice(displayPrice) : "--";
    priceTag.style.top = "50%";
    return;
  }

  const visibleCandles = compactSparseChartTimes(candles);
  const data = visibleCandles.map((candle) => {
    const isSell = candle.side === "sell" || (candle.side !== "buy" && candle.close < candle.open);
    const color = isSell ? "#ff3b30" : "#37ff14";
    return {
      time: toChartTimestamp(candle.time),
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
      color,
      borderColor: color,
      wickColor: color
    };
  });
  const volumeData = visibleCandles.map((candle) => ({
    time: toChartTimestamp(candle.time),
    value: Number(candle.volume || 0),
    color: (candle.side === "sell" || (candle.side !== "buy" && candle.close < candle.open))
      ? "rgba(255, 59, 48, 0.38)"
      : "rgba(55, 255, 20, 0.34)"
  }));
  const lineData = visibleCandles.map((candle) => ({
    time: toChartTimestamp(candle.time),
    value: Number(candle.close)
  }));
  const last = candles[candles.length - 1].close;
  const lastCandle = candles[candles.length - 1];
  const trendColor = lastCandle.side === "sell" || (lastCandle.side !== "buy" && lastCandle.close < lastCandle.open) ? "#ff3b30" : "#37ff14";

  chart.candleSeries.setData(data);
  chart.lineSeries.setData(lineData);
  chart.volumeSeries.setData(volumeData);
  chart.chart.timeScale().applyOptions({
    rightOffset: candles.length <= 12 ? 10 : 6,
    barSpacing: candles.length <= 12 ? 28 : 18
  });
  chart.chart.timeScale().fitContent();

  const coordinate = chart.candleSeries.priceToCoordinate(last);
  priceTag.textContent = formatChartPrice(displayPrice || last);
  priceTag.style.top = coordinate === null ? "50%" : `${Math.max(44, Math.min((container.clientHeight || 360) - 24, coordinate - 10))}px`;
  priceTag.style.background = trendColor;
  priceTag.style.color = "#111";
}

function renderTradeTable(project, backendTrades = null) {
  if (backendTrades && backendTrades.length) {
    const rows = backendTrades.slice(0, 12).map((trade) => `
      <div class="trade-row ${trade.side === "buy" ? "buy" : "sell"}">
        <span>${shortAddress(trade.account || trade.txHash || "0x0000000000")}</span>
        <strong>${Number(trade.usdAmount || 0).toFixed(3)}</strong>
        <strong>${Number(trade.bnbAmount || 0).toFixed(6)}</strong>
        <strong>${Number(trade.tokenAmount || 0).toFixed(6)}</strong>
        <span>${new Date(Number(trade.timestamp || Date.now())).toLocaleTimeString()}</span>
        <button type="button">↗</button>
      </div>
    `).join("");
    $("#tradeTable").innerHTML = `
      <div class="trade-row trade-row-head">
        <span>账户</span><span>USD</span><span>BNB</span><span>${project.symbol}</span><span>日期</span><span>TXN</span>
      </div>
      ${rows}
    `;
    return;
  }

  $("#tradeTable").innerHTML = `
    <div class="trade-row trade-row-head">
      <span>账户</span><span>USD</span><span>BNB</span><span>${project.symbol}</span><span>日期</span><span>TXN</span>
    </div>
    <div class="empty-market">暂无真实成交记录</div>
  `;
}

function buildCandlesFromTrades(trades, bucketMs = 60_000) {
  const buckets = new Map();
  [...trades].reverse().forEach((trade) => {
    const price = Number(trade.priceBnb || 0);
    if (!price) {
      return;
    }
    const time = Number(trade.timestamp || Date.now());
    const bucket = Math.floor(time / bucketMs) * bucketMs;
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
    candle.volume += Number(trade.bnbAmount || 0);
    buckets.set(bucket, candle);
  });
  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

function chartIntervalToMs(interval) {
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

async function estimateSwapReceive() {
  const project = state.selectedProject;
  if (!project) {
    return;
  }
  if (
    project.projectId === undefined
    || project.projectId === null
    || !window.ethers
    || !ethers.isAddress(project.contract || "")
  ) {
    $("#swapReceive").textContent = "这个项目还没有同步到链上 projectId，暂时不能交易。";
    return;
  }
  const swapAmountText = normalizeDecimalInput($("#swapAmount").value);
  const buyTokenAmountText = normalizeDecimalInput($("#buyTokenAmount").value);
  const amount = state.swapSide === "buy" && state.buyInputMode === "token"
    ? Math.max(0, Number(buyTokenAmountText || 0))
    : Math.max(0, Number(swapAmountText || 0));
  try {
    if (window.ethers && (swapAmountText || buyTokenAmountText)) {
      const provider = window.ethereum
        ? new ethers.BrowserProvider(window.ethereum)
        : new ethers.JsonRpcProvider(config.rpcUrl || "https://bsc-dataseed.binance.org");
      const tradeProject = await ensureProjectLaunchpad(project, provider);
      const launchpad = getLaunchpadContract(provider, getProjectLaunchpadAddress(tradeProject));
      if (state.swapSide === "buy") {
        const capMaxTokenAmount = ethers.parseEther(String(isWalletCapEnabled(tradeProject) ? tradeProject.cap : INTERNAL_SALE_SUPPLY));
        const maxTokenAmount = await getBuySearchUpperBound(tradeProject, provider, capMaxTokenAmount);
        if (state.buyInputMode === "token") {
          const parsedTokenInput = parsePositiveEtherInput(buyTokenAmountText);
          if (!parsedTokenInput) {
            return;
          }
          let tokenAmount = parsedTokenInput.wei;
          if (tokenAmount > maxTokenAmount) {
            tokenAmount = maxTokenAmount;
            $("#buyTokenAmount").value = Number(ethers.formatEther(tokenAmount)).toFixed(6);
          }
          const cost = await launchpad.quoteBuy(BigInt(tradeProject.projectId), tokenAmount);
          $("#swapAmount").value = Number(ethers.formatEther(cost)).toFixed(6);
          $("#swapReceive").textContent = `预计支付: ${Number(ethers.formatEther(cost)).toFixed(6)} BNB`;
          return;
        }
        const parsedBnbInput = parsePositiveEtherInput(swapAmountText);
        if (!parsedBnbInput) {
          return;
        }
        const bnbAmount = parsedBnbInput.wei;
        const estimated = await estimateTokenAmountForBnb(launchpad, BigInt(tradeProject.projectId), bnbAmount, maxTokenAmount);
        if (estimated > 0n) {
          $("#buyTokenAmount").value = Number(ethers.formatEther(estimated)).toFixed(6);
          $("#swapReceive").textContent = `您将收到: ${Number(ethers.formatEther(estimated)).toFixed(6)} ${project.symbol}`;
          return;
        }
      } else {
        const parsedSellInput = parsePositiveEtherInput(swapAmountText);
        if (!parsedSellInput) {
          return;
        }
        const tokenAmount = parsedSellInput.wei;
        const estimatedBnb = await launchpad.quoteSell(BigInt(tradeProject.projectId), tokenAmount);
        $("#swapReceive").textContent = `您将收到: ${Number(ethers.formatEther(estimatedBnb)).toFixed(6)} BNB`;
        return;
      }
    }
  } catch {
    // Fall back to the local estimate below if the RPC read fails.
  }
  if (state.swapSide === "buy") {
    const price = Number(project.priceBnb || 0);
    if (state.buyInputMode === "token") {
      const estimatedCost = price > 0 ? amount * price : 0;
      $("#swapAmount").value = estimatedCost > 0 ? estimatedCost.toFixed(6) : "";
      $("#swapReceive").textContent = `预计支付: ${estimatedCost.toFixed(6)} BNB`;
      return;
    }
    const estimated = price > 0 ? amount / price : 0;
    $("#buyTokenAmount").value = estimated > 0 ? estimated.toFixed(6) : "";
    $("#swapReceive").textContent = `您将收到: ${estimated.toFixed(6)} ${project.symbol}`;
    return;
  }
  const estimatedBnb = amount * Number(project.priceBnb || 0);
  $("#swapReceive").textContent = `您将收到: ${estimatedBnb.toFixed(6)} BNB`;
}

async function updateBuyCapQuote(project = state.selectedProject) {
  const element = $("#buyCapQuote");
  if (!element) {
    return;
  }
  if (!project || state.swapSide !== "buy") {
    element.hidden = true;
    return;
  }
  element.hidden = false;
  if (!isWalletCapEnabled(project)) {
    element.textContent = "不限购";
    return;
  }
  const capTokens = Math.max(1, Number(project.cap));
  element.textContent = `${capTokens} 枚预计需要 -- BNB`;
  try {
    if (
      project.projectId === undefined
      || project.projectId === null
      || !window.ethers
      || !ethers.isAddress(project.contract || "")
    ) {
      throw new Error("not tradable");
    }
    const provider = window.ethereum
      ? new ethers.BrowserProvider(window.ethereum)
      : new ethers.JsonRpcProvider(config.rpcUrl || "https://bsc-dataseed.binance.org");
    const tradeProject = await ensureProjectLaunchpad(project, provider);
    const launchpad = getLaunchpadContract(provider, getProjectLaunchpadAddress(tradeProject));
    const cost = await launchpad.quoteBuy(BigInt(tradeProject.projectId), ethers.parseEther(String(capTokens)));
    const formattedCost = Number(ethers.formatEther(cost)).toFixed(6);
    element.textContent = `${capTokens} 枚预计需要 ${formattedCost} BNB`;
    if (state.swapSide === "buy" && state.buyInputMode === "token" && Number($("#buyTokenAmount").value || 0) === capTokens) {
      $("#swapAmount").value = formattedCost;
    }
  } catch {
    const estimated = Number(project.priceBnb || 0) * capTokens;
    element.textContent = `${capTokens} 枚预计需要 ${estimated > 0 ? estimated.toFixed(6) : "--"} BNB`;
  }
}

async function refreshSelectedTokenBalance() {
  const project = state.selectedProject;
  state.selectedTokenBalance = 0;
  $("#tokenBalanceText").textContent = project ? `余额 0 ${project.symbol}` : "余额 0 代币";
  if (
    !project
    || project.projectId === undefined
    || project.projectId === null
    || !window.ethers
    || !ethers.isAddress(project.contract || "")
    || !window.ethereum
    || !state.wallet
  ) {
    return;
  }
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const token = new ethers.Contract(project.contract, ERC20_ABI, provider);
    const balance = await token.balanceOf(state.wallet);
    state.selectedTokenBalance = Number(ethers.formatEther(balance));
    $("#tokenBalanceText").textContent = `余额 ${state.selectedTokenBalance.toFixed(6)} ${project.symbol}`;
  } catch {
    $("#tokenBalanceText").textContent = `余额读取失败`;
  }
}

function addCreatedProject(params, created) {
  const project = {
    name: params.name,
    symbol: params.symbol,
    status: "内盘",
    stage: "new",
    progress: 0,
    cap: params.walletCapEnabled ? Number(params.maxWalletBuyTokens) : 0,
    raised: `0 / ${params.launchThresholdBnb} BNB`,
    holders: 0,
    marketCap: 0,
    creator: state.wallet ? shortAddress(state.wallet) : "当前钱包",
    contract: created.token,
    projectId: created.projectId,
    launchpadAddress: config.launchpadAddress,
    change: 0,
    listed: false,
    avatar: params.symbol.slice(0, 1),
    avatarUrl: params.avatarUrl || params.metadata.avatarUrl || defaultAvatar
  };
  return upsertLocalProject(project);
}

async function autoVerifyCreatedToken(params, created) {
  try {
    const result = await apiPost("/api/verify-token", {
      chainId: config.chainId || 56,
      contractAddress: created.token,
      tokenName: params.name,
      tokenSymbol: params.symbol,
      supply: "10000000000000000000000",
      launchpadAddress: config.launchpadAddress
    });
    if (result.skipped) {
      return "开源待配置：请在后端设置 BSCSCAN_API_KEY。";
    }
    const message = result.data && (result.data.result || result.data.message)
      ? (result.data.result || result.data.message)
      : "已提交开源验证。";
    return `已提交自动开源：${message}`;
  } catch (error) {
    return `自动开源提交失败：${error.message || "请检查后端和 BscScan API Key"}`;
  }
}

function getLaunchpadContract(signerOrProvider, launchpadAddress = config.launchpadAddress) {
  return new ethers.Contract(launchpadAddress, LAUNCHPAD_ABI, signerOrProvider);
}

async function getTradeSigner() {
  if (!window.ethers) {
    throw new Error("ethers 未加载，请刷新页面。");
  }
  if (!hasConfiguredAddress(config.launchpadAddress)) {
    throw new Error("请先在 config.js 填写已部署的 launchpadAddress。");
  }
  await connectWallet();
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return { provider, signer };
}

function requireTradableProject(project) {
  if (!project || project.projectId === undefined || project.projectId === null || !window.ethers || !ethers.isAddress(project.contract || "")) {
    throw new Error("这个项目还没有同步到链上 projectId，暂时不能交易。");
  }
}

function isLaunchReadyProject(project) {
  if (!project || project.listed || project.stage === "launched") {
    return false;
  }
  const remaining = Math.max(0, INTERNAL_SALE_SUPPLY - Number(project.tokensSold || 0));
  return Number(project.progress || 0) >= 100 || remaining <= 0.000001;
}

async function estimateTokenAmountForBnb(launchpad, projectId, maxBnbAmount, maxTokenAmount = ethers.parseEther(String(INTERNAL_SALE_SUPPLY))) {
  if (maxBnbAmount <= 0n) {
    return 0n;
  }
  if (maxTokenAmount <= 0n) {
    return 0n;
  }
  const maxCost = await launchpad.quoteBuy(projectId, maxTokenAmount);
  if (maxCost <= maxBnbAmount) {
    return maxTokenAmount;
  }
  let low = 0n;
  let high = maxTokenAmount;
  for (let i = 0; i < 80 && low < high; i += 1) {
    const mid = (low + high + 1n) / 2n;
    const cost = await launchpad.quoteBuy(projectId, mid);
    if (cost <= maxBnbAmount) {
      low = mid;
    } else {
      high = mid - 1n;
    }
  }
  return low;
}

async function readInternalSaleRemaining(project, signerOrProvider) {
  const launchpadAddress = getProjectLaunchpadAddress(project);
  if (!project || project.projectId === undefined || project.projectId === null || !window.ethers || !hasConfiguredAddress(launchpadAddress)) {
    return ethers.parseEther(String(INTERNAL_SALE_SUPPLY));
  }
  try {
    const launchpad = getLaunchpadContract(signerOrProvider, launchpadAddress);
    const basics = await launchpad.getProjectBasics(BigInt(project.projectId));
    const internalSaleSupply = ethers.parseEther(String(INTERNAL_SALE_SUPPLY));
    const tokensSold = BigInt(basics.tokensSold || 0n);
    return tokensSold >= internalSaleSupply ? 0n : internalSaleSupply - tokensSold;
  } catch {
    const localRemaining = Math.max(0, INTERNAL_SALE_SUPPLY - Number(project.tokensSold || 0));
    return ethers.parseEther(String(localRemaining));
  }
}

async function getBuySearchUpperBound(project, signerOrProvider, preferredMax = ethers.parseEther(String(INTERNAL_SALE_SUPPLY))) {
  const remaining = await readInternalSaleRemaining(project, signerOrProvider);
  return preferredMax < remaining ? preferredMax : remaining;
}

async function findExecutableBuyQuote(launchpad, projectId, desiredTokenAmount, slippageBps) {
  const quote = async (amount) => {
    if (amount <= 0n) {
      return null;
    }
    const cost = await launchpad.quoteBuy(projectId, amount);
    const value = cost + ((cost * slippageBps) / 10000n);
    await launchpad.buy.staticCall(projectId, amount, { value });
    return { tokenAmount: amount, cost, value };
  };

  try {
    return await quote(desiredTokenAmount);
  } catch {
    // The quote can succeed while the real buy fails when burn tax consumes
    // extra launchpad-held tokens. Binary-search the largest executable amount.
  }

  let low = 0n;
  let high = desiredTokenAmount - 1n;
  let best = null;
  while (low <= high) {
    const mid = (low + high) / 2n;
    try {
      const result = await quote(mid);
      best = result;
      low = mid + 1n;
    } catch {
      high = mid - 1n;
    }
  }
  return best;
}

async function handleSwapSubmit() {
  const project = state.selectedProject;
  const button = $("#swapSubmit");
  try {
    requireTradableProject(project);
    const rawAmountText = state.swapSide === "buy" && state.buyInputMode === "token"
      ? normalizeDecimalInput($("#buyTokenAmount").value)
      : normalizeDecimalInput($("#swapAmount").value);
    const parsedAmount = parsePositiveEtherInput(rawAmountText);
    if (!parsedAmount) {
      throw new Error("请输入买入或卖出数量。");
    }

    button.disabled = true;
    button.textContent = state.swapSide === "buy" ? "购买中..." : "卖出中...";
    const { signer } = await getTradeSigner();
    const tradeProject = await ensureProjectLaunchpad(project, signer);
    const tradeLaunchpadAddress = getProjectLaunchpadAddress(tradeProject);
    const launchpad = getLaunchpadContract(signer, tradeLaunchpadAddress);

    if (state.swapSide === "buy") {
      const capMaxTokenAmount = ethers.parseEther(String(isWalletCapEnabled(tradeProject) ? tradeProject.cap : INTERNAL_SALE_SUPPLY));
      const maxTokenAmount = await getBuySearchUpperBound(tradeProject, signer, capMaxTokenAmount);
      const buyProjectId = BigInt(tradeProject.projectId);
      const bnbInputAmount = state.buyInputMode === "bnb" ? parsedAmount.wei : 0n;
      let tokenAmount;
      if (state.buyInputMode === "token") {
        tokenAmount = parsedAmount.wei;
      } else {
        const bnbAmount = parsedAmount.wei;
        tokenAmount = await estimateTokenAmountForBnb(launchpad, buyProjectId, bnbAmount, maxTokenAmount);
        if (tokenAmount <= 0n && maxTokenAmount > 0n) {
          tokenAmount = maxTokenAmount;
        }
      }
      if (tokenAmount === undefined) {
        throw new Error("报价异常，无法计算买入数量。");
      }
      if (tokenAmount <= 0n) {
        throw new Error("BNB 数量太小，无法买到代币。");
      }
      if (tokenAmount > maxTokenAmount) {
        tokenAmount = maxTokenAmount;
      }
      const slippageBps = BigInt(Math.round(Number(state.slippagePercent || 0) * 100));
      const executable = await findExecutableBuyQuote(launchpad, buyProjectId, tokenAmount, slippageBps);
      if (!executable || executable.tokenAmount <= 0n) {
        throw new Error("这个项目内盘已卖完，不能继续买入。");
      }
      if (executable.tokenAmount < tokenAmount) {
        $("#swapReceive").textContent = `剩余可买不足，已调整为 ${Number(ethers.formatEther(executable.tokenAmount)).toFixed(6)} ${project.symbol}`;
      }
      tokenAmount = executable.tokenAmount;
      const cost = executable.cost;
      const buyNotice = [];
      if (state.buyInputMode === "bnb" && bnbInputAmount > cost) {
        buyNotice.push(`输入金额超过当前可成交额度，本次预计只扣除 ${Number(ethers.formatEther(cost)).toFixed(6)} BNB，买入 ${Number(ethers.formatEther(tokenAmount)).toFixed(6)} ${project.symbol}。`);
      }
      if (maxTokenAmount > 0n && tokenAmount >= maxTokenAmount) {
        buyNotice.push("这笔买入会买完当前可买代币，确认后将尝试自动发射到 Pancake Swap。");
      }
      if (buyNotice.length) {
        $("#swapReceive").textContent = buyNotice.join(" ");
      }
      const buyOverrides = { value: executable.value };
      if (maxTokenAmount > 0n && tokenAmount >= maxTokenAmount) {
        buyOverrides.gasLimit = BigInt(config.finalBuyGasLimit || 6_500_000);
      }
      const tx = await launchpad.buy(buyProjectId, tokenAmount, buyOverrides);
      $("#swapReceive").textContent = `购买交易已提交：${tx.hash}`;
      await tx.wait();
      await saveBackendTrade(tradeProject, {
        side: "buy",
        txHash: tx.hash,
        bnbAmount: Number(ethers.formatEther(cost)),
        tokenAmount: Number(ethers.formatEther(tokenAmount))
      });
      $("#swapReceive").textContent = `购买成功：${ethers.formatEther(tokenAmount)} ${project.symbol}`;
      await refreshTradeData(tradeProject);
      return;
    }

    const tokenAmount = parsedAmount.wei;
    if (isLaunchReadyProject(tradeProject)) {
      throw new Error("项目已满池，内盘卖出已关闭。请等待发射到 Pancake Swap 后在外盘卖出。");
    }
    const estimatedBnb = await launchpad.quoteSell(BigInt(tradeProject.projectId), tokenAmount);
    const token = new ethers.Contract(tradeProject.contract, ERC20_ABI, signer);
    const owner = await signer.getAddress();
    const allowance = await token.allowance(owner, tradeLaunchpadAddress);
    if (allowance < tokenAmount) {
      button.textContent = "授权中...";
      const approveTx = await token.approve(tradeLaunchpadAddress, tokenAmount);
      $("#swapReceive").textContent = `授权交易已提交：${approveTx.hash}`;
      await approveTx.wait();
    }
    button.textContent = "卖出中...";
    const tx = await launchpad.sell(BigInt(tradeProject.projectId), tokenAmount);
    $("#swapReceive").textContent = `卖出交易已提交：${tx.hash}`;
    await tx.wait();
    await saveBackendTrade(tradeProject, {
      side: "sell",
      txHash: tx.hash,
      bnbAmount: Number(ethers.formatEther(estimatedBnb)),
      tokenAmount: Number(ethers.formatEther(tokenAmount))
    });
    $("#swapReceive").textContent = `卖出成功，预估返回 ${ethers.formatEther(estimatedBnb)} BNB`;
    await refreshTradeData(tradeProject);
  } catch (error) {
    let message = error && (error.shortMessage || error.reason || error.message)
      ? (error.shortMessage || error.reason || error.message)
      : "交易失败，请检查钱包和参数。";
    if (String(message).includes("LAUNCHPAD: sold out")) {
      message = "这个项目内盘已卖完，不能继续买入。";
    } else if (String(message).includes("LAUNCHPAD: wallet cap")) {
      message = "本钱包已达到该项目限购额度。";
    } else if (String(message).includes("LAUNCHPAD: sell amount")) {
      message = "卖出数量超过当前可卖数量，请减少数量或刷新余额后重试。";
    } else if (String(message).includes("LAUNCHPAD: insufficient BNB")) {
      message = "BNB 数量不足，请稍微提高滑点或减少买入数量。";
    }
    $("#swapReceive").textContent = message;
  } finally {
    button.disabled = false;
    button.textContent = state.swapSide === "buy" ? "购买" : "卖出";
  }
}

async function saveBackendTrade(project, trade) {
  const account = state.wallet || "";
  const priceBnb = trade.tokenAmount ? trade.bnbAmount / trade.tokenAmount : 0;
  const usdAmount = trade.bnbAmount * 600;
  await apiPost("/api/trades", {
    projectId: project.projectId,
    token: project.contract,
    symbol: project.symbol,
    account,
    side: trade.side,
    txHash: trade.txHash,
    bnbAmount: trade.bnbAmount,
    tokenAmount: trade.tokenAmount,
    priceBnb,
    usdAmount,
    timestamp: Date.now()
  });
}

function setSwapSide(side) {
  state.swapSide = side;
  if (side !== "buy") {
    state.buyInputMode = "bnb";
  }
  $$(".swap-tabs button").forEach((button) => {
    button.classList.toggle("active", button.dataset.swapSide === side);
  });
  const project = state.selectedProject;
  $("#swapUnit").textContent = side === "buy" ? "BNB" : (project ? project.symbol : "代币");
  $("#buyTokenInputWrap").hidden = side !== "buy";
  $("#buyTokenUnit").textContent = project ? project.symbol : "代币";
  $(".quick-amounts").hidden = side === "sell";
  $("#sellPercentages").hidden = side !== "sell";
  $("#swapAmount").step = side === "buy" ? "0.01" : "0.000001";
  $("#swapAmount").placeholder = side === "buy" ? "输入 BNB 数量" : `输入 ${project ? project.symbol : "代币"} 数量`;
  $("#swapLimit").textContent = side === "buy"
    ? (project ? `限购：${formatCapDisplay(project)}` : "限购：--")
    : "选择卖出比例或手动输入代币数量";
  const canTrade = project
    && project.projectId !== undefined
    && project.projectId !== null
    && window.ethers
    && ethers.isAddress(project.contract || "")
    && !(side === "sell" && isLaunchReadyProject(project));
  $("#swapSubmit").disabled = !canTrade;
  $("#swapSubmit").textContent = canTrade ? (side === "buy" ? "购买" : "卖出") : "未同步不可交易";
  if (project && side === "sell" && isLaunchReadyProject(project)) {
    $("#swapSubmit").textContent = "请到外盘卖出";
    $("#swapReceive").textContent = "项目已满池，内盘卖出已关闭。";
  }
  $("#swapAmount").value = side === "buy" ? "0.1" : "1";
  if (side === "sell") {
    refreshSelectedTokenBalance();
  }
  updateBuyCapQuote(project);
  estimateSwapReceive();
}

function getTradeSummary(project, trades = []) {
  const volumeBnb = trades.reduce((sum, trade) => sum + Number(trade.bnbAmount || 0), 0);
  const volumeUsd = trades.reduce((sum, trade) => sum + Number(trade.usdAmount || 0), 0);
  const lastTrade = trades[0] || null;
  const priceBnb = lastTrade && Number(lastTrade.priceBnb || 0) > 0
    ? Number(lastTrade.priceBnb)
    : Number(project.priceBnb || 0);
  const marketCap = priceBnb > 0 ? priceBnb * TOTAL_TOKEN_SUPPLY * 600 : Number(project.marketCap || 0);
  return {
    count: trades.length,
    volumeBnb,
    volumeUsd,
    priceBnb,
    marketCap
  };
}

function updateTradeStats(project, trades = []) {
  const summary = getTradeSummary(project, trades);
  const liquidityUsd = Number(project.liquidityUsd || 0) || parseRaisedBnb(project) * 600;
  $("#tradePrice").textContent = summary.priceBnb > 0 ? formatBnb(summary.priceBnb, 8) : "--";
  $("#tradeMarketCap").textContent = formatUsd(summary.marketCap, 2);
  $("#tradeLiquidity").textContent = formatUsd(liquidityUsd, 2);
  $("#tradeVolume").textContent = t("tradeVolumeTemplate")
    .replace("{volume}", formatUsd(summary.volumeUsd, 2))
    .replace("{count}", summary.count);
  $("#tradeCreated").textContent = formatCreatedTime(project);
  const remaining = Math.max(0, INTERNAL_SALE_SUPPLY - Number(project.tokensSold || 0));
  $("#bondingText").innerHTML = t("bondingText")
    .replace("{remaining}", remaining.toLocaleString(undefined, { maximumFractionDigits: 3 }))
    .replace("{symbol}", project.symbol)
    .replace("{raised}", project.raised);
}

function setTradeView(view) {
  state.tradeView = view || "chart";
  const modal = $("#tradeModal");
  modal.dataset.tradeView = state.tradeView;
  $$("[data-trade-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tradeView === state.tradeView);
  });
}

function setChartInterval(interval) {
  state.chartInterval = interval || "1m";
  $$("[data-chart-interval]").forEach((button) => {
    button.classList.toggle("active", button.dataset.chartInterval === state.chartInterval);
  });
  if (state.selectedProject) {
    refreshTradeData(state.selectedProject);
  }
}

function renderHolderList(project, trades = []) {
  const symbol = project.symbol || "";
  const totalSupply = Math.max(0, Number(project.totalSupply || TOTAL_TOKEN_SUPPLY));
  const holders = computeHoldersFromTrades(trades);
  const formatHolderPercent = (value) => {
    if (!Number.isFinite(value) || value <= 0) {
      return "0%";
    }
    return `${value >= 1 ? value.toFixed(2) : value.toFixed(4)}%`;
  };
  const topHolders = holders.slice(0, 10);
  $("#holderCountText").textContent = String(holders.length);
  $("#holderTotalSupply").textContent = `${formatTokenAmount(totalSupply, 3)} ${symbol}`;
  $("#holderList").innerHTML = topHolders.length
    ? topHolders.map((holder) => {
      const percent = totalSupply > 0 ? (holder.amount / totalSupply) * 100 : 0;
      const width = Math.max(0.4, Math.min(100, percent));
      return `
      <div class="holder-row">
        <div class="holder-row-main">
          <span title="${escapeAttr(holder.account)}">${shortAddress(holder.account)}</span>
          <strong>${formatHolderPercent(percent)}</strong>
        </div>
        <div class="holder-progress"><i style="width: ${width}%"></i></div>
        <small>${formatTokenAmount(holder.amount, 6)} ${symbol}</small>
      </div>
    `;
    }).join("")
    : `<span class="holder-empty">暂无持币地址</span>`;
}

async function refreshTradeData(project) {
  if (!project || project.projectId === undefined || project.projectId === null) {
    renderTradeTable(project);
    renderHolderList(project || { symbol: "" }, []);
    drawTradeChart(project);
    return;
  }
  try {
    const interval = state.chartInterval || "1m";
    const [tradesData, candlesData] = await Promise.all([
      apiGet(`/api/trades?projectId=${encodeURIComponent(project.projectId)}&token=${encodeURIComponent(project.contract || "")}`),
      apiGet(`/api/candles?projectId=${encodeURIComponent(project.projectId)}&token=${encodeURIComponent(project.contract || "")}&interval=${encodeURIComponent(interval)}`)
    ]);
    const trades = tradesData.trades || [];
    const candles = (candlesData.candles || []).length ? candlesData.candles : buildCandlesFromTrades(trades, chartIntervalToMs(interval));
    const holderCount = computeHoldersFromTrades(trades).length;
    if (Number(project.holders || 0) !== holderCount) {
      project.holders = holderCount;
      const index = projects.findIndex((item) => normalizeAddress(item.contract) === normalizeAddress(project.contract));
      if (index >= 0) {
        projects[index] = { ...projects[index], holders: holderCount };
        renderProjects();
        apiPost("/api/projects/upsert", projects[index]).catch(() => {});
      }
    }
    renderTradeTable(project, trades);
    renderHolderList(project, trades);
    updateTradeStats(project, trades);
    drawTradeChart(project, candles);
  } catch {
    renderTradeTable(project);
    renderHolderList(project, []);
    drawTradeChart(project);
  }
}

async function refreshOpenTradeProjectFromChain(project) {
  if (!project || !window.ethers || project.projectId === undefined || project.projectId === null) {
    return;
  }
  try {
    const provider = window.ethereum
      ? new ethers.BrowserProvider(window.ethereum)
      : new ethers.JsonRpcProvider(config.rpcUrl || "https://bsc-dataseed.binance.org");
    const freshProject = await refreshProjectFromChain(project, provider);
    if (
      !freshProject
      || $("#tradeModal").hidden
      || normalizeAddress(freshProject.contract || "") !== normalizeAddress(state.selectedProject && state.selectedProject.contract || "")
    ) {
      return;
    }
    state.selectedProject = freshProject;
    $("#tradeCreator").textContent = `${t("creatorLabelFull")} ${freshProject.creator}`;
    $("#tradeChange").textContent = `+${freshProject.change}%`;
    const displayProgress = getDisplayProgress(freshProject);
    $("#bondingValue").textContent = `${displayProgress}%`;
    $("#bondingBar").style.width = `${displayProgress}%`;
    $("#infoDescription").textContent = freshProject.listed
      ? t("tradeListedDescription")
      : t("tradeInternalDescription");
    updateTradeStats(freshProject, []);
    updateBuyCapQuote(freshProject);
    estimateSwapReceive();
    refreshTradeData(freshProject);
  } catch {
    // Keep the cached project visible if the RPC read fails.
  }
}

function openTradeModal(project) {
  state.selectedProject = project;
  state.buyInputMode = "token";
  setTradeView(window.matchMedia("(max-width: 840px)").matches ? "swap" : "chart");
  const avatarMarkup = project.avatarUrl
    ? `<img src="${project.avatarUrl}" alt="">`
    : project.avatar;
  $("#tradeAvatar").innerHTML = avatarMarkup;
  $("#infoAvatar").innerHTML = avatarMarkup;
  $("#tradePair").textContent = `${project.symbol} / BNB`;
  const contractAddress = project.contract || project.creator || ZERO_ADDRESS;
  $("#tradeContract").textContent = `${t("contractLabel")} ${shortAddress(contractAddress)}`;
  $("#tradeContract").dataset.address = contractAddress;
  $("#copyTradeContract").dataset.address = contractAddress;
  $("#copyTradeContract").textContent = t("copyButton");
  $("#tradeCreator").textContent = `${t("creatorLabelFull")} ${project.creator}`;
  $("#tradeChange").textContent = `+${project.change}%`;
  updateTradeStats(project, []);
  const displayProgress = getDisplayProgress(project);
  $("#bondingValue").textContent = `${displayProgress}%`;
  $("#bondingBar").style.width = `${displayProgress}%`;
  $("#infoName").textContent = project.name;
  $("#infoSymbol").textContent = project.symbol;
  $("#infoDescription").textContent = project.listed
    ? t("tradeListedDescription")
    : t("tradeInternalDescription");
  if (project.projectId === undefined || project.projectId === null) {
    $("#swapReceive").textContent = t("tradeUnsyncedWarning");
  }
  refreshTradeData(project);
  setSwapSide("buy");
  $("#tradeModal").hidden = false;
  document.body.classList.add("modal-open");
  refreshOpenTradeProjectFromChain(project);
}

function closeTradeModal() {
  $("#tradeModal").hidden = true;
  document.body.classList.remove("modal-open");
}

async function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

async function copyTradeContract(event) {
  const address = event.currentTarget.dataset.address;
  if (!address) {
    return;
  }
  await copyText(address);
  $("#copyTradeContract").textContent = t("copiedButton");
  $("#tradeContract").textContent = `${t("contractLabel")} ${shortAddress(address)} ${t("copiedButton")}`;
  setTimeout(() => {
    $("#copyTradeContract").textContent = t("copyButton");
    $("#tradeContract").textContent = `${t("contractLabel")} ${shortAddress(address)}`;
  }, 1300);
}

function renderStepPills() {
  const steps = [1, 5, 10, 20, 25, 50, 75, 100];
  $("#stepPills").innerHTML = steps.map((step) => (
    `<button class="${step === state.cap ? "active" : ""}" type="button" data-cap-step="${step}">${step}</button>`
  )).join("");
}

function updateTabs(nextTab) {
  $$(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === nextTab);
  });
  $$("[data-rail-tab]").forEach((item) => {
    item.classList.toggle("active", item.dataset.railTab === nextTab);
  });

  const panels = {
    market: "#marketPanel",
    create: "#createPanel",
    treasury: "#treasuryPanel",
    profile: "#profilePanel",
    faq: "#faqPanel"
  };

  Object.entries(panels).forEach(([name, selector]) => {
    $(selector).classList.toggle("active", name === nextTab);
  });
  if (nextTab === "profile") {
    refreshProfile();
  }
  if (nextTab === "treasury") {
    renderLeaderboardPanel();
    loadRanking(false);
  }
}

function updateTaxState() {
  state.taxEnabled = $("#taxEnabled").checked;
  state.projectTaxRate = clampNumber($("#projectTaxRate").value, 1, 10);
  $("#projectTaxRate").value = state.projectTaxRate;
  $("#projectTaxValue").textContent = state.projectTaxRate;
  $("#taxSettings").hidden = !state.taxEnabled;
  $$(".tax-rate-option").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.taxRate) === state.projectTaxRate);
  });

  const ids = {
    wallet: "#walletTax",
    burn: "#burnTax",
    reward: "#rewardTax",
    lp: "#lpTax"
  };

  Object.entries(ids).forEach(([key, selector]) => {
    state.taxes[key] = clampNumber($(selector).value, 0, 100);
    $(`#${key}TaxValue`).textContent = state.taxes[key];
  });

  const total = getTaxTotal();
  const remain = Math.max(0, 100 - total);
  const warning = $("#taxWarning");

  $("#taxTotal").textContent = total;
  $("#taxRemain").textContent = remain;
  $("#donutValue").textContent = `${Math.min(total, 100)}%`;
  warning.classList.toggle("invalid", state.taxEnabled && total !== 100);
  warning.textContent = total === 100
    ? t("taxFull")
    : t("taxInvalid").replace("{total}", total);
  const taxCheck = $("#taxCheck");
  if (taxCheck) {
    taxCheck.checked = !state.taxEnabled || total === 100;
  }

  const walletEnd = state.taxes.wallet;
  const burnEnd = walletEnd + state.taxes.burn;
  const rewardEnd = burnEnd + state.taxes.reward;
  $(".donut").style.background = `conic-gradient(var(--violet) 0 ${walletEnd}%, var(--pink) ${walletEnd}% ${burnEnd}%, var(--green) ${burnEnd}% ${rewardEnd}%, var(--gold) ${rewardEnd}% 100%)`;
}

function getTaxTotal() {
  return Object.values(state.taxes).reduce((sum, value) => sum + value, 0);
}

function updateAvatarPreview(url, fileName) {
  state.avatarUrl = url || "";
  state.avatarFileName = fileName || "";
  $("#avatarPreview").hidden = !state.avatarUrl;
  $("#previewAvatar").hidden = !state.avatarUrl;
  $("#avatarPreview").src = state.avatarUrl || "";
  $("#previewAvatar").src = state.avatarUrl || "";
  $("#avatarFileName").textContent = state.avatarFileName || t("noImageSelected");
}

function updateCreateState() {
  const name = $("#tokenName").value.trim();
  const symbol = $("#tokenSymbol").value.trim().toUpperCase();
  const xLink = $("#xLink").value.trim();
  const telegramLink = $("#telegramLink").value.trim();
  const websiteLink = $("#websiteLink").value.trim();

  state.walletCapEnabled = $("#walletCapEnabled").checked;
  state.cap = clampNumber($("#walletCap").value, 1, 100);
  state.threshold = clampNumber($("#launchThreshold").value, 0.05, 8);
  state.threshold = Number(state.threshold.toFixed(2));

  $("#walletCapSettings").hidden = !state.walletCapEnabled;
  $("#walletCap").value = state.cap;
  $("#walletCapSlider").value = state.cap;
  $("#launchThreshold").value = state.threshold;
  $("#thresholdSlider").value = state.threshold;

  $("#capValue").textContent = state.cap;
  $("#thresholdValue").textContent = state.threshold;
  $("#summaryCap").textContent = state.walletCapEnabled ? `${state.cap} ${t("tokenUnit")}` : t("noWalletCap");
  $("#summaryThreshold").textContent = state.threshold;
  $("#previewName").textContent = name || "未填写项目名称";
  $("#previewSymbol").textContent = `${symbol || "未填写"} / BSC`;
  $("#summaryX").textContent = compactLink(xLink);
  $("#summaryTelegram").textContent = compactLink(telegramLink);
  $("#summaryWebsite").textContent = compactLink(websiteLink);
  const capCheck = $("#capCheck");
  const thresholdCheck = $("#thresholdCheck");
  if (capCheck) {
    capCheck.checked = !state.walletCapEnabled || (state.cap >= 1 && state.cap <= 100);
  }
  if (thresholdCheck) {
    thresholdCheck.checked = state.threshold >= 0.05 && state.threshold <= 8;
  }

  renderStepPills();
  renderParams();
}

function buildMetadata() {
  return {
    avatarFileName: state.avatarFileName || "",
    avatarUrl: state.avatarUrl || "",
    x: $("#xLink").value.trim(),
    telegram: $("#telegramLink").value.trim(),
    website: $("#websiteLink").value.trim()
  };
}

function buildCreateParams(fallbackWallet = "") {
  const fallback = fallbackWallet || state.wallet || "";
  const marketingWallet = state.taxEnabled
    ? ($("#fundWallet").value.trim() || fallback)
    : ZERO_ADDRESS;

  return {
    name: $("#tokenName").value.trim(),
    symbol: $("#tokenSymbol").value.trim().toUpperCase(),
    totalSupply: "10000",
    walletCapEnabled: state.walletCapEnabled,
    maxWalletBuyTokens: state.walletCapEnabled ? String(state.cap) : "0",
    launchThresholdBnb: String(state.threshold),
    launchThresholdWei: window.ethers ? ethers.parseEther(String(state.threshold)).toString() : "",
    devBuyBnb: "0",
    devBuyTokenAmount: "0",
    marketingWallet,
    metadata: buildMetadata(),
    launchpadAddress: config.launchpadAddress || "待填写",
    platformFeeWallet: config.platformFeeWallet || "待填写",
    platformTaxBps: 100,
    taxEnabled: state.taxEnabled,
    projectMechanismTaxBps: state.taxEnabled ? state.projectTaxRate * 100 : 0,
    lpReceiverAfterLaunch: "0x000000000000000000000000000000000000dEaD",
    taxAllocationBps: {
      marketingWalletBnb: state.taxEnabled ? state.taxes.wallet * 100 : 0,
      burnTokenSupply: state.taxEnabled ? state.taxes.burn * 100 : 0,
      holderDividendsAutoBnb: state.taxEnabled ? state.taxes.reward * 100 : 0,
      autoLpBnb: state.taxEnabled ? state.taxes.lp * 100 : 0
    }
  };
}

function renderParams(fallbackWallet = "") {
  const output = $("#paramsOutput");
  if (output) {
    output.textContent = JSON.stringify(buildCreateParams(fallbackWallet), null, 2);
  }
}

async function connectWallet() {
  if (!window.ethereum) {
    $("#connectButton").textContent = t("walletMissing");
    throw new Error("未检测到钱包，请安装 MetaMask 或 OKX Wallet。");
  }

  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  state.wallet = accounts[0] || "";
  if (state.wallet) {
    $("#connectButton").textContent = shortAddress(state.wallet);
    $("#profileConnectButton").textContent = shortAddress(state.wallet);
  }

  await ensureBscNetwork();
  refreshProfile();
  return state.wallet;
}

async function ensureBscNetwork() {
  if (!window.ethereum) {
    throw new Error("未检测到钱包。");
  }

  const expectedChainId = Number(config.chainId || 56);
  const currentChainId = Number.parseInt(await window.ethereum.request({ method: "eth_chainId" }), 16);
  if (currentChainId === expectedChainId) {
    return;
  }

  await switchToBsc();
}

async function switchToBsc() {
  if (!window.ethereum) {
    return;
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x38" }]
    });
  } catch (error) {
    if (error && error.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0x38",
          chainName: "BNB Smart Chain",
          nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
          rpcUrls: ["https://bsc-dataseed.binance.org"],
          blockExplorerUrls: ["https://bscscan.com"]
        }]
      });
      return;
    }
    throw error;
  }
}

function validateCreateRequest(params) {
  if (!window.ethers) {
    throw new Error("ethers 未加载，请先运行 npm install 并刷新页面。");
  }
  if (!params.name) {
    throw new Error("Project name is required.");
  }
  if (!params.symbol) {
    throw new Error("Token symbol is required.");
  }
  if (!state.avatarFileName || !state.avatarUrl) {
    throw new Error("Project avatar is required.");
  }
  if (!hasConfiguredAddress(config.launchpadAddress)) {
    throw new Error("请先在 config.js 填写已部署的 launchpadAddress。");
  }
  if (params.taxEnabled && (params.projectMechanismTaxBps < 100 || params.projectMechanismTaxBps > 1_000)) {
    throw new Error("启用税收后，税率必须在 1%-10% 之间。");
  }
  if (params.taxEnabled && getTaxTotal() !== 100) {
    throw new Error("税收分配必须刚好等于 100%。");
  }
  if (
    params.taxEnabled
    && params.taxAllocationBps.marketingWalletBnb > 0
    && (!ethers.isAddress(params.marketingWallet) || params.marketingWallet === ZERO_ADDRESS)
  ) {
    throw new Error("启用税收并分配营销比例后，需要填写有效的营销钱包地址。");
  }
}

async function findVanitySalt(params, creator, initCodeHash = "") {
  const targetSuffix = String(config.vanityTokenSuffix || "0000").toLowerCase();
  const maxAttempts = Number(config.vanitySaltMaxAttempts || 240000);
  const result = await apiPost("/api/vanity-salt", {
    launchpadAddress: config.launchpadAddress,
    creator,
    tokenName: params.name,
    tokenSymbol: params.symbol,
    supply: "10000000000000000000000",
    initCodeHash,
    suffix: targetSuffix,
    maxAttempts
  });
  if (!result.userSalt || !result.predicted) {
    throw new Error("没有生成有效的靓号 salt，请重试。");
  }
  return result;
}

async function uploadAvatarForProject(params) {
  if (!state.avatarFileName || !state.avatarUrl || !state.avatarUrl.startsWith("data:")) {
    return state.avatarUrl || "";
  }
  const result = await apiPost("/api/upload-avatar", {
    fileName: state.avatarFileName,
    symbol: params.symbol,
    dataUrl: state.avatarUrl
  });
  return result.avatarUrl || state.avatarUrl;
}

function parseProjectCreated(receipt, contract) {
  for (const log of receipt.logs || []) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed && parsed.name === "ProjectCreated") {
        return {
          projectId: parsed.args.projectId.toString(),
          token: parsed.args.token
        };
      }
    } catch {
      // Ignore logs emitted by other contracts in the transaction.
    }
  }
  return null;
}

async function getLaunchThresholdArgument(launchpad, thresholdBnb) {
  const thresholdWei = ethers.parseEther(String(thresholdBnb));
  try {
    const minThreshold = await launchpad.MIN_LAUNCH_THRESHOLD();
    if (minThreshold <= ethers.parseEther("0.05")) {
      return thresholdWei;
    }
    if (thresholdWei < minThreshold) {
      throw new Error(`当前发射台合约最低阈值是 ${ethers.formatEther(minThreshold)} BNB。0.05 BNB 测试需要先部署新版测试合约，并把 config.js 的 launchpadAddress 换成新地址。`);
    }
    return BigInt(String(thresholdBnb));
  } catch (error) {
    if (String(error.message || "").includes("新版测试合约")) {
      throw error;
    }
    if (thresholdWei < ethers.parseEther("3")) {
      throw new Error("当前发射台合约可能还是旧版本，最低 3 BNB。0.05 BNB 测试需要先部署新版测试合约，并更新 config.js 的 launchpadAddress。");
    }
    return BigInt(String(thresholdBnb));
  }
}

async function verifyVanityWithLaunchpad(launchpad, params, vanity, wallet) {
  const predicted = await launchpad.predictTokenAddress(
    params.name,
    params.symbol,
    vanity.userSalt,
    wallet
  );
  if (!String(predicted).toLowerCase().endsWith("0000")) {
    throw new Error(`链上预测地址 ${predicted} 不是 0000 结尾。当前发射台合约和服务器靓号字节码不一致，请用当前仓库重新部署发射台合约，或更新 build-vanity 里的 LaunchpadToken.bin。`);
  }
  return predicted;
}

function updateDevBuyModalQuote() {
  const params = state.pendingCreateParams || buildCreateParams(state.wallet);
  const amount = Math.max(0, Number($("#devBuyBnbModal").value || 0));
  const tokens = estimateInitialBuyTokens(amount, params);
  const threshold = Number(params.launchThresholdBnb || state.threshold || 0);
  state.devBuyBnb = amount;
  state.devBuyTokens = tokens;
  let message = t("devBuyReceiveText")
    .replace("{amount}", formatTokenAmount(tokens, 6))
    .replace("{symbol}", params.symbol || t("tokenUnit"));
  if (threshold > 0 && amount >= threshold) {
    message += ` ${t("devBuyThresholdWarning").replace("{threshold}", formatBnb(threshold))}`;
  }
  $("#devBuyReceiveText").textContent = message;
}

function openDevBuyModal(params) {
  state.pendingCreateParams = params;
  $("#devBuyBnbModal").value = state.devBuyBnb > 0 ? String(state.devBuyBnb) : "";
  updateDevBuyModalQuote();
  $("#devBuyModal").hidden = false;
  document.body.classList.add("modal-open");
}

function closeDevBuyModal() {
  $("#devBuyModal").hidden = true;
  document.body.classList.remove("modal-open");
}

async function handleCreateToken() {
  try {
    const params = buildCreateParams(state.wallet);
    validateCreateRequest(params);
    renderParams(state.wallet);
    openDevBuyModal(params);
  } catch (error) {
    const message = error && (error.shortMessage || error.reason || error.message)
      ? (error.shortMessage || error.reason || error.message)
      : t("createFailedStatus");
    setCreateStatus(message, "error");
  }
}

async function submitCreateTokenWithDevBuy() {
  const confirmButton = $("#confirmDevBuy");
  const buttons = [$("#createTokenButton"), $("#createTokenButtonSecondary"), confirmButton];
  buttons.forEach((button) => {
    if (!button) {
      return;
    }
    button.disabled = true;
    button.textContent = button === confirmButton ? t("devBuyCreatingStatus") : t("submitPending");
  });

  try {
    const devBuyBnb = Math.max(0, Number($("#devBuyBnbModal").value || 0));
    if (!Number.isFinite(devBuyBnb) || devBuyBnb <= 0) {
      throw new Error("请输入大于 0 的首买 BNB 金额。");
    }
    setCreateStatus(t("createConnectStatus"), "");
    const wallet = await connectWallet();
    const params = state.pendingCreateParams || buildCreateParams(wallet);
    const tokenAmountEstimate = estimateInitialBuyTokens(devBuyBnb, params);
    if (tokenAmountEstimate <= 0) {
      throw new Error("首买金额太小，请提高 BNB 金额。");
    }
    setCreateStatus(
      devBuyBnb >= Number(params.launchThresholdBnb || 0)
        ? t("devBuyThresholdWarning").replace("{threshold}", formatBnb(params.launchThresholdBnb))
        : t("devBuyCreatingStatus"),
      devBuyBnb >= Number(params.launchThresholdBnb || 0) ? "warning" : ""
    );
    params.devBuyBnb = String(devBuyBnb);
    params.devBuyTokenAmount = ethers.parseEther(String(tokenAmountEstimate.toFixed(12))).toString();
    validateCreateRequest(params);
    renderParams(wallet);

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const launchpad = new ethers.Contract(config.launchpadAddress, LAUNCHPAD_ABI, signer);
    const launchThresholdArgument = await getLaunchThresholdArgument(launchpad, params.launchThresholdBnb);
    setCreateStatus(t("createReadVanityStatus"), "");
    let initCodeHash = "";
    try {
      initCodeHash = await launchpad.launchpadTokenInitCodeHash(params.name, params.symbol);
    } catch {
      throw new Error(t("launchpadOutdatedError"));
    }
    setCreateStatus(t("createGenerateAddressStatus"), "");
    const vanity = await findVanitySalt(params, wallet, initCodeHash);
    setCreateStatus(t("createVerifyAddressStatus").replace("{address}", vanity.predicted), "");
    const chainPredicted = await verifyVanityWithLaunchpad(launchpad, params, vanity, wallet);
    setCreateStatus(t("createConfirmTxStatus").replace("{address}", chainPredicted), "");
    const allocation = [
      params.taxAllocationBps.marketingWalletBnb,
      params.taxAllocationBps.burnTokenSupply,
      params.taxAllocationBps.holderDividendsAutoBnb,
      params.taxAllocationBps.autoLpBnb
    ];

    const projectConfig = [
      params.name,
      params.symbol,
      params.walletCapEnabled,
      BigInt(params.maxWalletBuyTokens),
      launchThresholdArgument,
      params.marketingWallet
    ];
    const projectTaxConfig = [
      params.taxEnabled,
      params.projectMechanismTaxBps,
      allocation
    ];

    let tx;
    try {
      tx = await launchpad.createProjectVanityAndBuy(
        projectConfig,
        projectTaxConfig,
        vanity.userSalt,
        BigInt(params.devBuyTokenAmount),
        { value: ethers.parseEther(String(devBuyBnb)) + ethers.parseEther("0.01") }
      );
    } catch (error) {
      if (String(error.message || "").includes("createProjectVanityAndBuy")) {
        throw new Error("当前发射台合约不是新版，不支持创建时 dev 第一笔买入。请先重新部署新合约并更新 config.js。");
      }
      throw error;
    }

    setCreateStatus(t("createSubmittedStatus").replace("{hash}", tx.hash), "");
    const receipt = await tx.wait();
    const created = parseProjectCreated(receipt, launchpad);

    if (created) {
      setCreateStatus(t("createSaveAvatarStatus").replace("{id}", created.projectId), "success");
      params.avatarUrl = await uploadAvatarForProject(params);
      params.metadata.avatarUrl = params.avatarUrl;
      const project = addCreatedProject(params, created);
      setCreateStatus(t("createVerifySourceStatus").replace("{id}", created.projectId).replace("{token}", shortAddress(created.token)), "success");
      autoVerifyCreatedToken(params, created).then((verifyMessage) => {
        setCreateStatus(t("createVerifiedStatus")
          .replace("{id}", created.projectId)
          .replace("{token}", shortAddress(created.token))
          .replace("{message}", verifyMessage), "success");
      });
      updateTabs("market");
      openTradeModal(project);
      closeDevBuyModal();
      state.pendingCreateParams = null;
    } else {
      setCreateStatus(t("createConfirmedNoEventStatus").replace("{hash}", tx.hash), "success");
    }
  } catch (error) {
    const message = error && (error.shortMessage || error.reason || error.message)
      ? (error.shortMessage || error.reason || error.message)
      : t("createFailedStatus");
    setCreateStatus(message, "error");
  } finally {
    buttons.forEach((button) => {
      if (!button) {
        return;
      }
      button.disabled = false;
      button.textContent = button === confirmButton ? t("confirmDevBuy") : t("createToken");
    });
  }
}

function handleAvatarChange(event) {
  const [file] = event.target.files || [];
  if (!file) {
    updateAvatarPreview("", "");
    updateCreateState();
    return;
  }
  const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    setCreateStatus(t("avatarTypeError"), "error");
    event.target.value = "";
    updateAvatarPreview("", "");
    updateCreateState();
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    setCreateStatus(t("avatarSizeError"), "error");
    event.target.value = "";
    updateAvatarPreview("", "");
    updateCreateState();
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    updateAvatarPreview(reader.result, file.name);
    updateCreateState();
  };
  reader.readAsDataURL(file);
}

function bindEvents() {
  const hero = $(".roo-console");
  if (hero) {
    hero.addEventListener("pointermove", (event) => {
      if (window.matchMedia("(max-width: 760px)").matches) {
        return;
      }
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 18;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 14;
      hero.style.setProperty("--roo-parallax-x", `${x.toFixed(2)}px`);
      hero.style.setProperty("--roo-parallax-y", `${y.toFixed(2)}px`);
    });
    hero.addEventListener("pointerleave", () => {
      hero.style.setProperty("--roo-parallax-x", "0px");
      hero.style.setProperty("--roo-parallax-y", "0px");
    });
  }

  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => updateTabs(tab.dataset.tab));
  });

  $("#menuButton").addEventListener("click", openMenu);
  $$("[data-close-menu]").forEach((button) => {
    button.addEventListener("click", closeMenu);
  });
  $$("[data-drawer-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      updateTabs(button.dataset.drawerTab);
      closeMenu();
    });
  });
  $$("[data-rail-tab]").forEach((button) => {
    button.addEventListener("click", () => updateTabs(button.dataset.railTab));
  });
  $$("[data-rail-toggle]").forEach((button) => {
    button.addEventListener("click", () => openMenu());
  });
  $$(".language-toggle button").forEach((button) => {
    button.addEventListener("click", () => setLanguage(button.dataset.lang));
  });
  $("#profileConnectButton").addEventListener("click", async () => {
    await connectWallet();
    await refreshProfile();
  });

  $$("[data-open-create]").forEach((button) => {
    button.addEventListener("click", () => updateTabs("create"));
  });

  $$("#marketFilters [data-market-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.marketFilter = button.dataset.marketFilter;
      state.marketPage = 1;
      $$("#marketFilters [data-market-filter]").forEach((filterButton) => {
        filterButton.classList.toggle("active", filterButton === button);
      });
      renderProjects();
    });
  });

  $("#marketCapSortButton").addEventListener("click", () => {
    state.marketSort = "marketCap";
    state.marketPage = 1;
    $("#marketSortSelect").value = "marketCap";
    renderProjects();
  });

  $("#refreshProjectsButton").addEventListener("click", async () => {
    const button = $("#refreshProjectsButton");
    button.disabled = true;
    const previousText = button.textContent;
    button.textContent = t("syncing");
    try {
      await loadBackendProjects();
      await syncChainProjects();
    } finally {
      button.disabled = false;
      button.textContent = previousText;
    }
  });

  $("#hardCapFilter").addEventListener("change", (event) => {
    state.hardCapFilter = event.target.value;
    state.marketPage = 1;
    renderProjects();
  });

  $("#marketSortSelect").addEventListener("change", (event) => {
    state.marketSort = event.target.value;
    state.marketPage = 1;
    renderProjects();
  });

  $("#listedOnly").addEventListener("change", (event) => {
    state.listedOnly = event.target.checked;
    state.marketPage = 1;
    renderProjects();
  });

  $("#marketSearch").addEventListener("input", (event) => {
    state.marketSearch = event.target.value;
    state.marketPage = 1;
    renderProjects();
  });

  $("#marketSearchForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    state.marketSearch = $("#marketSearch").value;
    state.marketPage = 1;
    const value = state.marketSearch.trim();
    if (window.ethers && ethers.isAddress(value)) {
      const searchButton = $("#marketSearchForm button");
      const previousText = searchButton.textContent;
      searchButton.disabled = true;
      searchButton.textContent = "查找中";
      try {
        const project = await findProjectByTokenAddress(value);
        state.marketSearch = project.symbol;
        $("#marketSearch").value = project.symbol;
        renderProjects();
      } catch (error) {
        alert(error.message || "没有找到这个代币。");
      } finally {
        searchButton.disabled = false;
        searchButton.textContent = previousText;
      }
      return;
    }
    renderProjects();
  });

  $("#projectList").addEventListener("click", (event) => {
    const copyButton = event.target.closest("[data-copy-address]");
    if (copyButton) {
      event.stopPropagation();
      copyText(copyButton.dataset.copyAddress || "");
      const oldText = copyButton.textContent;
      copyButton.textContent = "已复制";
      setTimeout(() => {
        copyButton.textContent = oldText;
      }, 900);
      return;
    }
    const refreshEmpty = event.target.closest("[data-empty-refresh]");
    if (refreshEmpty) {
      refreshEmpty.disabled = true;
      refreshEmpty.textContent = t("syncing");
      loadBackendProjects().then(() => syncChainProjects()).finally(() => {
        refreshEmpty.disabled = false;
      });
      return;
    }
    const pageButton = event.target.closest("[data-page-action]");
    if (pageButton) {
      state.marketPage += pageButton.dataset.pageAction === "next" ? 1 : -1;
      renderProjects();
      $("#projectList").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (event.target.closest("[data-open-create]")) {
      updateTabs("create");
      return;
    }
    if (event.target.closest(".project-thumb button")) {
      return;
    }
    const card = event.target.closest("[data-project-symbol]");
    if (!card) {
      return;
    }
    const project = projects.find((item) => item.symbol === card.dataset.projectSymbol);
    if (project) {
      openTradeModal(project);
    }
  });

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(renderProjects, 120);
  });

  $$(".profile-list").forEach((list) => {
    list.addEventListener("click", (event) => {
      const row = event.target.closest("[data-profile-project]");
      if (!row) {
        return;
      }
      const project = projects.find((item) => item.symbol === row.dataset.profileProject);
      if (project) {
        openTradeModal(project);
      }
    });
  });

  $$("[data-close-trade]").forEach((element) => {
    element.addEventListener("click", closeTradeModal);
  });
  $$("[data-close-dev-buy]").forEach((element) => {
    element.addEventListener("click", closeDevBuyModal);
  });
  $("#devBuyBnbModal").addEventListener("input", updateDevBuyModalQuote);
  $("#confirmDevBuy").addEventListener("click", submitCreateTokenWithDevBuy);

  $("#tradeContract").addEventListener("click", copyTradeContract);
  $("#copyTradeContract").addEventListener("click", copyTradeContract);

  $$(".swap-tabs button").forEach((button) => {
    button.addEventListener("click", () => setSwapSide(button.dataset.swapSide));
  });
  $$("[data-trade-view]").forEach((button) => {
    button.addEventListener("click", () => setTradeView(button.dataset.tradeView));
  });
  $$("[data-chart-interval]").forEach((button) => {
    button.addEventListener("click", () => setChartInterval(button.dataset.chartInterval));
  });

  $("#swapAmount").addEventListener("input", () => {
    if (state.swapSide === "buy") {
      state.buyInputMode = "bnb";
    }
    estimateSwapReceive();
  });
  $("#buyTokenAmount").addEventListener("input", () => {
    state.buyInputMode = "token";
    estimateSwapReceive();
  });
  $("#useTokenBuyMode").addEventListener("click", () => {
    state.buyInputMode = "token";
    $("#buyTokenAmount").focus();
    estimateSwapReceive();
  });
  $("#mevProtectionInput").addEventListener("change", (event) => {
    state.mevProtection = event.target.checked;
    estimateSwapReceive();
  });
  $("#slippageButton").addEventListener("click", () => {
    const next = window.prompt("设置滑点百分比 1-50", String(state.slippagePercent));
    if (next === null) {
      return;
    }
    const value = Math.max(1, Math.min(50, Number(next || state.slippagePercent)));
    state.slippagePercent = Number.isFinite(value) ? value : 15;
    $("#slippageButton").textContent = `${state.slippagePercent}%`;
  });
  $$(".quick-amounts button").forEach((button) => {
    button.addEventListener("click", () => {
      setSwapSide("buy");
      state.buyInputMode = "bnb";
      $("#swapAmount").value = button.dataset.amount;
      estimateSwapReceive();
    });
  });
  $$("#sellPercentages button").forEach((button) => {
    button.addEventListener("click", async () => {
      if (state.swapSide !== "sell") {
        setSwapSide("sell");
      }
      await refreshSelectedTokenBalance();
      const percent = Number(button.dataset.sellPercent || 0);
      const amount = (state.selectedTokenBalance * percent) / 100;
      $("#swapAmount").value = amount > 0 ? amount.toFixed(6) : "0";
      estimateSwapReceive();
    });
  });
  $("#swapReverse").addEventListener("click", () => {
    setSwapSide(state.swapSide === "buy" ? "sell" : "buy");
  });
  $("#swapSubmit").addEventListener("click", handleSwapSubmit);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("#tradeModal").hidden) {
      closeTradeModal();
    }
  });

  $("#connectButton").addEventListener("click", async () => {
    try {
      await connectWallet();
      setCreateStatus(t("walletReadyStatus"), "success");
      renderParams(state.wallet);
    } catch (error) {
      setCreateStatus(error.message || t("walletConnectFailed"), "error");
    }
  });
  $("#networkButton").addEventListener("click", async () => {
    try {
      await switchToBsc();
    } catch (error) {
      setCreateStatus(error.message || t("networkSwitchFailed"), "error");
    }
  });
  $("#avatarInput").addEventListener("change", handleAvatarChange);
  $("#walletCapEnabled").addEventListener("change", () => {
    updateCreateState();
    renderParams(state.wallet);
  });
  $("#taxEnabled").addEventListener("change", () => {
    updateTaxState();
    renderParams(state.wallet);
  });
  $("#projectTaxRate").addEventListener("input", () => {
    updateTaxState();
    renderParams(state.wallet);
  });
  $$(".tax-rate-option").forEach((button) => {
    button.addEventListener("click", () => {
      $("#projectTaxRate").value = button.dataset.taxRate;
      updateTaxState();
      renderParams(state.wallet);
    });
  });
  $("#createTokenButton").addEventListener("click", handleCreateToken);
  $("#createTokenButtonSecondary").addEventListener("click", handleCreateToken);

  [
    "#tokenName",
    "#tokenSymbol",
    "#walletCap",
    "#walletCapSlider",
    "#launchThreshold",
    "#thresholdSlider",
    "#xLink",
    "#telegramLink",
    "#websiteLink",
    "#fundWallet"
  ].forEach((selector) => {
    $(selector).addEventListener("input", (event) => {
      if (selector === "#walletCapSlider") {
        $("#walletCap").value = event.target.value;
      }
      if (selector === "#thresholdSlider") {
        $("#launchThreshold").value = event.target.value;
      }
      updateCreateState();
    });
  });

  ["#walletTax", "#burnTax", "#rewardTax", "#lpTax"].forEach((selector) => {
    $(selector).addEventListener("input", () => {
      updateTaxState();
      renderParams(state.wallet);
    });
  });

  $("#stepPills").addEventListener("click", (event) => {
    const step = event.target.dataset.capStep;
    if (!step) {
      return;
    }
    $("#walletCap").value = step;
    updateCreateState();
  });

  $("#createForm").addEventListener("submit", (event) => {
    event.preventDefault();
    renderParams(state.wallet);
    setCreateStatus(t("createPreviewUpdated"), "");
  });

  const copyParams = $("#copyParams");
  if (copyParams) {
    copyParams.addEventListener("click", async () => {
      await navigator.clipboard.writeText($("#paramsOutput").textContent);
      copyParams.textContent = t("copied");
      setTimeout(() => {
        copyParams.textContent = t("copy");
      }, 1400);
    });
  }
}

function boot() {
  const platformWallet = config.platformFeeWallet || "";
  const platformWalletText = $("#platformWalletText");
  const configStatus = $("#configStatus");
  if (platformWalletText) {
    platformWalletText.textContent = hasConfiguredAddress(platformWallet)
      ? shortAddress(platformWallet)
      : "未填写";
  }
  if (configStatus) {
    configStatus.textContent = hasConfiguredAddress(config.launchpadAddress) ? "已配置" : "待配置";
  }

  renderTradeTicker();
  renderProjects();
  loadBackendProjects().then(() => syncChainProjects());
  updateAvatarPreview("", "");
  updateTaxState();
  updateCreateState();
  bindEvents();
  setLanguage(state.language);
}

boot();
