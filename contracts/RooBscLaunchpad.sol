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

error TErr(uint8 code);
error LErr(uint8 code);

/**
 * @title LaunchpadToken
 * @notice Minimal BEP20/ERC20 token used by RooBscLaunchpad projects.
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
    address immutable launchpad;
    address public owner;
    address private externalLpPair;
    address private externalLpReceiver;
    address private externalMarketingWallet;
    uint256 private externalWalletCap;
    uint16 private externalProjectTaxBps;
    uint16 private externalMarketingBps;
    uint16 private externalBurnBps;
    uint16 private externalDividendBps;
    uint16 private externalLpBps;
    uint256 private externalLpTokenThreshold;
    bool private externalLpEnabled;
    bool private externalLpProcessingEnabled;
    bool private swapping;
    IPancakeV2Router private externalLpRouter;
    uint256 public magnifiedDividendPerShare;
    uint256 public totalDividendsDistributed;
    uint256 private pendingDividendReserve;
    uint256 private reservedDividendBalance;
    uint256 private eligibleDividendSupply;
    uint32 private dividendEpoch;
    uint256 private pendingExternalMarketingTokens;
    uint256 private pendingExternalDividendTokens;
    uint256 private pendingExternalLpTokens;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    mapping(address => uint256) private _trackedDividendBalances;
    mapping(address => uint256) private _withdrawnDividends;
    mapping(address => int256) private _magnifiedDividendCorrections;
    mapping(address => uint32) private _dividendHolderEpoch;
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
    event ExternalLpFeesSwept(address indexed receiver, uint256 tokenAmount, uint256 bnbAmount);
    event ExternalProjectTaxProcessed(
        uint256 marketingTokenAmount,
        uint256 dividendTokenAmount,
        uint256 lpTokenAmount,
        uint256 marketingBnbAmount,
        uint256 dividendBnbAmount,
        uint256 lpBnbAmount,
        uint256 liquidityAmount
    );
    event HolderDividendsDeposited(uint256 amount, uint256 distributedAmount, uint256 reserveAmount);
    event HolderDividendClaimed(address indexed account, uint256 amount, bool automatic);

    receive() external payable {}

    modifier onlyLaunchpad() {
        if (msg.sender != launchpad) revert TErr(1);
        _;
    }

    constructor(string memory tokenName, string memory tokenSymbol, uint256 supply, address launchpadAddress) {
        if (launchpadAddress == address(0)) revert TErr(2);
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
        if (allowed < amount) revert TErr(3);
        if (allowed != type(uint256).max) {
            _allowances[from][msg.sender] = allowed - amount;
            emit Approval(from, msg.sender, _allowances[from][msg.sender]);
        }
        _transfer(from, to, amount);
        return true;
    }

    function launchpadTransferTo(address to, uint256 amount) external onlyLaunchpad {
        _transfer(launchpad, to, amount);
    }

    function launchpadBurn(uint256 amount) external onlyLaunchpad {
        _transfer(launchpad, BURN_ADDRESS, amount);
    }

    function launchpadRenounceOwnership() external onlyLaunchpad {
        address previousOwner = owner;
        owner = address(0);
        emit OwnershipTransferred(previousOwner, address(0));
    }

    function launchpadConfigureExternalLp(
        address router,
        address pair,
        address receiver,
        address marketingWallet,
        uint256 walletCap,
        uint16 projectTaxBps,
        uint16 marketingBps,
        uint16 burnBps,
        uint16 dividendBps,
        uint16 lpBps,
        uint256 tokenThreshold
    ) external onlyLaunchpad {
        if (router == address(0)) revert TErr(4);
        if (pair == address(0)) revert TErr(5);
        if (receiver == address(0)) revert TErr(6);
        if (projectTaxBps > BPS_DENOMINATOR) revert TErr(7);
        if (uint256(marketingBps) + uint256(burnBps) + uint256(dividendBps) + uint256(lpBps) != BPS_DENOMINATOR) {
            revert TErr(8);
        }
        if (marketingBps > 0 && marketingWallet == address(0)) revert TErr(9);
        if (tokenThreshold == 0) revert TErr(10);

        externalLpRouter = IPancakeV2Router(router);
        externalLpPair = pair;
        externalLpReceiver = receiver;
        externalMarketingWallet = marketingWallet;
        externalWalletCap = walletCap;
        externalProjectTaxBps = projectTaxBps;
        externalMarketingBps = marketingBps;
        externalBurnBps = burnBps;
        externalDividendBps = dividendBps;
        externalLpBps = lpBps;
        externalLpTokenThreshold = tokenThreshold;
        externalLpEnabled = projectTaxBps > 0;
        externalLpProcessingEnabled = projectTaxBps > 0 && (marketingBps > 0 || dividendBps > 0 || lpBps > 0);
        _syncDividendAccount(pair);

        emit ExternalLpConfigured(router, pair, receiver, projectTaxBps, tokenThreshold);
    }

    function launchpadSweepPendingExternalLpFees(address receiver) external onlyLaunchpad {
        if (receiver == address(0)) revert TErr(11);
        uint256 tokenAmount = _balances[address(this)];
        uint256 totalBnbBalance = address(this).balance;
        uint256 reservedBnb = reservedDividendBalance;
        uint256 bnbAmount = totalBnbBalance > reservedBnb ? totalBnbBalance - reservedBnb : 0;
        if (tokenAmount > 0) {
            _balances[address(this)] = 0;
            _balances[receiver] += tokenAmount;
            emit Transfer(address(this), receiver, tokenAmount);
        }
        if (bnbAmount > 0) {
            (bool ok, ) = payable(receiver).call{value: bnbAmount}("");
            if (!ok) revert TErr(12);
        }
        emit ExternalLpFeesSwept(receiver, tokenAmount, bnbAmount);
    }

    function launchpadDepositHolderDividends() external payable onlyLaunchpad {
        _depositHolderDividends(msg.value);
    }

    function withdrawableDividendOf(address account) external view returns (uint256) {
        uint256 accumulative = _accumulativeDividendOf(account);
        uint256 withdrawn = _dividendHolderEpoch[account] == dividendEpoch ? _withdrawnDividends[account] : 0;
        return accumulative > withdrawn ? accumulative - withdrawn : 0;
    }

    function claimDividend() external returns (uint256) {
        return _claimDividend(payable(msg.sender), false);
    }

    function _transfer(address from, address to, uint256 amount) private {
        if (to == address(0)) revert TErr(13);
        uint256 balance = _balances[from];
        if (balance < amount) revert TErr(14);

        (
            uint256 totalFeeAmount,
            uint256 contractFeeAmount,
            uint256 burnFeeAmount,
            uint256 marketingTokenAmount,
            uint256 dividendTokenAmount,
            uint256 lpTokenAmount
        ) = _takeExternalProjectFee(from, to, amount);
        uint256 receivedAmount = amount - totalFeeAmount;

        if (
            externalWalletCap > 0
            && from == externalLpPair
            && to != externalLpReceiver
            && _balances[to] + receivedAmount > externalWalletCap
        ) {
            revert TErr(17);
        }

        if (
            externalWalletCap > 0
            && from != externalLpPair
            && from != address(this)
            && from != launchpad
            && to != externalLpPair
            && to != externalLpReceiver
            && to != BURN_ADDRESS
            && _balances[to] + receivedAmount > externalWalletCap
        ) {
            revert TErr(17);
        }

        unchecked {
            _balances[from] = balance - amount;
            _balances[to] += receivedAmount;
        }
        if (contractFeeAmount > 0) {
            _balances[address(this)] += contractFeeAmount;
            pendingExternalMarketingTokens += marketingTokenAmount;
            pendingExternalDividendTokens += dividendTokenAmount;
            pendingExternalLpTokens += lpTokenAmount;
            emit Transfer(from, address(this), contractFeeAmount);
        }
        if (burnFeeAmount > 0) {
            _balances[BURN_ADDRESS] += burnFeeAmount;
            emit Transfer(from, BURN_ADDRESS, burnFeeAmount);
        }
        emit Transfer(from, to, receivedAmount);
        _syncDividendAccount(from);
        _syncDividendAccount(to);
        if (contractFeeAmount > 0 || burnFeeAmount > 0) {
            _syncDividendAccount(address(this));
        }
        _maybeProcessExternalLp(from, to);
    }

    function _approve(address tokenOwner, address spender, uint256 amount) private {
        _allowances[tokenOwner][spender] = amount;
        emit Approval(tokenOwner, spender, amount);
    }

    function _takeExternalProjectFee(
        address from,
        address to,
        uint256 amount
    ) private view returns (
        uint256 totalFeeAmount,
        uint256 contractFeeAmount,
        uint256 burnFeeAmount,
        uint256 marketingTokenAmount,
        uint256 dividendTokenAmount,
        uint256 lpTokenAmount
    ) {
        if (!externalLpEnabled || swapping || externalProjectTaxBps == 0) {
            return (0, 0, 0, 0, 0, 0);
        }
        if (from == address(this) || to == address(this)) {
            return (0, 0, 0, 0, 0, 0);
        }
        bool isExternalTrade = from == externalLpPair || to == externalLpPair;
        if (!isExternalTrade) {
            return (0, 0, 0, 0, 0, 0);
        }

        totalFeeAmount = (amount * externalProjectTaxBps) / BPS_DENOMINATOR;
        if (totalFeeAmount == 0) {
            return (0, 0, 0, 0, 0, 0);
        }

        burnFeeAmount = (totalFeeAmount * externalBurnBps) / BPS_DENOMINATOR;
        marketingTokenAmount = (totalFeeAmount * externalMarketingBps) / BPS_DENOMINATOR;
        dividendTokenAmount = (totalFeeAmount * externalDividendBps) / BPS_DENOMINATOR;
        lpTokenAmount = totalFeeAmount - burnFeeAmount - marketingTokenAmount - dividendTokenAmount;
        contractFeeAmount = totalFeeAmount - burnFeeAmount;
    }

    function _maybeProcessExternalLp(address from, address to) private returns (bool) {
        if (!externalLpEnabled || !externalLpProcessingEnabled || swapping) {
            return false;
        }
        // Delay LP processing until a non-AMM transfer or an explicit launchpad
        // call so sells do not mutate pair reserves mid-swap.
        if (
            from != address(0)
            && (from == externalLpPair || to == externalLpPair)
        ) {
            return false;
        }
        uint256 threshold = externalLpTokenThreshold;
        uint256 marketingTokenAmount = pendingExternalMarketingTokens;
        uint256 dividendTokenAmount = pendingExternalDividendTokens;
        uint256 lpTokenAmount = pendingExternalLpTokens;
        uint256 contractTokenBalance = marketingTokenAmount + dividendTokenAmount + lpTokenAmount;
        if (threshold == 0 || contractTokenBalance < threshold) {
            return false;
        }

        uint256 lpSwapTokenAmount = lpTokenAmount / 2;
        uint256 lpLiquidityTokenAmount = lpTokenAmount - lpSwapTokenAmount;
        uint256 swapAmount = marketingTokenAmount + dividendTokenAmount + lpSwapTokenAmount;
        if (swapAmount == 0 && lpLiquidityTokenAmount == 0) {
            return false;
        }

        swapping = true;
        pendingExternalMarketingTokens = 0;
        pendingExternalDividendTokens = 0;
        pendingExternalLpTokens = 0;

        uint256 bnbBefore = address(this).balance;
        uint256 marketingBnbAmount = 0;
        uint256 dividendBnbAmount = 0;
        uint256 lpBnbAmount = 0;

        if (swapAmount > 0) {
            _approve(address(this), address(externalLpRouter), swapAmount);
            address[] memory path = new address[](2);
            path[0] = address(this);
            path[1] = externalLpRouter.WETH();
            externalLpRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(
                swapAmount,
                0,
                path,
                address(this),
                block.timestamp + 900
            );
        }
        uint256 bnbReceived = address(this).balance - bnbBefore;

        if (bnbReceived > 0 && swapAmount > 0) {
            marketingBnbAmount = (bnbReceived * marketingTokenAmount) / swapAmount;
            dividendBnbAmount = (bnbReceived * dividendTokenAmount) / swapAmount;
            lpBnbAmount = bnbReceived - marketingBnbAmount - dividendBnbAmount;
        }

        if (marketingBnbAmount > 0) {
            (bool marketingOk, ) = payable(externalMarketingWallet).call{value: marketingBnbAmount}("");
            if (!marketingOk) revert TErr(15);
        }
        if (dividendBnbAmount > 0) {
            _depositHolderDividends(dividendBnbAmount);
        }

        uint256 liquidityAmount = 0;
        if (lpLiquidityTokenAmount > 0 && lpBnbAmount > 0) {
            _approve(address(this), address(externalLpRouter), lpLiquidityTokenAmount);
            (, , liquidityAmount) = externalLpRouter.addLiquidityETH{value: lpBnbAmount}(
                address(this),
                lpLiquidityTokenAmount,
                0,
                0,
                externalLpReceiver,
                block.timestamp + 900
            );
        }

        swapping = false;
        emit ExternalAutoLiquidityAdded(lpSwapTokenAmount, lpLiquidityTokenAmount, lpBnbAmount, liquidityAmount);
        emit ExternalProjectTaxProcessed(
            marketingTokenAmount,
            dividendTokenAmount,
            lpTokenAmount,
            marketingBnbAmount,
            dividendBnbAmount,
            lpBnbAmount,
            liquidityAmount
        );
        return true;
    }

    function _syncDividendAccount(address account) private {
        if (account == address(0) || account == address(this) || account == BURN_ADDRESS || account == launchpad || account == externalLpPair) {
            _setTrackedDividendBalance(account, 0);
            _removeDividendHolder(account);
            return;
        }

        uint256 balance = _balances[account];
        _ensureDividendEpoch(account);
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
        if (_dividendHolderEpoch[account] != dividendEpoch) {
            return (magnifiedDividendPerShare * trackedBalance) / DIVIDEND_MAGNITUDE;
        }
        int256 corrected = _toInt256(magnifiedDividendPerShare * trackedBalance) + _magnifiedDividendCorrections[account];
        if (corrected <= 0) {
            return 0;
        }
        return uint256(corrected) / DIVIDEND_MAGNITUDE;
    }

    function _claimDividend(address payable account, bool automatic) private returns (uint256) {
        _ensureDividendEpoch(account);
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
        reservedDividendBalance -= amount;
        emit HolderDividendClaimed(account, amount, automatic);
        return amount;
    }

    function _depositHolderDividends(uint256 amount) private {
        if (amount == 0) {
            return;
        }
        reservedDividendBalance += amount;

        uint256 trackedSupply = eligibleDividendSupply;
        if (trackedSupply == 0) {
            pendingDividendReserve += amount;
            emit HolderDividendsDeposited(amount, 0, amount);
            return;
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
            return;
        }

        uint256 distributedAmount = (perShareIncrease * trackedSupply) / DIVIDEND_MAGNITUDE;
        uint256 dust = amount - distributedAmount;
        magnifiedDividendPerShare += perShareIncrease;
        totalDividendsDistributed += distributedAmount;
        pendingDividendReserve += dust;

        emit HolderDividendsDeposited(amount, distributedAmount, dust);
    }

    function _ensureDividendEpoch(address account) private {
        if (_dividendHolderEpoch[account] == dividendEpoch) {
            return;
        }
        _dividendHolderEpoch[account] = dividendEpoch;
        _withdrawnDividends[account] = 0;
        _magnifiedDividendCorrections[account] = 0;
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
        if (value > uint256(type(int256).max)) revert TErr(16);
        return int256(value);
    }
}

/**
 * @title RooBscLaunchpad
 * @notice BSC meme launchpad prototype:
 * - Fixed project supply: 10,000 tokens.
 * - Creator chooses one-wallet buy cap from 1 to 100 tokens.
 * - Creator chooses a manual integer launch threshold from 3 to 8 BNB in testing mode.
 * - Internal market buy/sell charges 1% platform BNB tax.
 * - After launch, platform tax is disabled and LP tokens are sent to a configurable receiver.
 * - Project mechanism tax pays marketing in BNB, auto-pays holder dividends, and returns LP tax to the pool.
 * - Burn allocation sends project tokens to the dead wallet while keeping total supply fixed.
 */
contract RooBscLaunchpad {
    uint256 private constant TOKEN_SUPPLY = 10_000 ether;
    uint256 private constant INTERNAL_SALE_SUPPLY = 8_000 ether;
    uint256 private constant LAUNCH_SOLD_FLOOR = 7_999 ether;
    uint256 private constant MIN_WALLET_CAP = 1 ether;
    uint256 private constant MAX_WALLET_CAP = 100 ether;
    uint256 private constant MIN_LAUNCH_THRESHOLD = 3 ether;
    uint256 private constant MAX_LAUNCH_THRESHOLD = 8 ether;
    uint16 private constant LAUNCH_SHORTFALL_BPS = 1;
    uint16 private constant PLATFORM_TAX_BPS = 100;
    uint16 private constant BPS_DENOMINATOR = 10_000;
    uint16 private constant CURVE_BASE_BPS = 5_000;
    uint16 private constant CURVE_SLOPE_BPS = 10_000;
    uint16 private constant MIN_PROJECT_TAX_BPS = 100;
    uint16 private constant MAX_PROJECT_TAX_BPS = 1_000;
    uint256 private constant CREATE_PROTECTION_FEE = 0.01 ether;
    uint256 private constant EXTERNAL_LP_TOKEN_THRESHOLD = 5 ether;

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

    IPancakeV2Router private pancakeRouter;
    address private _owner;
    address private platformFeeWallet;
    address private launchLpReceiver;
    uint256 public projectCount;
    bool private locked;

    mapping(uint256 => Project) private projects;
    mapping(address => uint256) private tokenProjectIdPlusOne;
    mapping(uint256 => mapping(address => uint256)) private walletPurchased;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event LaunchLpReceiverUpdated(address indexed previousReceiver, address indexed newReceiver);
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
        if (msg.sender != _owner) revert LErr(1);
        _;
    }

    modifier projectExists(uint256 projectId) {
        if (projectId >= projectCount) revert LErr(2);
        _;
    }

    modifier nonReentrant() {
        if (locked) revert LErr(3);
        locked = true;
        _;
        locked = false;
    }

    constructor(address router, address initialPlatformFeeWallet) {
        if (router == address(0)) revert LErr(4);
        if (initialPlatformFeeWallet == address(0)) revert LErr(5);
        pancakeRouter = IPancakeV2Router(router);
        _owner = msg.sender;
        platformFeeWallet = initialPlatformFeeWallet;
        launchLpReceiver = initialPlatformFeeWallet;
        emit OwnershipTransferred(address(0), msg.sender);
        emit LaunchLpReceiverUpdated(address(0), initialPlatformFeeWallet);
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
            _buyInternal(projectId, msg.sender, initialBuyTokenAmount, buyValue, true);
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

    function owner() external view returns (address) {
        return _owner;
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
            if (walletCap < MIN_WALLET_CAP || walletCap > MAX_WALLET_CAP) revert LErr(6);
        } else {
            if (config.walletCapTokens != 0) revert LErr(7);
            walletCap = 0;
        }
        if (launchThreshold < MIN_LAUNCH_THRESHOLD || launchThreshold > MAX_LAUNCH_THRESHOLD) revert LErr(8);
        if (launchThreshold % 1 ether != 0) revert LErr(8);
        _validateTaxSettings(taxConfig.taxEnabled, taxConfig.projectTaxBps, taxConfig.allocation);
        if (taxConfig.taxEnabled && taxConfig.allocation.marketingBps > 0) {
            if (config.marketingWallet == address(0)) revert LErr(9);
        }

        if (requireVanity) {
            token = _predictTokenAddress(config.tokenName, config.tokenSymbol, salt);
            if (!_hasVanitySuffix(token)) revert LErr(10);
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
        if (bnbProvided < CREATE_PROTECTION_FEE) revert LErr(11);
        _sendValue(platformFeeWallet, CREATE_PROTECTION_FEE);
        emit CreateProtectionFeePaid(projectId, msg.sender, CREATE_PROTECTION_FEE);
        return bnbProvided - CREATE_PROTECTION_FEE;
    }

    function buy(uint256 projectId, uint256 tokenAmount) external payable projectExists(projectId) nonReentrant {
        _buyInternal(projectId, msg.sender, tokenAmount, msg.value, false);
    }

    function _buyInternal(
        uint256 projectId,
        address buyer,
        uint256 tokenAmount,
        uint256 bnbProvided,
        bool ignoreWalletCap
    ) private projectExists(projectId) {
        Project storage project = projects[projectId];
        if (project.launched) revert LErr(12);
        if (tokenAmount == 0) revert LErr(13);
        uint256 burnAmount = _burnAmount(project, tokenAmount);
        if (project.tokensSold + tokenAmount > INTERNAL_SALE_SUPPLY) revert LErr(14);
        if (project.tokensSold + project.tokensBurned + tokenAmount + burnAmount > TOKEN_SUPPLY) revert LErr(14);
        if (!ignoreWalletCap && project.walletCap > 0) {
            if (walletPurchased[projectId][buyer] + tokenAmount > project.walletCap) revert LErr(15);
        }

        uint256 grossCost = quoteBuy(projectId, tokenAmount);
        if (bnbProvided < grossCost) revert LErr(16);

        uint256 platformTax = (grossCost * PLATFORM_TAX_BPS) / BPS_DENOMINATOR;
        uint256 projectBnbTax = _projectBnbTax(project, grossCost);
        uint256 poolAmount = grossCost - platformTax - projectBnbTax;
        project.bnbRaised += poolAmount;
        project.tokensSold += tokenAmount;
        project.tokensBurned += burnAmount;
        if (!ignoreWalletCap) {
            walletPurchased[projectId][buyer] += tokenAmount;
        }

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
        if (project.launched) revert LErr(12);
        if (_isLaunchReady(project)) revert LErr(17);
        if (tokenAmount == 0) revert LErr(13);

        uint256 grossReturn = quoteSell(projectId, tokenAmount);
        if (project.bnbRaised < grossReturn) revert LErr(18);

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
        if (msg.sender != project.creator && msg.sender != _owner) revert LErr(19);
        if (project.launched) revert LErr(12);
        if (!_isLaunchReady(project)) revert LErr(20);

        bool launched = _tryLaunchToPancake(projectId, project, true);
        if (!launched) revert LErr(21);
    }

    function _tryLaunchToPancake(
        uint256 projectId,
        Project storage project,
        bool revertOnFailure
    ) private returns (bool) {
        uint256 tokenAmount = LaunchpadToken(payable(project.token)).balanceOf(address(this));
        uint256 bnbAmount = project.bnbRaised + project.lpBnbBuffer;
        if (tokenAmount == 0 || bnbAmount == 0) revert LErr(22);

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

    function sweepProjectExternalLpFeesByToken(
        address token,
        address receiver
    ) external onlyOwner nonReentrant {
        uint256 projectId = _projectIdByToken(token);
        Project storage project = projects[projectId];
        if (receiver == address(0)) revert LErr(24);
        if (project.launched) {
            LaunchpadToken(payable(project.token)).launchpadSweepPendingExternalLpFees(receiver);
            return;
        }

        uint256 bnbAmount = project.lpBnbBuffer;
        if (bnbAmount == 0) revert LErr(22);
        project.lpBnbBuffer = 0;
        _sendValue(receiver, bnbAmount);
    }

    function _rescueLaunchLiquidity(uint256 projectId, address receiver) private {
        if (receiver == address(0)) revert LErr(24);
        Project storage project = projects[projectId];
        if (project.launched) revert LErr(12);
        if (!_isLaunchReady(project)) revert LErr(20);

        uint256 tokenAmount = LaunchpadToken(payable(project.token)).balanceOf(address(this));
        uint256 bnbAmount = project.bnbRaised + project.lpBnbBuffer;
        if (tokenAmount == 0 || bnbAmount == 0) revert LErr(22);

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
        if (pair == address(0)) revert LErr(25);
        LaunchpadToken(payable(project.token)).launchpadConfigureExternalLp(
            address(pancakeRouter),
            pair,
            launchLpReceiver,
            project.marketingWallet,
            project.walletCap,
            project.projectTaxBps,
            project.taxAllocation.marketingBps,
            project.taxAllocation.burnBps,
            project.taxAllocation.dividendBps,
            project.taxAllocation.lpTreasuryBps,
            EXTERNAL_LP_TOKEN_THRESHOLD
        );
        emit ProjectExternalLpConfigured(projectId, project.token, pair, externalLpTaxBps, EXTERNAL_LP_TOKEN_THRESHOLD);
    }

    function _projectIdByToken(address token) private view returns (uint256) {
        uint256 projectIdPlusOne = tokenProjectIdPlusOne[token];
        if (projectIdPlusOne == 0) revert LErr(26);
        return projectIdPlusOne - 1;
    }

    function setLaunchLpReceiver(address newReceiver) external onlyOwner {
        if (newReceiver == address(0)) revert LErr(27);
        address previous = launchLpReceiver;
        launchLpReceiver = newReceiver;
        emit LaunchLpReceiverUpdated(previous, newReceiver);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert LErr(28);
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }

    function quoteBuy(uint256 projectId, uint256 tokenAmount) public view projectExists(projectId) returns (uint256) {
        Project storage project = projects[projectId];
        uint256 taxBps = PLATFORM_TAX_BPS + _bnbProjectTaxBps(project);
        uint256 poolAmount = _curvePoolAmount(project.launchThreshold, project.tokensSold, tokenAmount);
        return _ceilDiv(poolAmount * BPS_DENOMINATOR, BPS_DENOMINATOR - taxBps);
    }

    function quoteSell(uint256 projectId, uint256 tokenAmount) public view projectExists(projectId) returns (uint256) {
        Project storage project = projects[projectId];
        if (tokenAmount > project.tokensSold) revert LErr(29);
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
        if (endSold > INTERNAL_SALE_SUPPLY) revert LErr(14);

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
            if (projectTaxBps != 0) revert LErr(30);
            if (total != 0) revert LErr(31);
            return;
        }
        if (projectTaxBps < MIN_PROJECT_TAX_BPS || projectTaxBps > MAX_PROJECT_TAX_BPS) revert LErr(32);
        if (total != BPS_DENOMINATOR) revert LErr(33);
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
        uint256 bps = uint256(project.projectTaxBps);
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
        if (!ok) revert LErr(34);
    }

}
