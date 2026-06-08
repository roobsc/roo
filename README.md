# roo

BSC 链限购发射台原型

## 功能

- 创建项目时固定总量 `10,000` 枚。
- 单钱包限购可开关；启用后可在 `1-100` 枚之间选择，关闭后不限制单钱包购买数量。
- 内盘底池达到 `3-8 BNB` 的手动阈值后可发射到 Pancake 外盘。
- 内盘买入/卖出收取 `1%` 平台税，进入 `config.js` 的平台钱包。
- 发射外盘后不再收平台税。
- 项目机制税默认关闭；启用后可在 `1%-10%` 之间设置税率。
- 启用税收后支持营销钱包、销毁、持币分红、回流 LP，分配合计必须 `100%`。
- 只有启用税收且营销分配大于 0 时才需要填写营销钱包；它是收款钱包地址，不是合约地址。
- 分红不填写钱包，BNB 自动按持仓比例发给达到 `1` 枚代币的持币者；未达到门槛的小额地址不参与，减少链上分发压力。
- 回流 LP 不填写钱包，BNB 自动进入项目池子，发射外盘时一起加入 Pancake LP。
- 销毁项用于减少项目代币供应量。
- 外盘 LP token 自动发送到黑洞地址。

## 运行

```bash
npm install
npm start
```

默认地址：

```text
http://127.0.0.1:4301
```

## 自动开源

创建代币成功后，前端会调用后端 `/api/verify-token` 自动向 BscScan 提交 `LaunchpadToken` 源码验证。

启动后端前需要设置 BscScan API Key：

```bash
set BSCSCAN_API_KEY=你的_BSCSCAN_API_KEY
npm start
```

当前服务默认端口是 `4301`。如果正式部署前端和后端同域，可以把 `config.js` 里的 `apiBaseUrl` 留空；本地分端口运行时保持 `http://127.0.0.1:4301`。

## Vercel 数据库存储和 K 线

后端会优先使用 Vercel Marketplace/Neon/Supabase 等 Postgres 数据库；如果没有数据库环境变量，则回退到本地 `data/launchpad-db.json`。

在 Vercel 项目里绑定数据库后，确认环境变量里有其中一个：

```text
POSTGRES_URL
DATABASE_URL
```

部署到 Vercel 同域时，建议把 `config.js` 的 API 地址改成空字符串：

```js
apiBaseUrl: ""
```

交易 K 线的数据来源：

- 内盘真实买入/卖出成功后，前端写入 `/api/trades`。
- 后端把交易记录存入 Postgres 的 `trades` 表。
- 交易弹窗打开时请求 `/api/candles?projectId=...&interval=1m`。
- 后端按成交价 `priceBnb` 聚合 OHLCV，前端画出 K 线。

支持的周期包括 `1m`、`5m`、`15m`、`1h`、`4h`、`1d`。新项目刚创建但还没有成交时，前端会显示模拟走势；有真实成交后会优先展示数据库 K 线。

## 链上创建配置

1. 部署 `contracts/FourBscLaunchpad.sol`。
2. 打开 `config.js`，填写 `launchpadAddress` 为已部署的发射台合约地址。
3. 把 `platformFeeWallet` 改成平台收款钱包。
4. 在创建页填写项目名称、符号和发射阈值。
5. 如需单钱包限购，打开 `启用限购`，设置 `1-100` 枚限购。
6. 如需项目机制税，打开 `启用税收`，填写营销钱包，设置 `1%-10%` 税率和税收分配。
7. 点击 `创建代币`，页面会连接钱包、切到 BSC、调用 `createProject` 并提交交易。

头像、X、TG、网站目前作为前端元数据展示和参数 JSON 保留；当前合约的 `createProject` 没有接收这些字段。

## 合约

`contracts/FourBscLaunchpad.sol` 是自包含合约草案，包含：

- `createProject` 创建限购项目和项目代币。
- `createProjectVanity` 使用 `CREATE2` 创建尾号 `0000` 的代币合约地址；前端会先向后端 `/api/vanity-salt` 生成 salt，再提交链上交易。
- `buy` / `sell` 内盘交易。
- 内盘 `1%` BNB 平台税。
- 项目机制税中营销按 BNB 发送到营销钱包，分红按 BNB 自动发送给 `>= 1` 枚持币者，LP 回流自动进项目池，销毁按项目代币供应量减少。
- `launchToPancake` 手动外盘发射。
- `setPancakeRouter` 可由 owner 更新 Pancake V2 Router，处理 Router 地址填错或 Pancake 迁移接口调整的情况。
- `rescueLaunchLiquidity` 可由 owner 在项目达到发射底池后，把待迁移的 BNB 和代币转给指定迁移执行钱包，作为 Pancake 自动加池失败时的人工迁移兜底。
- `rescueLaunchLiquidityByToken` 支持直接传项目代币合约地址进行救援，不需要手动查 `projectId`。
- 正常 `launchToPancake` 成功后，项目代币会自动放弃 `owner()`，BscScan 上显示 `0x0000000000000000000000000000000000000000`。
- 如果使用救援迁移，合约不会自动放弃代币 `owner()`；确认外盘人工迁移成功后，owner 再调用 `confirmExternalLaunchAndRenounceByToken` 放弃代币权限。
- LP token 接收地址固定为黑洞。

正式上主网前需要用 Hardhat/Foundry 做单元测试、审计和 Pancake 流动性流程测试。

注意：尾号 `0000` 需要部署包含 `createProjectVanity` 的新版发射台合约。旧版已部署合约如果只有 `createProject`，不能保证代币合约尾号。
后端生成 salt 时会读取 `build-vanity/contracts_FourBscLaunchpad_sol_LaunchpadToken.bin`，部署前如果修改了 `LaunchpadToken` 源码，需要重新编译并更新这个文件。
