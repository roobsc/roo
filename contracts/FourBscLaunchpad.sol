// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPancakeV2Router {
    function WETH() external pure returns (address);

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 amountLiquidity);
}

interface ILaunchpadHolderTracker {
    function afterTokenTransfer(address from, address to) external;
}

/**
 * @title LaunchpadToken
 * @notice Minimal BEP20/ERC20 token used by FourBscLaunchpad projects.
 * The launchpad mints the fixed 10,000 token supply to itself on creation.
 */
contract LaunchpadToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    address public immutable launchpad;
    address public owner;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyLaunchpad() {
        require(msg.sender == launchpad, "TOKEN: only launchpad");
        _;
    }

    constructor(string memory tokenName, string memory tokenSymbol, uint256 supply, address launchpadAddress) {
        require(launchpadAddress != address(0), "TOKEN: zero launchpad");
        name = tokenName;
        symbol = tokenSymbol;
        totalSupply = supply;
        launchpad = launchpadAddress;
        owner = launchpadAddress;
        _balances[launchpadAddress] = supply;
        emit Transfer(address(0), launchpadAddress, supply);
        emit OwnershipTransferred(address(0), launchpadAddress);
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function allowance(address tokenOwner, address spender) external view returns (uint256) {
        return _allowances[tokenOwner][spender];
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = _allowances[from][msg.sender];
        require(allowed >= amount, "TOKEN: allowance");
        if (allowed != type(uint256).max) {
            _allowances[from][msg.sender] = allowed - amount;
            emit Approval(from, msg.sender, _allowances[from][msg.sender]);
        }
        _transfer(from, to, amount);
        return true;
    }

    function launchpadTransferTo(address to, uint256 amount) external onlyLaunchpad returns (bool) {
        _transfer(launchpad, to, amount);
        return true;
    }

    function launchpadBurn(uint256 amount) external onlyLaunchpad returns (bool) {
        uint256 balance = _balances[launchpad];
        require(balance >= amount, "TOKEN: burn balance");
        unchecked {
            _balances[launchpad] = balance - amount;
            totalSupply -= amount;
        }
        emit Transfer(launchpad, address(0), amount);
        return true;
    }

    function launchpadRenounceOwnership() external onlyLaunchpad returns (bool) {
        address previousOwner = owner;
        owner = address(0);
        emit OwnershipTransferred(previousOwner, address(0));
        return true;
    }

    function _transfer(address from, address to, uint256 amount) private {
        require(to != address(0), "TOKEN: zero to");
        uint256 balance = _balances[from];
        require(balance >= amount, "TOKEN: balance");
        unchecked {
            _balances[from] = balance - amount;
            _balances[to] += amount;
        }
        emit Transfer(from, to, amount);
        ILaunchpadHolderTracker(launchpad).afterTokenTransfer(from, to);
    }
}

/**
 * @title FourBscLaunchpad
 * @notice BSC meme launchpad prototype:
 * - Fixed project supply: 10,000 tokens.
 * - Creator chooses one-wallet buy cap from 1 to 100 tokens.
 * - Creator chooses manual launch threshold from 0.05 to 8 BNB in testing mode.
 * - Internal market buy/sell uses an increasing bonding curve and charges 1% platform BNB tax.
 * - After launch, platform tax is disabled and LP tokens are sent to burn address.
 * - Project mechanism tax pays marketing in BNB, auto-pays holder dividends, and returns LP tax to the pool.
 * - Burn allocation reduces token supply instead of sending project tokens to wallets.
 */
contract FourBscLaunchpad {
    uint256 public constant TOKEN_SUPPLY = 10_000 ether;
    uint256 public constant MIN_WALLET_CAP = 1 ether;
    uint256 public constant MAX_WALLET_CAP = 100 ether;
    uint256 public constant MIN_LAUNCH_THRESHOLD = 0.05 ether;
    uint256 public constant MAX_LAUNCH_THRESHOLD = 8 ether;
    uint16 public constant PLATFORM_TAX_BPS = 100;
    uint16 public constant BPS_DENOMINATOR = 10_000;
    uint16 public constant CURVE_BASE_BPS = 5_000;
    uint16 public constant CURVE_SLOPE_BPS = 20_000;
    uint16 public constant MIN_PROJECT_TAX_BPS = 100;
    uint16 public constant MAX_PROJECT_TAX_BPS = 1_000;
    uint256 public constant MIN_DIVIDEND_HOLDING = 1 ether;
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    struct TaxAllocation {
        uint16 marketingBps;
        uint16 burnBps;
        uint16 dividendBps;
        uint16 lpTreasuryBps;
    }

    struct ProjectConfig {
        string tokenName;
        string tokenSymbol;
        bool walletCapEnabled;
        uint256 walletCapTokens;
        uint256 launchThresholdBnb;
        address marketingWallet;
    }

    struct ProjectTaxConfig {
        bool taxEnabled;
        uint16 projectTaxBps;
        TaxAllocation allocation;
    }

    struct Project {
        address token;
        address creator;
        address marketingWallet;
        uint256 walletCap;
        uint256 launchThreshold;
        uint256 bnbRaised;
        uint256 tokensSold;
        uint256 tokensBurned;
        bool taxEnabled;
        uint16 projectTaxBps;
        bool launched;
        TaxAllocation taxAllocation;
    }

    IPancakeV2Router public pancakeRouter;
    address public owner;
    address public platformFeeWallet;
    uint256 public projectCount;
    bool private locked;

    mapping(uint256 => Project) private projects;
    mapping(address => uint256) private tokenProjectIdPlusOne;
    mapping(uint256 => mapping(address => uint256)) public walletPurchased;
    mapping(uint256 => address[]) private dividendHolders;
    mapping(uint256 => mapping(address => uint256)) private dividendHolderIndexPlusOne;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PlatformFeeWalletUpdated(address indexed previousWallet, address indexed newWallet);
    event PancakeRouterUpdated(address indexed previousRouter, address indexed newRouter);
    event ProjectCreated(
        uint256 indexed projectId,
        address indexed creator,
        address indexed token,
        uint256 walletCap,
        uint256 launchThreshold
    );
    event InternalBuy(uint256 indexed projectId, address indexed buyer, uint256 tokenAmount, uint256 bnbPaid, uint256 platformTax);
    event InternalSell(uint256 indexed projectId, address indexed seller, uint256 tokenAmount, uint256 bnbReturned, uint256 platformTax);
    event ProjectBnbTaxDistributed(
        uint256 indexed projectId,
        uint256 marketingAmount,
        uint256 dividendAmount,
        uint256 lpAmount
    );
    event ProjectHolderDividendsPaid(
        uint256 indexed projectId,
        uint256 totalAmount,
        uint256 paidAmount,
        uint256 lpFallbackAmount,
        uint256 holderCount
    );
    event ProjectTokensBurned(uint256 indexed projectId, uint256 tokenAmount);
    event ProjectLaunched(uint256 indexed projectId, address indexed token, uint256 tokenAmount, uint256 bnbAmount);
    event ProjectTokenOwnershipRenounced(uint256 indexed projectId, address indexed token);
    event ProjectLaunchRescued(
        uint256 indexed projectId,
        address indexed token,
        address indexed receiver,
        uint256 tokenAmount,
        uint256 bnbAmount
    );
    event ProjectTaxAllocation(
        uint256 indexed projectId,
        uint16 marketingBps,
        uint16 burnBps,
        uint16 dividendBps,
        uint16 lpTreasuryBps
    );
    event ProjectVanitySalt(uint256 indexed projectId, bytes32 indexed userSalt, address indexed token);

    modifier onlyOwner() {
        require(msg.sender == owner, "LAUNCHPAD: only owner");
        _;
    }

    modifier projectExists(uint256 projectId) {
        require(projectId < projectCount, "LAUNCHPAD: bad project");
        _;
    }

    modifier nonReentrant() {
        require(!locked, "LAUNCHPAD: reentrant");
        locked = true;
        _;
        locked = false;
    }

    constructor(address router, address initialPlatformFeeWallet) {
        require(router != address(0), "LAUNCHPAD: zero router");
        require(initialPlatformFeeWallet != address(0), "LAUNCHPAD: zero platform wallet");
        pancakeRouter = IPancakeV2Router(router);
        owner = msg.sender;
        platformFeeWallet = initialPlatformFeeWallet;
        emit OwnershipTransferred(address(0), msg.sender);
        emit PlatformFeeWalletUpdated(address(0), initialPlatformFeeWallet);
        emit PancakeRouterUpdated(address(0), router);
    }

    receive() external payable {}

    function createProject(
        ProjectConfig calldata config,
        ProjectTaxConfig calldata taxConfig
    ) external returns (uint256 projectId, address token) {
        return _createProject(config, taxConfig, bytes32(0), false);
    }

    function createProjectVanity(
        ProjectConfig calldata config,
        ProjectTaxConfig calldata taxConfig,
        bytes32 userSalt
    ) external returns (uint256 projectId, address token) {
        (projectId, token) = _createProject(config, taxConfig, _scopedSalt(msg.sender, userSalt), true);
        emit ProjectVanitySalt(projectId, userSalt, token);
    }

    function predictTokenAddress(
        string calldata tokenName,
        string calldata tokenSymbol,
        bytes32 userSalt,
        address creator
    ) external view returns (address) {
        return _predictTokenAddress(tokenName, tokenSymbol, _scopedSalt(creator, userSalt));
    }

    function launchpadTokenInitCodeHash(
        string calldata tokenName,
        string calldata tokenSymbol
    ) external view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                type(LaunchpadToken).creationCode,
                abi.encode(tokenName, tokenSymbol, TOKEN_SUPPLY, address(this))
            )
        );
    }

    function _createProject(
        ProjectConfig calldata config,
        ProjectTaxConfig calldata taxConfig,
        bytes32 salt,
        bool requireVanity
    ) private returns (uint256 projectId, address token) {
        uint256 walletCap = config.walletCapTokens * 1 ether;
        uint256 launchThreshold = config.launchThresholdBnb;
        if (config.walletCapEnabled) {
            require(walletCap >= MIN_WALLET_CAP && walletCap <= MAX_WALLET_CAP, "LAUNCHPAD: cap 1-100");
        } else {
            require(config.walletCapTokens == 0, "LAUNCHPAD: disabled cap");
            walletCap = 0;
        }
        require(launchThreshold >= MIN_LAUNCH_THRESHOLD && launchThreshold <= MAX_LAUNCH_THRESHOLD, "LAUNCHPAD: threshold 0.05-8");
        _validateTaxSettings(taxConfig.taxEnabled, taxConfig.projectTaxBps, taxConfig.allocation);
        if (taxConfig.taxEnabled && taxConfig.allocation.marketingBps > 0) {
            require(config.marketingWallet != address(0), "LAUNCHPAD: zero marketing wallet");
        }

        if (requireVanity) {
            token = _predictTokenAddress(config.tokenName, config.tokenSymbol, salt);
            require(_hasVanitySuffix(token), "LAUNCHPAD: token suffix");
            token = address(new LaunchpadToken{salt: salt}(config.tokenName, config.tokenSymbol, TOKEN_SUPPLY, address(this)));
        } else {
            token = address(new LaunchpadToken(config.tokenName, config.tokenSymbol, TOKEN_SUPPLY, address(this)));
        }
        projectId = _storeProject(config, taxConfig, token, walletCap, launchThreshold);

        emit ProjectCreated(projectId, msg.sender, token, walletCap, launchThreshold);
        emit ProjectTaxAllocation(
            projectId,
            taxConfig.allocation.marketingBps,
            taxConfig.allocation.burnBps,
            taxConfig.allocation.dividendBps,
            taxConfig.allocation.lpTreasuryBps
        );
    }

    function _scopedSalt(address creator, bytes32 userSalt) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(creator, userSalt));
    }

    function _predictTokenAddress(
        string memory tokenName,
        string memory tokenSymbol,
        bytes32 salt
    ) private view returns (address) {
        bytes32 initCodeHash = keccak256(
            abi.encodePacked(
                type(LaunchpadToken).creationCode,
                abi.encode(tokenName, tokenSymbol, TOKEN_SUPPLY, address(this))
            )
        );
        bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, initCodeHash));
        return address(uint160(uint256(hash)));
    }

    function _hasVanitySuffix(address account) private pure returns (bool) {
        return uint160(account) & 0xffff == 0;
    }

    function _storeProject(
        ProjectConfig calldata config,
        ProjectTaxConfig calldata taxConfig,
        address token,
        uint256 walletCap,
        uint256 launchThreshold
    ) private returns (uint256 projectId) {
        projectId = projectCount;
        Project storage project = projects[projectId];
        project.token = token;
        project.creator = msg.sender;
        project.marketingWallet = taxConfig.taxEnabled && taxConfig.allocation.marketingBps > 0
            ? config.marketingWallet
            : address(0);
        project.walletCap = walletCap;
        project.launchThreshold = launchThreshold;
        project.taxEnabled = taxConfig.taxEnabled;
        project.projectTaxBps = taxConfig.taxEnabled ? taxConfig.projectTaxBps : 0;
        project.taxAllocation = taxConfig.allocation;
        tokenProjectIdPlusOne[token] = projectId + 1;

        unchecked {
            projectCount += 1;
        }
    }

    function buy(uint256 projectId, uint256 tokenAmount) external payable projectExists(projectId) nonReentrant {
        Project storage project = projects[projectId];
        require(!project.launched, "LAUNCHPAD: launched");
        require(tokenAmount > 0, "LAUNCHPAD: zero amount");
        uint256 burnAmount = _burnAmount(project, tokenAmount);
        require(project.tokensSold + project.tokensBurned + tokenAmount + burnAmount <= TOKEN_SUPPLY, "LAUNCHPAD: sold out");
        if (project.walletCap > 0) {
            require(walletPurchased[projectId][msg.sender] + tokenAmount <= project.walletCap, "LAUNCHPAD: wallet cap");
        }

        uint256 grossCost = quoteBuy(projectId, tokenAmount);
        require(msg.value >= grossCost, "LAUNCHPAD: insufficient BNB");

        uint256 platformTax = (grossCost * PLATFORM_TAX_BPS) / BPS_DENOMINATOR;
        uint256 projectBnbTax = _projectBnbTax(project, grossCost);
        uint256 poolAmount = grossCost - platformTax - projectBnbTax;
        project.bnbRaised += poolAmount;
        project.tokensSold += tokenAmount;
        project.tokensBurned += burnAmount;
        walletPurchased[projectId][msg.sender] += tokenAmount;

        _sendValue(platformFeeWallet, platformTax);
        _processProjectBnbTax(projectId, project, grossCost);
        if (msg.value > grossCost) {
            _sendValue(msg.sender, msg.value - grossCost);
        }

        if (burnAmount > 0) {
            LaunchpadToken(project.token).launchpadBurn(burnAmount);
            emit ProjectTokensBurned(projectId, burnAmount);
        }
        LaunchpadToken(project.token).launchpadTransferTo(msg.sender, tokenAmount);
        emit InternalBuy(projectId, msg.sender, tokenAmount, grossCost, platformTax);
    }

    function sell(uint256 projectId, uint256 tokenAmount) external projectExists(projectId) nonReentrant {
        Project storage project = projects[projectId];
        require(!project.launched, "LAUNCHPAD: launched");
        require(tokenAmount > 0, "LAUNCHPAD: zero amount");

        uint256 grossReturn = quoteSell(projectId, tokenAmount);
        require(project.bnbRaised >= grossReturn, "LAUNCHPAD: pool balance");

        LaunchpadToken(project.token).transferFrom(msg.sender, address(this), tokenAmount);

        uint256 platformTax = (grossReturn * PLATFORM_TAX_BPS) / BPS_DENOMINATOR;
        uint256 projectBnbTax = _projectBnbTax(project, grossReturn);
        uint256 sellerReturn = grossReturn - platformTax - projectBnbTax;
        project.bnbRaised -= grossReturn;
        project.tokensSold -= tokenAmount;

        uint256 purchased = walletPurchased[projectId][msg.sender];
        walletPurchased[projectId][msg.sender] = purchased > tokenAmount ? purchased - tokenAmount : 0;

        _sendValue(platformFeeWallet, platformTax);
        _processProjectBnbTax(projectId, project, grossReturn);
        _sendValue(msg.sender, sellerReturn);
        emit InternalSell(projectId, msg.sender, tokenAmount, sellerReturn, platformTax);
    }

    function launchToPancake(uint256 projectId) external projectExists(projectId) nonReentrant {
        Project storage project = projects[projectId];
        require(msg.sender == project.creator || msg.sender == owner, "LAUNCHPAD: only creator");
        require(!project.launched, "LAUNCHPAD: already launched");
        require(project.bnbRaised >= project.launchThreshold, "LAUNCHPAD: threshold not met");

        uint256 tokenAmount = LaunchpadToken(project.token).balanceOf(address(this));
        uint256 bnbAmount = project.bnbRaised;
        require(tokenAmount > 0 && bnbAmount > 0, "LAUNCHPAD: empty liquidity");

        project.launched = true;
        project.bnbRaised = 0;

        LaunchpadToken(project.token).approve(address(pancakeRouter), tokenAmount);
        pancakeRouter.addLiquidityETH{value: bnbAmount}(
            project.token,
            tokenAmount,
            0,
            0,
            BURN_ADDRESS,
            block.timestamp + 900
        );
        LaunchpadToken(project.token).launchpadRenounceOwnership();

        emit ProjectLaunched(projectId, project.token, tokenAmount, bnbAmount);
        emit ProjectTokenOwnershipRenounced(projectId, project.token);
    }

    function confirmExternalLaunchAndRenounceByToken(address token) external onlyOwner nonReentrant {
        uint256 projectId = _projectIdByToken(token);
        _confirmExternalLaunchAndRenounce(projectId);
    }

    function confirmExternalLaunchAndRenounce(uint256 projectId) external onlyOwner projectExists(projectId) nonReentrant {
        _confirmExternalLaunchAndRenounce(projectId);
    }

    function rescueLaunchLiquidity(
        uint256 projectId,
        address receiver
    ) external onlyOwner projectExists(projectId) nonReentrant {
        _rescueLaunchLiquidity(projectId, receiver);
    }

    function rescueLaunchLiquidityByToken(
        address token,
        address receiver
    ) external onlyOwner nonReentrant {
        uint256 projectId = _projectIdByToken(token);
        _rescueLaunchLiquidity(projectId, receiver);
    }

    function _rescueLaunchLiquidity(uint256 projectId, address receiver) private {
        require(receiver != address(0), "LAUNCHPAD: zero receiver");
        Project storage project = projects[projectId];
        require(!project.launched, "LAUNCHPAD: already launched");
        require(project.bnbRaised >= project.launchThreshold, "LAUNCHPAD: threshold not met");

        uint256 tokenAmount = LaunchpadToken(project.token).balanceOf(address(this));
        uint256 bnbAmount = project.bnbRaised;
        require(tokenAmount > 0 && bnbAmount > 0, "LAUNCHPAD: empty liquidity");

        project.launched = true;
        project.bnbRaised = 0;

        LaunchpadToken(project.token).launchpadTransferTo(receiver, tokenAmount);
        _sendValue(receiver, bnbAmount);

        emit ProjectLaunchRescued(projectId, project.token, receiver, tokenAmount, bnbAmount);
        emit ProjectLaunched(projectId, project.token, tokenAmount, bnbAmount);
    }

    function _confirmExternalLaunchAndRenounce(uint256 projectId) private {
        Project storage project = projects[projectId];
        require(project.launched, "LAUNCHPAD: not launched");
        LaunchpadToken(project.token).launchpadRenounceOwnership();
        emit ProjectTokenOwnershipRenounced(projectId, project.token);
    }

    function _projectIdByToken(address token) private view returns (uint256) {
        uint256 projectIdPlusOne = tokenProjectIdPlusOne[token];
        require(projectIdPlusOne > 0, "LAUNCHPAD: unknown token");
        return projectIdPlusOne - 1;
    }

    function setPancakeRouter(address newRouter) external onlyOwner {
        require(newRouter != address(0), "LAUNCHPAD: zero router");
        address previous = address(pancakeRouter);
        pancakeRouter = IPancakeV2Router(newRouter);
        emit PancakeRouterUpdated(previous, newRouter);
    }

    function setPlatformFeeWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "LAUNCHPAD: zero wallet");
        address previous = platformFeeWallet;
        platformFeeWallet = newWallet;
        emit PlatformFeeWalletUpdated(previous, newWallet);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "LAUNCHPAD: zero owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function quoteBuy(uint256 projectId, uint256 tokenAmount) public view projectExists(projectId) returns (uint256) {
        Project storage project = projects[projectId];
        uint256 taxBps = PLATFORM_TAX_BPS + _bnbProjectTaxBps(project);
        uint256 poolAmount = _curvePoolAmount(project.launchThreshold, project.tokensSold, tokenAmount);
        return _ceilDiv(poolAmount * BPS_DENOMINATOR, BPS_DENOMINATOR - taxBps);
    }

    function quoteSell(uint256 projectId, uint256 tokenAmount) public view projectExists(projectId) returns (uint256) {
        Project storage project = projects[projectId];
        require(tokenAmount <= project.tokensSold, "LAUNCHPAD: sell amount");
        return _curvePoolAmount(project.launchThreshold, project.tokensSold - tokenAmount, tokenAmount);
    }

    function _curvePoolAmount(
        uint256 launchThreshold,
        uint256 startSold,
        uint256 tokenAmount
    ) private pure returns (uint256) {
        if (tokenAmount == 0) {
            return 0;
        }
        uint256 endSold = startSold + tokenAmount;
        require(endSold <= TOKEN_SUPPLY, "LAUNCHPAD: sold out");

        uint256 baseAmount =
            (tokenAmount * launchThreshold * CURVE_BASE_BPS) /
            (TOKEN_SUPPLY * BPS_DENOMINATOR);
        uint256 area = (endSold * endSold) - (startSold * startSold);
        uint256 slopeAmount =
            (launchThreshold * CURVE_SLOPE_BPS * area) /
            (2 * TOKEN_SUPPLY * TOKEN_SUPPLY * BPS_DENOMINATOR);

        return baseAmount + slopeAmount;
    }

    function _ceilDiv(uint256 numerator, uint256 denominator) private pure returns (uint256) {
        return numerator == 0 ? 0 : ((numerator - 1) / denominator) + 1;
    }

    function getProjectBasics(uint256 projectId) external view projectExists(projectId) returns (
        address token,
        address creator,
        uint256 walletCap,
        uint256 launchThreshold,
        uint256 bnbRaised,
        uint256 tokensSold,
        bool launched,
        bool taxEnabled,
        uint16 projectTaxBps
    ) {
        Project storage project = projects[projectId];
        return (
            project.token,
            project.creator,
            project.walletCap,
            project.launchThreshold,
            project.bnbRaised,
            project.tokensSold,
            project.launched,
            project.taxEnabled,
            project.projectTaxBps
        );
    }

    function afterTokenTransfer(address from, address to) external {
        uint256 projectIdPlusOne = tokenProjectIdPlusOne[msg.sender];
        require(projectIdPlusOne != 0, "LAUNCHPAD: unknown token");
        uint256 projectId = projectIdPlusOne - 1;
        _refreshDividendHolder(projectId, from);
        _refreshDividendHolder(projectId, to);
    }

    function _validateTaxSettings(
        bool taxEnabled,
        uint16 projectTaxBps,
        TaxAllocation calldata allocation
    ) private pure {
        uint256 total = uint256(allocation.marketingBps)
            + uint256(allocation.burnBps)
            + uint256(allocation.dividendBps)
            + uint256(allocation.lpTreasuryBps);
        if (!taxEnabled) {
            require(projectTaxBps == 0, "LAUNCHPAD: disabled tax bps");
            require(total == 0, "LAUNCHPAD: disabled allocation");
            return;
        }
        require(projectTaxBps >= MIN_PROJECT_TAX_BPS && projectTaxBps <= MAX_PROJECT_TAX_BPS, "LAUNCHPAD: tax 1-10%");
        require(total == BPS_DENOMINATOR, "LAUNCHPAD: allocation must be 100%");
    }

    function _bnbProjectTaxBps(Project storage project) private view returns (uint256) {
        if (!project.taxEnabled) {
            return 0;
        }
        TaxAllocation memory allocation = project.taxAllocation;
        uint256 bnbAllocationBps = uint256(allocation.marketingBps)
            + uint256(allocation.dividendBps)
            + uint256(allocation.lpTreasuryBps);
        return (uint256(project.projectTaxBps) * bnbAllocationBps) / BPS_DENOMINATOR;
    }

    function _burnAmount(Project storage project, uint256 tokenAmount) private view returns (uint256) {
        if (!project.taxEnabled) {
            return 0;
        }
        return (tokenAmount * project.projectTaxBps * project.taxAllocation.burnBps)
            / uint256(BPS_DENOMINATOR)
            / uint256(BPS_DENOMINATOR);
    }

    function _projectBnbTax(Project storage project, uint256 grossBnbAmount) private view returns (uint256) {
        if (!project.taxEnabled) {
            return 0;
        }
        return (grossBnbAmount * _bnbProjectTaxBps(project)) / BPS_DENOMINATOR;
    }

    function _processProjectBnbTax(
        uint256 projectId,
        Project storage project,
        uint256 grossBnbAmount
    ) private {
        if (!project.taxEnabled) {
            return;
        }
        TaxAllocation memory allocation = project.taxAllocation;
        uint256 marketingAmount = (grossBnbAmount * project.projectTaxBps * allocation.marketingBps)
            / uint256(BPS_DENOMINATOR)
            / uint256(BPS_DENOMINATOR);
        uint256 dividendAmount = (grossBnbAmount * project.projectTaxBps * allocation.dividendBps)
            / uint256(BPS_DENOMINATOR)
            / uint256(BPS_DENOMINATOR);
        uint256 lpAmount = (grossBnbAmount * project.projectTaxBps * allocation.lpTreasuryBps)
            / uint256(BPS_DENOMINATOR)
            / uint256(BPS_DENOMINATOR);

        project.bnbRaised += lpAmount;
        _sendValue(project.marketingWallet, marketingAmount);
        _payHolderDividends(projectId, project, dividendAmount);
        emit ProjectBnbTaxDistributed(projectId, marketingAmount, dividendAmount, lpAmount);
    }

    function _payHolderDividends(uint256 projectId, Project storage project, uint256 amount) private {
        if (amount == 0) {
            return;
        }
        address[] storage holders = dividendHolders[projectId];
        uint256 holderCount = holders.length;
        if (holderCount == 0) {
            project.bnbRaised += amount;
            emit ProjectHolderDividendsPaid(projectId, amount, 0, amount, 0);
            return;
        }

        LaunchpadToken token = LaunchpadToken(project.token);
        uint256 eligibleSupply = 0;
        for (uint256 i = 0; i < holderCount; ) {
            eligibleSupply += token.balanceOf(holders[i]);
            unchecked {
                i += 1;
            }
        }

        if (eligibleSupply == 0) {
            project.bnbRaised += amount;
            emit ProjectHolderDividendsPaid(projectId, amount, 0, amount, holderCount);
            return;
        }

        uint256 paidAmount = 0;
        for (uint256 i = 0; i < holderCount; ) {
            address holder = holders[i];
            uint256 share = (amount * token.balanceOf(holder)) / eligibleSupply;
            if (_trySendValue(holder, share)) {
                paidAmount += share;
            }
            unchecked {
                i += 1;
            }
        }

        uint256 dust = amount - paidAmount;
        project.bnbRaised += dust;
        emit ProjectHolderDividendsPaid(projectId, amount, paidAmount, dust, holderCount);
    }

    function _refreshDividendHolder(uint256 projectId, address account) private {
        if (account == address(0) || account == address(this) || account == BURN_ADDRESS) {
            return;
        }
        Project storage project = projects[projectId];
        bool isEligible = LaunchpadToken(project.token).balanceOf(account) >= MIN_DIVIDEND_HOLDING;
        bool isTracked = dividendHolderIndexPlusOne[projectId][account] != 0;
        if (isEligible && !isTracked) {
            dividendHolders[projectId].push(account);
            dividendHolderIndexPlusOne[projectId][account] = dividendHolders[projectId].length;
            return;
        }
        if (!isEligible && isTracked) {
            _removeDividendHolder(projectId, account);
        }
    }

    function _removeDividendHolder(uint256 projectId, address account) private {
        uint256 indexPlusOne = dividendHolderIndexPlusOne[projectId][account];
        if (indexPlusOne == 0) {
            return;
        }
        address[] storage holders = dividendHolders[projectId];
        uint256 index = indexPlusOne - 1;
        uint256 lastIndex = holders.length - 1;
        if (index != lastIndex) {
            address lastHolder = holders[lastIndex];
            holders[index] = lastHolder;
            dividendHolderIndexPlusOne[projectId][lastHolder] = index + 1;
        }
        holders.pop();
        delete dividendHolderIndexPlusOne[projectId][account];
    }

    function _sendValue(address to, uint256 amount) private {
        if (amount == 0) {
            return;
        }
        (bool ok, ) = payable(to).call{value: amount}("");
        require(ok, "LAUNCHPAD: BNB transfer failed");
    }

    function _trySendValue(address to, uint256 amount) private returns (bool) {
        if (amount == 0) {
            return true;
        }
        (bool ok, ) = payable(to).call{value: amount}("");
        return ok;
    }
}
