// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPancakeV2Router {
    function WETH() external pure returns (address);

    function factory() external view returns (address);

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 amountLiquidity);

    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;
}

interface IPancakeV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

/**
 * @title LaunchpadToken
 * @notice Minimal BEP20/ERC20 token used by FourBscLaunchpad projects.
 * The launchpad mints the fixed 10,000 token supply to itself on creation.
 */
contract LaunchpadToken {
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    uint16 private constant BPS_DENOMINATOR = 10_000;
    uint256 private constant MIN_DIVIDEND_HOLDING = 1 ether;
    uint256 private constant DIVIDEND_MAGNITUDE = 2 ** 128;
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    address public immutable launchpad;
    address public owner;
    address public externalLpPair;
    address public externalLpReceiver;
    uint16 public externalLpTaxBps;
    uint256 public externalLpTokenThreshold;
    bool public externalLpEnabled;
    bool private swapping;
    IPancakeV2Router private externalLpRouter;
    uint256 public magnifiedDividendPerShare;
    uint256 public totalDividendsDistributed;
    uint256 public pendingDividendReserve;
    uint256 public eligibleDividendSupply;
    uint256 public lastProcessedDividendIndex;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    mapping(address => uint256) private _trackedDividendBalances;
    mapping(address => uint256) private _withdrawnDividends;
    mapping(address => int256) private _magnifiedDividendCorrections;
    address[] private _dividendHolders;
    mapping(address => uint256) private _dividendHolderIndexPlusOne;

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ExternalLpConfigured(
        address indexed router,
        address indexed pair,
        address indexed receiver,
        uint16 taxBps,
        uint256 tokenThreshold
    );
    event ExternalAutoLiquidityAdded(
        uint256 swapTokenAmount,
        uint256 liquidityTokenAmount,
        uint256 bnbAmount,
        uint256 liquidityAmount
    );
    event HolderDividendsDeposited(uint256 amount, uint256 distributedAmount, uint256 reserveAmount);
    event HolderDividendClaimed(address indexed account, uint256 amount, bool automatic);

    receive() external payable {}

    modifier onlyLaunchpad() {
        require(msg.sender == launchpad, "T:LP");
        _;
    }

    constructor(string memory tokenName, string memory tokenSymbol, uint256 supply, address launchpadAddress) {
        require(launchpadAddress != address(0), "T:ZLP");
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
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = _allowances[from][msg.sender];
        require(allowed >= amount, "T:ALL");
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
        _transfer(launchpad, BURN_ADDRESS, amount);
        return true;
    }

    function launchpadRenounceOwnership() external onlyLaunchpad returns (bool) {
        address previousOwner = owner;
        owner = address(0);
        emit OwnershipTransferred(previousOwner, address(0));
        return true;
    }

    function launchpadConfigureExternalLp(
        address router,
        address pair,
        address receiver,
        uint16 taxBps,
        uint256 tokenThreshold
    ) external onlyLaunchpad returns (bool) {
        require(router != address(0), "T:ZR");
        require(pair != address(0), "T:ZP");
        require(receiver != address(0), "T:ZW");
        require(taxBps <= BPS_DENOMINATOR, "T:TB");
        require(tokenThreshold > 0, "T:ZT");

        externalLpRouter = IPancakeV2Router(router);
        externalLpPair = pair;
        externalLpReceiver = receiver;
        externalLpTaxBps = taxBps;
        externalLpTokenThreshold = tokenThreshold;
        externalLpEnabled = taxBps > 0;
        _syncDividendAccount(pair);

        emit ExternalLpConfigured(router, pair, receiver, taxBps, tokenThreshold);
        return true;
    }

    function launchpadDepositHolderDividends() external payable onlyLaunchpad returns (bool) {
        uint256 amount = msg.value;
        if (amount == 0) {
            return true;
        }

        uint256 trackedSupply = eligibleDividendSupply;
        if (trackedSupply == 0) {
            pendingDividendReserve += amount;
            emit HolderDividendsDeposited(amount, 0, amount);
            return true;
        }

        uint256 reserveAmount = pendingDividendReserve;
        if (reserveAmount > 0) {
            amount += reserveAmount;
            pendingDividendReserve = 0;
        }

        uint256 perShareIncrease = (amount * DIVIDEND_MAGNITUDE) / trackedSupply;
        if (perShareIncrease == 0) {
            pendingDividendReserve += amount;
            emit HolderDividendsDeposited(amount, 0, amount);
            return true;
        }

        uint256 distributedAmount = (perShareIncrease * trackedSupply) / DIVIDEND_MAGNITUDE;
        uint256 dust = amount - distributedAmount;
        magnifiedDividendPerShare += perShareIncrease;
        totalDividendsDistributed += distributedAmount;
        pendingDividendReserve += dust;

        _processDividendClaims(6);
        emit HolderDividendsDeposited(amount, distributedAmount, dust);
        return true;
    }

    function withdrawableDividendOf(address account) external view returns (uint256) {
        uint256 accumulative = _accumulativeDividendOf(account);
        uint256 withdrawn = _withdrawnDividends[account];
        return accumulative > withdrawn ? accumulative - withdrawn : 0;
    }

    function claimDividend() external returns (uint256) {
        return _claimDividend(payable(msg.sender), false);
    }

    function _transfer(address from, address to, uint256 amount) private {
        require(to != address(0), "T:TO");
        uint256 balance = _balances[from];
        require(balance >= amount, "T:BAL");

        uint256 feeAmount = _takeExternalLpFee(from, to, amount);
        uint256 receivedAmount = amount - feeAmount;

        unchecked {
            _balances[from] = balance - amount;
            _balances[to] += receivedAmount;
        }
        if (feeAmount > 0) {
            _balances[address(this)] += feeAmount;
            emit Transfer(from, address(this), feeAmount);
        }
        emit Transfer(from, to, receivedAmount);
        _syncDividendAccount(from);
        _syncDividendAccount(to);
        _processDividendClaims(2);
        _maybeProcessExternalLp(to);
    }

    function _approve(address tokenOwner, address spender, uint256 amount) private {
        _allowances[tokenOwner][spender] = amount;
        emit Approval(tokenOwner, spender, amount);
    }

    function _takeExternalLpFee(address from, address to, uint256 amount) private view returns (uint256) {
        if (!externalLpEnabled || swapping || externalLpTaxBps == 0) {
            return 0;
        }
        if (from == address(this) || to == address(this)) {
            return 0;
        }
        if (to != externalLpPair) {
            return 0;
        }
        return (amount * externalLpTaxBps) / BPS_DENOMINATOR;
    }

    function _maybeProcessExternalLp(address to) private {
        if (!externalLpEnabled || swapping || to != externalLpPair) {
            return;
        }
        uint256 threshold = externalLpTokenThreshold;
        uint256 contractTokenBalance = _balances[address(this)];
        if (threshold == 0 || contractTokenBalance < threshold) {
            return;
        }

        uint256 liquidityTokens = threshold;
        uint256 swapAmount = liquidityTokens / 2;
        uint256 liquidityTokenAmount = liquidityTokens - swapAmount;
        if (swapAmount == 0 || liquidityTokenAmount == 0) {
            return;
        }

        swapping = true;

        _approve(address(this), address(externalLpRouter), swapAmount);
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = externalLpRouter.WETH();
        uint256 bnbBefore = address(this).balance;
        externalLpRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(
            swapAmount,
            0,
            path,
            address(this),
            block.timestamp + 900
        );
        uint256 bnbReceived = address(this).balance - bnbBefore;

        uint256 liquidityAmount = 0;
        if (bnbReceived > 0) {
            _approve(address(this), address(externalLpRouter), liquidityTokenAmount);
            (, , liquidityAmount) = externalLpRouter.addLiquidityETH{value: bnbReceived}(
                address(this),
                liquidityTokenAmount,
                0,
                0,
                externalLpReceiver,
                block.timestamp + 900
            );
        }

        swapping = false;
        emit ExternalAutoLiquidityAdded(swapAmount, liquidityTokenAmount, bnbReceived, liquidityAmount);
    }

    function _syncDividendAccount(address account) private {
        if (account == address(0) || account == address(this) || account == BURN_ADDRESS || account == launchpad || account == externalLpPair) {
            _setTrackedDividendBalance(account, 0);
            _removeDividendHolder(account);
            return;
        }

        uint256 balance = _balances[account];
        bool isEligible = balance >= MIN_DIVIDEND_HOLDING;
        bool isTracked = _dividendHolderIndexPlusOne[account] != 0;
        if (isEligible && !isTracked) {
            _dividendHolders.push(account);
            _dividendHolderIndexPlusOne[account] = _dividendHolders.length;
        }
        if (!isEligible && isTracked) {
            _removeDividendHolder(account);
        }
        _setTrackedDividendBalance(account, isEligible ? balance : 0);
    }

    function _setTrackedDividendBalance(address account, uint256 newBalance) private {
        uint256 currentBalance = _trackedDividendBalances[account];
        if (newBalance == currentBalance) {
            return;
        }

        if (newBalance > currentBalance) {
            uint256 added = newBalance - currentBalance;
            _trackedDividendBalances[account] = newBalance;
            eligibleDividendSupply += added;
            _magnifiedDividendCorrections[account] -= _toInt256(magnifiedDividendPerShare * added);
        } else {
            uint256 removed = currentBalance - newBalance;
            _trackedDividendBalances[account] = newBalance;
            eligibleDividendSupply -= removed;
            _magnifiedDividendCorrections[account] += _toInt256(magnifiedDividendPerShare * removed);
        }
    }

    function _accumulativeDividendOf(address account) private view returns (uint256) {
        uint256 trackedBalance = _trackedDividendBalances[account];
        if (trackedBalance == 0) {
            return 0;
        }
        int256 corrected = _toInt256(magnifiedDividendPerShare * trackedBalance) + _magnifiedDividendCorrections[account];
        if (corrected <= 0) {
            return 0;
        }
        return uint256(corrected) / DIVIDEND_MAGNITUDE;
    }

    function _claimDividend(address payable account, bool automatic) private returns (uint256) {
        uint256 accumulative = _accumulativeDividendOf(account);
        uint256 withdrawn = _withdrawnDividends[account];
        if (accumulative <= withdrawn) {
            return 0;
        }

        uint256 amount = accumulative - withdrawn;
        _withdrawnDividends[account] = accumulative;
        (bool ok, ) = account.call{value: amount}("");
        if (!ok) {
            _withdrawnDividends[account] = withdrawn;
            return 0;
        }
        emit HolderDividendClaimed(account, amount, automatic);
        return amount;
    }

    function _processDividendClaims(uint256 maxAccounts) private {
        uint256 holderCount = _dividendHolders.length;
        if (holderCount == 0 || maxAccounts == 0) {
            return;
        }

        uint256 index = lastProcessedDividendIndex;
        uint256 count = maxAccounts > holderCount ? holderCount : maxAccounts;
        for (uint256 i = 0; i < count; ) {
            index = (index + 1) % holderCount;
            _claimDividend(payable(_dividendHolders[index]), true);
            unchecked {
                i += 1;
            }
        }
        lastProcessedDividendIndex = index;
    }

    function _removeDividendHolder(address account) private {
        uint256 indexPlusOne = _dividendHolderIndexPlusOne[account];
        if (indexPlusOne == 0) {
            return;
        }
        address[] storage holders = _dividendHolders;
        uint256 index = indexPlusOne - 1;
        uint256 lastIndex = holders.length - 1;
        if (index != lastIndex) {
            address lastHolder = holders[lastIndex];
            holders[index] = lastHolder;
            _dividendHolderIndexPlusOne[lastHolder] = index + 1;
        }
        holders.pop();
        delete _dividendHolderIndexPlusOne[account];
    }

    function _toInt256(uint256 value) private pure returns (int256) {
        require(value <= uint256(type(int256).max), "T:INT");
        return int256(value);
    }
}

/**
 * @title FourBscLaunchpad
 * @notice BSC meme launchpad prototype:
 * - Fixed project supply: 10,000 tokens.
 * - Creator chooses one-wallet buy cap from 1 to 100 tokens.
 * - Creator chooses manual launch threshold from 0.05 to 8 BNB in testing mode.
 * - Internal market buy/sell charges 1% platform BNB tax.
 * - After launch, platform tax is disabled and LP tokens are sent to a configurable receiver.
 * - Project mechanism tax pays marketing in BNB, auto-pays holder dividends, and returns LP tax to the pool.
 * - Burn allocation sends project tokens to the dead wallet while keeping total supply fixed.
 */
contract FourBscLaunchpad {
    uint256 public constant TOKEN_SUPPLY = 10_000 ether;
    uint256 public constant INTERNAL_SALE_SUPPLY = 8_000 ether;
    uint256 public constant LAUNCH_SOLD_FLOOR = 7_999 ether;
    uint256 public constant MIN_WALLET_CAP = 1 ether;
    uint256 public constant MAX_WALLET_CAP = 100 ether;
    uint256 public constant MIN_LAUNCH_THRESHOLD = 0.05 ether;
    uint256 public constant MAX_LAUNCH_THRESHOLD = 8 ether;
    uint16 public constant LAUNCH_SHORTFALL_BPS = 1;
    uint16 public constant PLATFORM_TAX_BPS = 100;
    uint16 public constant BPS_DENOMINATOR = 10_000;
    uint16 public constant CURVE_BASE_BPS = 5_000;
    uint16 public constant CURVE_SLOPE_BPS = 10_000;
    uint16 public constant MIN_PROJECT_TAX_BPS = 100;
    uint16 public constant MAX_PROJECT_TAX_BPS = 1_000;
    uint256 public constant MIN_DIVIDEND_HOLDING = 1 ether;
    uint256 public constant CREATE_PROTECTION_FEE = 0.01 ether;
    uint256 public constant EXTERNAL_LP_TOKEN_THRESHOLD = 5 ether;
    uint256 private constant DIVIDEND_MAGNITUDE = 2 ** 128;
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
        uint256 lpBnbBuffer;
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
    address public launchLpReceiver;
    uint256 public projectCount;
    bool private locked;

    mapping(uint256 => Project) private projects;
    mapping(address => uint256) private tokenProjectIdPlusOne;
    mapping(uint256 => mapping(address => uint256)) public walletPurchased;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PlatformFeeWalletUpdated(address indexed previousWallet, address indexed newWallet);
    event LaunchLpReceiverUpdated(address indexed previousReceiver, address indexed newReceiver);
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
    event ProjectExternalLpConfigured(
        uint256 indexed projectId,
        address indexed token,
        address indexed pair,
        uint16 taxBps,
        uint256 tokenThreshold
    );
    event ProjectHolderDividendsPaid(uint256 indexed projectId, uint256 totalAmount);
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
    event ProjectAutoLaunchFailed(uint256 indexed projectId, address indexed token, bytes errorData);
    event ProjectTaxAllocation(
        uint256 indexed projectId,
        uint16 marketingBps,
        uint16 burnBps,
        uint16 dividendBps,
        uint16 lpTreasuryBps
    );
    event ProjectVanitySalt(uint256 indexed projectId, bytes32 indexed userSalt, address indexed token);
    event CreateProtectionFeePaid(uint256 indexed projectId, address indexed creator, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "L:OWN");
        _;
    }

    modifier projectExists(uint256 projectId) {
        require(projectId < projectCount, "L:PID");
        _;
    }

    modifier nonReentrant() {
        require(!locked, "L:LOCK");
        locked = true;
        _;
        locked = false;
    }

    constructor(address router, address initialPlatformFeeWallet) {
        require(router != address(0), "L:ZR");
        require(initialPlatformFeeWallet != address(0), "L:ZW");
        pancakeRouter = IPancakeV2Router(router);
        owner = msg.sender;
        platformFeeWallet = initialPlatformFeeWallet;
        launchLpReceiver = initialPlatformFeeWallet;
        emit OwnershipTransferred(address(0), msg.sender);
        emit PlatformFeeWalletUpdated(address(0), initialPlatformFeeWallet);
        emit LaunchLpReceiverUpdated(address(0), initialPlatformFeeWallet);
        emit PancakeRouterUpdated(address(0), router);
    }

    receive() external payable {}

    function createProjectVanityAndBuy(
        ProjectConfig calldata config,
        ProjectTaxConfig calldata taxConfig,
        bytes32 userSalt,
        uint256 initialBuyTokenAmount
    ) external payable nonReentrant returns (uint256 projectId, address token) {
        (projectId, token) = _createProject(config, taxConfig, _scopedSalt(msg.sender, userSalt), true);
        emit ProjectVanitySalt(projectId, userSalt, token);

        uint256 buyValue = _chargeCreateProtectionFee(projectId, msg.value);
        if (initialBuyTokenAmount > 0) {
            _buyInternal(projectId, msg.sender, initialBuyTokenAmount, buyValue);
        } else if (buyValue > 0) {
            _sendValue(msg.sender, buyValue);
        }
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
            require(walletCap >= MIN_WALLET_CAP && walletCap <= MAX_WALLET_CAP, "L:CAP");
        } else {
            require(config.walletCapTokens == 0, "L:DCAP");
            walletCap = 0;
        }
        require(launchThreshold >= MIN_LAUNCH_THRESHOLD && launchThreshold <= MAX_LAUNCH_THRESHOLD, "L:THR");
        _validateTaxSettings(taxConfig.taxEnabled, taxConfig.projectTaxBps, taxConfig.allocation);
        if (taxConfig.taxEnabled && taxConfig.allocation.marketingBps > 0) {
            require(config.marketingWallet != address(0), "L:MW");
        }

        if (requireVanity) {
            token = _predictTokenAddress(config.tokenName, config.tokenSymbol, salt);
            require(_hasVanitySuffix(token), "L:SUF");
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

    function _chargeCreateProtectionFee(uint256 projectId, uint256 bnbProvided) private returns (uint256 remainingBnb) {
        require(bnbProvided >= CREATE_PROTECTION_FEE, "L:FEE");
        _sendValue(platformFeeWallet, CREATE_PROTECTION_FEE);
        emit CreateProtectionFeePaid(projectId, msg.sender, CREATE_PROTECTION_FEE);
        return bnbProvided - CREATE_PROTECTION_FEE;
    }

    function buy(uint256 projectId, uint256 tokenAmount) external payable projectExists(projectId) nonReentrant {
        _buyInternal(projectId, msg.sender, tokenAmount, msg.value);
    }

    function _buyInternal(
        uint256 projectId,
        address buyer,
        uint256 tokenAmount,
        uint256 bnbProvided
    ) private projectExists(projectId) {
        Project storage project = projects[projectId];
        require(!project.launched, "L:LIVE");
        require(tokenAmount > 0, "L:AMT");
        uint256 burnAmount = _burnAmount(project, tokenAmount);
        require(project.tokensSold + tokenAmount <= INTERNAL_SALE_SUPPLY, "L:SOLD");
        require(project.tokensSold + project.tokensBurned + tokenAmount + burnAmount <= TOKEN_SUPPLY, "L:SOLD");
        if (project.walletCap > 0) {
            require(walletPurchased[projectId][buyer] + tokenAmount <= project.walletCap, "L:WCAP");
        }

        uint256 grossCost = quoteBuy(projectId, tokenAmount);
        require(bnbProvided >= grossCost, "L:BNB");

        uint256 platformTax = (grossCost * PLATFORM_TAX_BPS) / BPS_DENOMINATOR;
        uint256 projectBnbTax = _projectBnbTax(project, grossCost);
        uint256 poolAmount = grossCost - platformTax - projectBnbTax;
        project.bnbRaised += poolAmount;
        project.tokensSold += tokenAmount;
        project.tokensBurned += burnAmount;
        walletPurchased[projectId][buyer] += tokenAmount;

        _sendValue(platformFeeWallet, platformTax);
        _processProjectBnbTax(projectId, project, grossCost);
        if (bnbProvided > grossCost) {
            _sendValue(buyer, bnbProvided - grossCost);
        }

        if (burnAmount > 0) {
            LaunchpadToken(payable(project.token)).launchpadBurn(burnAmount);
            emit ProjectTokensBurned(projectId, burnAmount);
        }
        LaunchpadToken(payable(project.token)).launchpadTransferTo(buyer, tokenAmount);
        emit InternalBuy(projectId, buyer, tokenAmount, grossCost, platformTax);

        if (_isLaunchReady(project)) {
            _tryLaunchToPancake(projectId, project, false);
        }
    }

    function sell(uint256 projectId, uint256 tokenAmount) external projectExists(projectId) nonReentrant {
        Project storage project = projects[projectId];
        require(!project.launched, "L:LIVE");
        require(!_isLaunchReady(project), "L:RDY");
        require(tokenAmount > 0, "L:AMT");

        uint256 grossReturn = quoteSell(projectId, tokenAmount);
        require(project.bnbRaised >= grossReturn, "L:POOL");

        LaunchpadToken(payable(project.token)).transferFrom(msg.sender, address(this), tokenAmount);

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

    function launchToPancakeByToken(address token) external nonReentrant {
        uint256 projectId = _projectIdByToken(token);
        Project storage project = projects[projectId];
        require(msg.sender == project.creator || msg.sender == owner, "L:CRT");
        require(!project.launched, "L:LIVE");
        require(_isLaunchReady(project), "L:THM");

        bool launched = _tryLaunchToPancake(projectId, project, true);
        require(launched, "L:FAIL");
    }

    function _tryLaunchToPancake(
        uint256 projectId,
        Project storage project,
        bool revertOnFailure
    ) private returns (bool) {
        uint256 tokenAmount = LaunchpadToken(payable(project.token)).balanceOf(address(this));
        uint256 bnbAmount = project.bnbRaised + project.lpBnbBuffer;
        require(tokenAmount > 0 && bnbAmount > 0, "L:EMP");

        LaunchpadToken(payable(project.token)).approve(address(pancakeRouter), tokenAmount);
        try pancakeRouter.addLiquidityETH{value: bnbAmount}(
            project.token,
            tokenAmount,
            0,
            0,
            launchLpReceiver,
            block.timestamp + 900
        ) {
            project.launched = true;
            project.bnbRaised = 0;
            project.lpBnbBuffer = 0;
            _configureProjectExternalLp(projectId, project);
            LaunchpadToken(payable(project.token)).launchpadRenounceOwnership();

            emit ProjectLaunched(projectId, project.token, tokenAmount, bnbAmount);
            emit ProjectTokenOwnershipRenounced(projectId, project.token);
            return true;
        } catch (bytes memory errorData) {
            if (revertOnFailure) {
                return false;
            }
            emit ProjectAutoLaunchFailed(projectId, project.token, errorData);
            return false;
        }
    }

    function rescueLaunchLiquidityToPlatformByToken(address token) external onlyOwner nonReentrant {
        uint256 projectId = _projectIdByToken(token);
        _rescueLaunchLiquidity(projectId, platformFeeWallet);
    }

    function _rescueLaunchLiquidity(uint256 projectId, address receiver) private {
        require(receiver != address(0), "L:RCV");
        Project storage project = projects[projectId];
        require(!project.launched, "L:LIVE");
        require(_isLaunchReady(project), "L:THM");

        uint256 tokenAmount = LaunchpadToken(payable(project.token)).balanceOf(address(this));
        uint256 bnbAmount = project.bnbRaised + project.lpBnbBuffer;
        require(tokenAmount > 0 && bnbAmount > 0, "L:EMP");

        project.launched = true;
        project.bnbRaised = 0;
        project.lpBnbBuffer = 0;

        LaunchpadToken(payable(project.token)).launchpadTransferTo(receiver, tokenAmount);
        _sendValue(receiver, bnbAmount);

        emit ProjectLaunchRescued(projectId, project.token, receiver, tokenAmount, bnbAmount);
        emit ProjectLaunched(projectId, project.token, tokenAmount, bnbAmount);
    }

    function _configureProjectExternalLp(uint256 projectId, Project storage project) private {
        uint16 externalLpTaxBps = _externalLpTaxBps(project);
        if (externalLpTaxBps == 0) {
            return;
        }
        address pair = IPancakeV2Factory(pancakeRouter.factory()).getPair(project.token, pancakeRouter.WETH());
        require(pair != address(0), "L:PAIR");
        LaunchpadToken(payable(project.token)).launchpadConfigureExternalLp(
            address(pancakeRouter),
            pair,
            launchLpReceiver,
            externalLpTaxBps,
            EXTERNAL_LP_TOKEN_THRESHOLD
        );
        emit ProjectExternalLpConfigured(projectId, project.token, pair, externalLpTaxBps, EXTERNAL_LP_TOKEN_THRESHOLD);
    }

    function _confirmExternalLaunchAndRenounce(uint256 projectId) private {
        Project storage project = projects[projectId];
        require(project.launched, "L:NL");
        LaunchpadToken(payable(project.token)).launchpadRenounceOwnership();
        emit ProjectTokenOwnershipRenounced(projectId, project.token);
    }

    function _projectIdByToken(address token) private view returns (uint256) {
        uint256 projectIdPlusOne = tokenProjectIdPlusOne[token];
        require(projectIdPlusOne > 0, "L:TKN");
        return projectIdPlusOne - 1;
    }

    function setLaunchLpReceiver(address newReceiver) external onlyOwner {
        require(newReceiver != address(0), "L:ZLP");
        address previous = launchLpReceiver;
        launchLpReceiver = newReceiver;
        emit LaunchLpReceiverUpdated(previous, newReceiver);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "L:ZO");
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
        require(tokenAmount <= project.tokensSold, "L:SELL");
        return _curvePoolAmount(project.launchThreshold, project.tokensSold - tokenAmount, tokenAmount);
    }

    function _isLaunchReady(Project storage project) private view returns (bool) {
        if (project.bnbRaised >= project.launchThreshold) {
            return true;
        }
        if (project.tokensSold < LAUNCH_SOLD_FLOOR) {
            return false;
        }
        uint256 allowedShortfall = (project.launchThreshold * LAUNCH_SHORTFALL_BPS) / BPS_DENOMINATOR;
        return project.launchThreshold - project.bnbRaised <= allowedShortfall;
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
        require(endSold <= INTERNAL_SALE_SUPPLY, "L:SOLD");

        uint256 baseAmount =
            (tokenAmount * launchThreshold * CURVE_BASE_BPS) /
            (INTERNAL_SALE_SUPPLY * BPS_DENOMINATOR);
        uint256 area = (endSold * endSold) - (startSold * startSold);
        uint256 slopeAmount =
            (launchThreshold * CURVE_SLOPE_BPS * area) /
            (2 * INTERNAL_SALE_SUPPLY * INTERNAL_SALE_SUPPLY * BPS_DENOMINATOR);

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

    function getProjectLiquidityState(uint256 projectId) external view projectExists(projectId) returns (
        uint256 launchPoolBnb,
        uint256 lpBnbBuffer,
        uint16 externalLpTaxBps,
        uint256 externalLpTokenThreshold
    ) {
        Project storage project = projects[projectId];
        return (
            project.bnbRaised,
            project.lpBnbBuffer,
            _externalLpTaxBps(project),
            EXTERNAL_LP_TOKEN_THRESHOLD
        );
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
            require(projectTaxBps == 0, "L:DTB");
            require(total == 0, "L:DAL");
            return;
        }
        require(projectTaxBps >= MIN_PROJECT_TAX_BPS && projectTaxBps <= MAX_PROJECT_TAX_BPS, "L:TAX");
        require(total == BPS_DENOMINATOR, "L:ALC");
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

        project.lpBnbBuffer += lpAmount;
        if (marketingAmount > 0) {
            _sendValue(project.marketingWallet, marketingAmount);
        }
        if (dividendAmount > 0) {
            LaunchpadToken(payable(project.token)).launchpadDepositHolderDividends{value: dividendAmount}();
            emit ProjectHolderDividendsPaid(projectId, dividendAmount);
        }
        emit ProjectBnbTaxDistributed(projectId, marketingAmount, dividendAmount, lpAmount);
    }

    function _externalLpTaxBps(Project storage project) private view returns (uint16) {
        if (!project.taxEnabled) {
            return 0;
        }
        uint256 bps = (uint256(project.projectTaxBps) * uint256(project.taxAllocation.lpTreasuryBps)) / BPS_DENOMINATOR;
        if (bps > type(uint16).max) {
            return type(uint16).max;
        }
        return uint16(bps);
    }

    function _sendValue(address to, uint256 amount) private {
        if (amount == 0) {
            return;
        }
        (bool ok, ) = payable(to).call{value: amount}("");
        require(ok, "L:XFER");
    }

    function _trySendValue(address to, uint256 amount) private returns (bool) {
        if (amount == 0) {
            return true;
        }
        (bool ok, ) = payable(to).call{value: amount}("");
        return ok;
    }
}
