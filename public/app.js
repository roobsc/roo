const config = window.LAUNCHPAD_CONFIG || {};
const defaultAvatar = "./assets/roo-avatar.jpg";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

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
      { name: "userSalt", type: "bytes32" }
    ],
    name: "createProjectVanity",
    outputs: [
      { name: "projectId", type: "uint256" },
      { name: "token", type: "address" }
    ],
    stateMutability: "nonpayable",
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
    inputs: [{ name: "projectId", type: "uint256" }],
    name: "launchToPancake",
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

const state = {
  wallet: "",
  cap: Number(config.defaultBuyCapTokens || 25),
  threshold: Number(config.defaultLaunchThresholdBnb || 5),
  avatarUrl: defaultAvatar,
  avatarFileName: "",
  walletCapEnabled: true,
  marketFilter: "all",
  marketSearch: "",
  hardCapFilter: "all",
  marketSort: "default",
  marketLoading: false,
  language: "zh",
  listedOnly: false,
  selectedProject: null,
  swapSide: "buy",
  selectedTokenBalance: 0,
  chainSyncing: false,
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

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function shortAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
    return "未填写";
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
    const key = project.projectId !== undefined && project.projectId !== null
      ? `id:${project.projectId}`
      : `symbol:${project.symbol}`;
    if (!byKey.has(key)) {
      byKey.set(key, { ...project, avatarUrl: project.avatarUrl || defaultAvatar });
    }
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
  } catch {
    projects = [];
  } finally {
    state.marketLoading = false;
    renderProjects();
  }
}

function normalizeAddress(address) {
  return String(address || "").toLowerCase();
}

function upsertLocalProject(project) {
  const key = project.projectId !== undefined && project.projectId !== null
    ? (item) => String(item.projectId) === String(project.projectId)
    : (item) => normalizeAddress(item.contract) === normalizeAddress(project.contract);
  const index = projects.findIndex(key);
  if (index >= 0) {
    projects[index] = { ...projects[index], ...project };
  } else {
    projects.unshift(project);
  }
  renderTradeTicker();
  renderProjects();
  apiPost("/api/projects/upsert", project).catch(() => {});
  return project;
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

async function buildProjectFromChain(projectId, basics, provider) {
  const token = new ethers.Contract(basics.token, ERC20_ABI, provider);
  let name = `Project ${projectId}`;
  let symbol = `P${projectId}`;
  try {
    [name, symbol] = await Promise.all([token.name(), token.symbol()]);
  } catch {
    // Some tokens may not expose metadata cleanly; keep fallback names.
  }
  const launchThreshold = Number(ethers.formatEther(basics.launchThreshold || 0n));
  const bnbRaised = Number(ethers.formatEther(basics.bnbRaised || 0n));
  const tokensSold = Number(ethers.formatEther(basics.tokensSold || 0n));
  const progress = launchThreshold > 0
    ? Math.min(100, Number(((bnbRaised / launchThreshold) * 100).toFixed(3)))
    : 0;
  const launched = Boolean(basics.launched);
  return {
    projectId: String(projectId),
    name,
    symbol,
    status: launched ? "已发射" : "内盘",
    stage: getProjectStage(launched, progress),
    progress,
    cap: basics.walletCap ? Math.max(0, Number(ethers.formatEther(basics.walletCap))) : 100,
    raised: `${bnbRaised.toFixed(3)} / ${launchThreshold || 0} BNB`,
    holders: 0,
    marketCap: Math.round((bnbRaised * 600) + tokensSold),
    creator: basics.creator,
    contract: basics.token,
    change: 0,
    listed: launched,
    avatar: symbol.slice(0, 1).toUpperCase(),
    avatarUrl: defaultAvatar
  };
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
        const chainProject = await buildProjectFromChain(projectId, basics, provider);
        const existing = projects.find((project) => String(project.projectId) === String(chainProject.projectId));
        upsertLocalProject(existing ? { ...chainProject, ...existing, ...chainProject } : chainProject);
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
    try {
      [name, symbol] = await Promise.all([token.name(), token.symbol()]);
    } catch {
      // Some tokens may not expose metadata cleanly; keep fallback names.
    }
    const launchThreshold = Number(ethers.formatEther(basics.launchThreshold || 0n));
    const bnbRaised = Number(ethers.formatEther(basics.bnbRaised || 0n));
    const progress = launchThreshold > 0 ? Math.min(100, Number(((bnbRaised / launchThreshold) * 100).toFixed(3))) : 0;
    return upsertLocalProject({
      projectId: String(projectId),
      name,
      symbol,
      status: basics.launched ? "已发射" : "内盘",
      stage: basics.launched ? "launched" : "new",
      progress,
      cap: basics.walletCap ? Math.max(0, Number(ethers.formatEther(basics.walletCap))) : 100,
      raised: `${bnbRaised.toFixed(3)} / ${launchThreshold || 0} BNB`,
      holders: 0,
      marketCap: Math.round(bnbRaised * 600),
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

function parseLaunchThreshold(project) {
  const match = String(project.raised || "").match(/\/\s*([0-9.]+)/);
  return match ? Number(match[1]) : 0;
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
        return threshold >= 3 && threshold <= 4;
      }
      if (state.hardCapFilter === "mid") {
        return threshold >= 5 && threshold <= 6;
      }
      if (state.hardCapFilter === "high") {
        return threshold >= 7;
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
  if (visibleProjects.length === 0) {
    list.innerHTML = `<div class="empty-market">${t("emptyProjects")}</div>`;
    return;
  }
  list.innerHTML = visibleProjects.map((project) => `
    <article class="project-card" data-project-symbol="${project.symbol}">
      <div class="project-thumb">
        ${getProjectAvatarMarkup(project)}
        <button type="button" aria-label="收藏 ${project.name}">★</button>
      </div>
      <div class="project-body">
        <div class="project-title-row">
          <div>
            <h3>${project.name}</h3>
            <span class="token-kind">${project.symbol} / BSC</span>
          </div>
          <strong class="change-badge">+${project.change}%</strong>
        </div>
        <dl class="project-facts">
          <div>
            <dt>创建者:</dt>
            <dd>${project.creator}</dd>
          </div>
          <div>
            <dt>市值:</dt>
            <dd>${formatMarketCap(project.marketCap)}</dd>
          </div>
          <div>
            <dt>限购:</dt>
            <dd>${project.cap} 枚</dd>
          </div>
          <div>
            <dt>持有人:</dt>
            <dd>${project.holders}</dd>
          </div>
        </dl>
        <div class="project-progress-line">
          <i style="--value: ${project.progress}%"></i>
          <b>${project.progress}%</b>
        </div>
        <div class="project-card-footer">
          <span class="badge">${project.status}</span>
          <span>底池 ${project.raised}</span>
        </div>
      </div>
    </article>
  `).join("");
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
      <b>${project.listed ? "Listed" : "Internal"}</b>
    </button>
  `).join("");
}

const translations = {
  zh: {
    filterHardCapAll: "硬顶",
    sortDefault: "默认推荐",
    sortMarketCap: "市值",
    sortProgress: "进度",
    sortStartTime: "开始时间",
    sortEndTime: "接近结束",
    sortHot: "热度",
    loadingProjects: "Loading microsales...",
    emptyProjects: "暂无真实项目。请创建项目，或点击刷新同步链上历史项目。"
  },
  en: {
    filterHardCapAll: "Hard cap",
    sortDefault: "Default",
    sortMarketCap: "Market cap",
    sortProgress: "Progress",
    sortStartTime: "Start time",
    sortEndTime: "End time",
    sortHot: "Hot",
    loadingProjects: "Loading microsales...",
    emptyProjects: "No real projects yet. Create one or refresh to sync chain history."
  }
};

function t(key) {
  return (translations[state.language] && translations[state.language][key])
    || translations.zh[key]
    || key;
}

async function refreshProfile() {
  const wallet = normalizeAddress(state.wallet);
  $("#profileWallet").textContent = wallet ? shortAddress(state.wallet) : "未连接";
  if (!wallet) {
    $("#profileCreatedCount").textContent = "0";
    $("#profileTradedCount").textContent = "0";
    $("#profileHoldingCount").textContent = "0";
    renderProfileList("#createdTokenList", [], "连接钱包后显示你创建的代币。");
    renderProfileList("#tradedTokenList", [], "连接钱包后显示你交易过的代币。");
    renderProfileList("#holdingTokenList", [], "连接钱包后显示你的持仓。");
    return;
  }

  const created = projects.filter((project) => normalizeAddress(project.creator) === wallet);
  const tradedMap = new Map();
  for (const project of projects.slice(0, 80)) {
    if (project.projectId === undefined || project.projectId === null) {
      continue;
    }
    try {
      const data = await apiGet(`/api/trades?projectId=${encodeURIComponent(project.projectId)}`);
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
  renderProfileList("#createdTokenList", created, "还没有创建过代币。");
  renderProfileList("#tradedTokenList", traded, "还没有真实交易记录。");
  renderProfileList("#holdingTokenList", holdings, "没有读取到持仓。");
}

function openMenu() {
  $("#sideDrawer").hidden = false;
  document.body.classList.add("drawer-open");
}

function closeMenu() {
  $("#sideDrawer").hidden = true;
  document.body.classList.remove("drawer-open");
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
  if ($("#projectList")) {
    renderProjects();
  }
}

function drawTradeChart(project, backendCandles = null) {
  const canvas = $("#tradeChart");
  const context = canvas.getContext("2d");
  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#171717";
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "rgba(255, 224, 163, 0.08)";
  context.lineWidth = 1;
  for (let x = 72; x < width; x += 96) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 40; y < height; y += 54) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  const candles = backendCandles || [];
  if (!candles.length) {
    context.fillStyle = "#f3c98b";
    context.font = "16px sans-serif";
    context.fillText("暂无真实成交 K 线", 54, 64);
    $("#chartPriceTag").textContent = "--";
    return;
  }
  const max = Math.max(...candles.map((candle) => candle.high));
  const min = Math.min(...candles.map((candle) => candle.low));
  const scaleY = (value) => height - 32 - ((value - min) / (max - min || 1)) * (height - 64);
  const candleWidth = Math.max(4, Math.floor((width - 90) / candles.length) - 3);

  candles.forEach((candle, index) => {
    const x = 54 + index * ((width - 90) / candles.length);
    const isUp = candle.close >= candle.open;
    const color = isUp ? "#d27d3a" : "#ff4f3f";
    context.strokeStyle = color;
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(x + candleWidth / 2, scaleY(candle.high));
    context.lineTo(x + candleWidth / 2, scaleY(candle.low));
    context.stroke();
    const y = Math.min(scaleY(candle.open), scaleY(candle.close));
    const bodyHeight = Math.max(2, Math.abs(scaleY(candle.open) - scaleY(candle.close)));
    context.fillRect(x, y, candleWidth, bodyHeight);
  });

  const last = candles[candles.length - 1].close;
  const y = scaleY(last);
  context.setLineDash([3, 4]);
  context.strokeStyle = "rgba(255, 120, 78, 0.75)";
  context.beginPath();
  context.moveTo(0, y);
  context.lineTo(width, y);
  context.stroke();
  context.setLineDash([]);
  $("#chartPriceTag").textContent = last.toFixed(6);
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

function estimateSwapReceive() {
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
  const amount = Math.max(0, Number($("#swapAmount").value || 0));
  if (state.swapSide === "buy") {
    const estimated = (amount * 10_000) / Math.max(3, project.progress / 18);
    $("#swapReceive").textContent = `您将收到: ${estimated.toFixed(3)} ${project.symbol}`;
    return;
  }
  const estimatedBnb = (amount * Math.max(3, project.progress / 18)) / 10_000;
  $("#swapReceive").textContent = `您将收到: ${estimatedBnb.toFixed(6)} BNB`;
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
    cap: params.walletCapEnabled ? Number(params.maxWalletBuyTokens) : 100,
    raised: `0 / ${params.launchThresholdBnb} BNB`,
    holders: 0,
    marketCap: 0,
    creator: state.wallet ? shortAddress(state.wallet) : "当前钱包",
    contract: created.token,
    projectId: created.projectId,
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

function getLaunchpadContract(signerOrProvider) {
  return new ethers.Contract(config.launchpadAddress, LAUNCHPAD_ABI, signerOrProvider);
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

async function handleSwapSubmit() {
  const project = state.selectedProject;
  const button = $("#swapSubmit");
  try {
    requireTradableProject(project);
    const rawAmount = Number($("#swapAmount").value || 0);
    if (!rawAmount || rawAmount <= 0) {
      throw new Error("请输入买入或卖出数量。");
    }

    button.disabled = true;
    button.textContent = state.swapSide === "buy" ? "购买中..." : "卖出中...";
    const { signer } = await getTradeSigner();
    const launchpad = getLaunchpadContract(signer);

    if (state.swapSide === "buy") {
      const bnbAmount = ethers.parseEther(String(rawAmount));
      const oneTokenCost = await launchpad.quoteBuy(BigInt(project.projectId), ethers.parseEther("1"));
      if (oneTokenCost <= 0n) {
        throw new Error("报价异常，无法计算买入数量。");
      }
      let tokenAmount = (bnbAmount * ethers.parseEther("1")) / oneTokenCost;
      if (tokenAmount <= 0n) {
        throw new Error("BNB 数量太小，无法买到代币。");
      }
      const maxTokenAmount = ethers.parseEther(String(project.cap || 100));
      if (tokenAmount > maxTokenAmount) {
        tokenAmount = maxTokenAmount;
      }
      const cost = await launchpad.quoteBuy(BigInt(project.projectId), tokenAmount);
      const tx = await launchpad.buy(BigInt(project.projectId), tokenAmount, { value: cost });
      $("#swapReceive").textContent = `购买交易已提交：${tx.hash}`;
      await tx.wait();
      await saveBackendTrade(project, {
        side: "buy",
        txHash: tx.hash,
        bnbAmount: Number(ethers.formatEther(cost)),
        tokenAmount: Number(ethers.formatEther(tokenAmount))
      });
      $("#swapReceive").textContent = `购买成功：${ethers.formatEther(tokenAmount)} ${project.symbol}`;
      await refreshTradeData(project);
      return;
    }

    const tokenAmount = ethers.parseEther(String(rawAmount));
    const token = new ethers.Contract(project.contract, ERC20_ABI, signer);
    const owner = await signer.getAddress();
    const allowance = await token.allowance(owner, config.launchpadAddress);
    if (allowance < tokenAmount) {
      button.textContent = "授权中...";
      const approveTx = await token.approve(config.launchpadAddress, tokenAmount);
      $("#swapReceive").textContent = `授权交易已提交：${approveTx.hash}`;
      await approveTx.wait();
    }
    button.textContent = "卖出中...";
    const tx = await launchpad.sell(BigInt(project.projectId), tokenAmount);
    $("#swapReceive").textContent = `卖出交易已提交：${tx.hash}`;
    await tx.wait();
    const estimatedBnb = await launchpad.quoteSell(BigInt(project.projectId), tokenAmount);
    await saveBackendTrade(project, {
      side: "sell",
      txHash: tx.hash,
      bnbAmount: Number(ethers.formatEther(estimatedBnb)),
      tokenAmount: Number(ethers.formatEther(tokenAmount))
    });
    $("#swapReceive").textContent = `卖出成功，预估返回 ${ethers.formatEther(estimatedBnb)} BNB`;
    await refreshTradeData(project);
  } catch (error) {
    const message = error && (error.shortMessage || error.reason || error.message)
      ? (error.shortMessage || error.reason || error.message)
      : "交易失败，请检查钱包和参数。";
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
  $$(".swap-tabs button").forEach((button) => {
    button.classList.toggle("active", button.dataset.swapSide === side);
  });
  const project = state.selectedProject;
  $("#swapUnit").textContent = side === "buy" ? "BNB" : (project ? project.symbol : "代币");
  $(".quick-amounts").hidden = side === "sell";
  $("#sellPercentages").hidden = side !== "sell";
  $("#swapAmount").step = side === "buy" ? "0.01" : "0.000001";
  $("#swapAmount").placeholder = side === "buy" ? "输入 BNB 数量" : `输入 ${project ? project.symbol : "代币"} 数量`;
  $("#swapLimit").textContent = side === "buy"
    ? `最大限度 ${project ? project.cap : 0} 枚`
    : "选择卖出比例或手动输入代币数量";
  const canTrade = project && project.projectId !== undefined && project.projectId !== null && window.ethers && ethers.isAddress(project.contract || "");
  $("#swapSubmit").disabled = !canTrade;
  $("#swapSubmit").textContent = canTrade ? (side === "buy" ? "购买" : "卖出") : "未同步不可交易";
  $("#swapAmount").value = side === "buy" ? "0.1" : "1";
  if (side === "sell") {
    refreshSelectedTokenBalance();
  }
  estimateSwapReceive();
}

async function refreshTradeData(project) {
  if (!project || project.projectId === undefined || project.projectId === null) {
    renderTradeTable(project);
    drawTradeChart(project);
    return;
  }
  try {
    const [tradesData, candlesData] = await Promise.all([
      apiGet(`/api/trades?projectId=${encodeURIComponent(project.projectId)}`),
      apiGet(`/api/candles?projectId=${encodeURIComponent(project.projectId)}&interval=1m`)
    ]);
    renderTradeTable(project, tradesData.trades || []);
    drawTradeChart(project, candlesData.candles || []);
  } catch {
    renderTradeTable(project);
    drawTradeChart(project);
  }
}

function openTradeModal(project) {
  state.selectedProject = project;
  const avatarMarkup = project.avatarUrl
    ? `<img src="${project.avatarUrl}" alt="">`
    : project.avatar;
  $("#tradeAvatar").innerHTML = avatarMarkup;
  $("#infoAvatar").innerHTML = avatarMarkup;
  $("#tradePair").textContent = `${project.symbol} / BNB`;
  const contractAddress = project.contract || project.creator || ZERO_ADDRESS;
  $("#tradeContract").textContent = `合约 ${shortAddress(contractAddress)}`;
  $("#tradeContract").dataset.address = contractAddress;
  $("#copyTradeContract").dataset.address = contractAddress;
  $("#copyTradeContract").textContent = "复制";
  $("#tradeCreator").textContent = `创建者 ${project.creator}`;
  $("#tradePrice").textContent = `${Math.max(0.000001, project.marketCap / 68_000_000).toFixed(6)} BNB`;
  $("#tradeChange").textContent = `+${project.change}%`;
  $("#tradeMarketCap").textContent = `$${formatMarketCap(project.marketCap)}`;
  $("#tradeLiquidity").textContent = `$${formatMarketCap(project.marketCap * 1.08)}`;
  $("#tradeVolume").textContent = `$${formatMarketCap(project.marketCap * 2.93)}`;
  $("#tradeCreated").textContent = project.listed ? "2026/06/08 00:08:46" : "刚刚";
  $("#bondingValue").textContent = `${project.progress}%`;
  $("#bondingBar").style.width = `${Math.min(100, project.progress)}%`;
  $("#bondingText").innerHTML = `联合曲线中仍有 <strong>${Math.round(project.marketCap * 728).toLocaleString()} ${project.symbol}</strong> 可供出售；当前底池 <strong>${project.raised}</strong>。`;
  $("#infoName").textContent = project.name;
  $("#infoSymbol").textContent = project.symbol;
  $("#infoDescription").textContent = project.listed
    ? "该项目已上线 Pancake Swap，可从外盘继续交易。"
    : "该项目仍在 roo 内盘，达到发射阈值后可进入 Pancake Swap。";
  if (project.projectId === undefined || project.projectId === null) {
    $("#swapReceive").textContent = "这个项目还没有同步到链上 projectId，暂时不能交易。";
  }
  refreshTradeData(project);
  setSwapSide("buy");
  $("#tradeModal").hidden = false;
  document.body.classList.add("modal-open");
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
  $("#copyTradeContract").textContent = "已复制";
  $("#tradeContract").textContent = `合约 ${shortAddress(address)} 已复制`;
  setTimeout(() => {
    $("#copyTradeContract").textContent = "复制";
    $("#tradeContract").textContent = `合约 ${shortAddress(address)}`;
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
    ? "分配已满 100%。"
    : `当前分配为 ${total}%，需要刚好等于 100%。`;
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
  state.avatarUrl = url || defaultAvatar;
  state.avatarFileName = fileName || "";
  $("#avatarPreview").src = state.avatarUrl;
  $("#previewAvatar").src = state.avatarUrl;
  $("#avatarFileName").textContent = state.avatarFileName || "未选择图片";
}

function updateCreateState() {
  const name = $("#tokenName").value.trim() || "Meme Rocket";
  const symbol = ($("#tokenSymbol").value.trim() || "MRKT").toUpperCase();
  const xLink = $("#xLink").value.trim();
  const telegramLink = $("#telegramLink").value.trim();
  const websiteLink = $("#websiteLink").value.trim();

  state.walletCapEnabled = $("#walletCapEnabled").checked;
  state.cap = clampNumber($("#walletCap").value, 1, 100);
  state.threshold = clampNumber($("#launchThreshold").value, 3, 8);

  $("#walletCapSettings").hidden = !state.walletCapEnabled;
  $("#walletCap").value = state.cap;
  $("#walletCapSlider").value = state.cap;
  $("#launchThreshold").value = state.threshold;
  $("#thresholdSlider").value = state.threshold;

  $("#capValue").textContent = state.cap;
  $("#thresholdValue").textContent = state.threshold;
  $("#summaryCap").textContent = state.walletCapEnabled ? `${state.cap} 枚` : "不限购";
  $("#summaryThreshold").textContent = state.threshold;
  $("#previewName").textContent = name;
  $("#previewSymbol").textContent = `${symbol} / BSC`;
  $("#summaryX").textContent = compactLink(xLink);
  $("#summaryTelegram").textContent = compactLink(telegramLink);
  $("#summaryWebsite").textContent = compactLink(websiteLink);
  const capCheck = $("#capCheck");
  const thresholdCheck = $("#thresholdCheck");
  if (capCheck) {
    capCheck.checked = !state.walletCapEnabled || (state.cap >= 1 && state.cap <= 100);
  }
  if (thresholdCheck) {
    thresholdCheck.checked = state.threshold >= 3 && state.threshold <= 8;
  }

  renderStepPills();
  renderParams();
}

function buildMetadata() {
  return {
    avatarFileName: state.avatarFileName || "",
    avatarUrl: state.avatarUrl || defaultAvatar,
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
    name: $("#tokenName").value.trim() || "Meme Rocket",
    symbol: ($("#tokenSymbol").value.trim() || "MRKT").toUpperCase(),
    totalSupply: "10000",
    walletCapEnabled: state.walletCapEnabled,
    maxWalletBuyTokens: state.walletCapEnabled ? String(state.cap) : "0",
    launchThresholdBnb: String(state.threshold),
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
    $("#connectButton").textContent = "未检测到钱包";
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

async function findVanitySalt(params, creator) {
  const targetSuffix = String(config.vanityTokenSuffix || "0000").toLowerCase();
  const maxAttempts = Number(config.vanitySaltMaxAttempts || 240000);
  const result = await apiPost("/api/vanity-salt", {
    launchpadAddress: config.launchpadAddress,
    creator,
    tokenName: params.name,
    tokenSymbol: params.symbol,
    supply: "10000000000000000000000",
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
    return state.avatarUrl || defaultAvatar;
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

async function handleCreateToken() {
  const buttons = [$("#createTokenButton"), $("#createTokenButtonSecondary")];
  buttons.forEach((button) => {
    button.disabled = true;
    button.textContent = "提交中...";
  });

  try {
    setCreateStatus("正在连接钱包并检查 BSC 网络...", "");
    const wallet = await connectWallet();
    const params = buildCreateParams(wallet);
    validateCreateRequest(params);
    renderParams(wallet);

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const launchpad = new ethers.Contract(config.launchpadAddress, LAUNCHPAD_ABI, signer);
    setCreateStatus("正在生成尾号 0000 的代币合约地址...", "");
    const vanity = await findVanitySalt(params, wallet);
    setCreateStatus(`已找到尾号 0000 的预测地址：${vanity.predicted}，正在唤起钱包确认创建交易。`, "");
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
      BigInt(params.launchThresholdBnb),
      params.marketingWallet
    ];
    const projectTaxConfig = [
      params.taxEnabled,
      params.projectMechanismTaxBps,
      allocation
    ];

    const tx = await launchpad.createProjectVanity(projectConfig, projectTaxConfig, vanity.userSalt);

    setCreateStatus(`交易已提交：${tx.hash}，正在等待链上确认...`, "");
    const receipt = await tx.wait();
    const created = parseProjectCreated(receipt, launchpad);

    if (created) {
      setCreateStatus(`创建成功：Project #${created.projectId}。正在保存项目头像...`, "success");
      params.avatarUrl = await uploadAvatarForProject(params);
      params.metadata.avatarUrl = params.avatarUrl;
      const project = addCreatedProject(params, created);
      setCreateStatus(`创建成功：Project #${created.projectId}，代币 ${shortAddress(created.token)}。正在自动开源...`, "success");
      autoVerifyCreatedToken(params, created).then((verifyMessage) => {
        setCreateStatus(`创建成功：Project #${created.projectId}，代币 ${shortAddress(created.token)}。${verifyMessage}`, "success");
      });
      updateTabs("market");
      openTradeModal(project);
    } else {
      setCreateStatus(`交易已确认：${tx.hash}。未解析到 ProjectCreated 事件，请到 BscScan 查看详情。`, "success");
    }
  } catch (error) {
    const message = error && (error.shortMessage || error.reason || error.message)
      ? (error.shortMessage || error.reason || error.message)
      : "创建交易失败，请检查钱包弹窗和参数。";
    setCreateStatus(message, "error");
  } finally {
    buttons.forEach((button) => {
      button.disabled = false;
      button.textContent = "创建代币";
    });
  }
}

function handleAvatarChange(event) {
  const [file] = event.target.files || [];
  if (!file) {
    updateAvatarPreview(defaultAvatar, "");
    updateCreateState();
    return;
  }
  const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    setCreateStatus("头像只支持 PNG、JPG、WebP 格式。", "error");
    event.target.value = "";
    updateAvatarPreview(defaultAvatar, "");
    updateCreateState();
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    setCreateStatus("头像需要小于 2MB，请压缩后再上传。", "error");
    event.target.value = "";
    updateAvatarPreview(defaultAvatar, "");
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
      $$("#marketFilters [data-market-filter]").forEach((filterButton) => {
        filterButton.classList.toggle("active", filterButton === button);
      });
      renderProjects();
    });
  });

  $("#marketCapSortButton").addEventListener("click", () => {
    state.marketSort = "marketCap";
    $("#marketSortSelect").value = "marketCap";
    renderProjects();
  });

  $("#refreshProjectsButton").addEventListener("click", async () => {
    const button = $("#refreshProjectsButton");
    button.disabled = true;
    const previousText = button.textContent;
    button.textContent = "同步中...";
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
    renderProjects();
  });

  $("#marketSortSelect").addEventListener("change", (event) => {
    state.marketSort = event.target.value;
    renderProjects();
  });

  $("#listedOnly").addEventListener("change", (event) => {
    state.listedOnly = event.target.checked;
    renderProjects();
  });

  $("#marketSearch").addEventListener("input", (event) => {
    state.marketSearch = event.target.value;
    renderProjects();
  });

  $("#marketSearchForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    state.marketSearch = $("#marketSearch").value;
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

  $("#tradeContract").addEventListener("click", copyTradeContract);
  $("#copyTradeContract").addEventListener("click", copyTradeContract);

  $$(".swap-tabs button").forEach((button) => {
    button.addEventListener("click", () => setSwapSide(button.dataset.swapSide));
  });

  $("#swapAmount").addEventListener("input", estimateSwapReceive);
  $$(".quick-amounts button").forEach((button) => {
    button.addEventListener("click", () => {
      setSwapSide("buy");
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
      setCreateStatus("钱包已连接，可以创建代币。", "success");
      renderParams(state.wallet);
    } catch (error) {
      setCreateStatus(error.message || "连接钱包失败。", "error");
    }
  });
  $("#networkButton").addEventListener("click", async () => {
    try {
      await switchToBsc();
    } catch (error) {
      setCreateStatus(error.message || "切换 BSC 网络失败。", "error");
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
    setCreateStatus("预览已更新，确认无误后点击“创建代币”。", "");
  });

  const copyParams = $("#copyParams");
  if (copyParams) {
    copyParams.addEventListener("click", async () => {
      await navigator.clipboard.writeText($("#paramsOutput").textContent);
      copyParams.textContent = "已复制";
      setTimeout(() => {
        copyParams.textContent = "复制";
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
  updateAvatarPreview(defaultAvatar, "");
  updateTaxState();
  updateCreateState();
  bindEvents();
}

boot();
