// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ChainSureStablecoin
 * @dev BSC-compatible stablecoin pegged to INR for the ChainSure mutual insurance platform
 * Features:
 * - Mintable by authorized contracts (premium collection)
 * - Burnable for claims payouts
 * - Pausable for emergency situations
 * - Price oracle integration for INR peg maintenance
 */
contract ChainSureStablecoin is ERC20, ERC20Burnable, Ownable, Pausable, ReentrancyGuard {
    // Events
    event Minted(address indexed to, uint256 amount, string reason);
    event Burned(address indexed from, uint256 amount, string reason);
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event PriceOracleUpdated(address indexed newOracle);
    event PegAdjustment(uint256 oldRate, uint256 newRate);

    // State variables
    mapping(address => bool) public minters;
    mapping(address => uint256) public dailyMintLimit;
    mapping(address => uint256) public dailyMinted;
    mapping(address => uint256) public lastMintDay;

    address public priceOracle;
    uint256 public inrPegRate; // 1 INR = X wei (18 decimals)
    uint256 public constant MAX_SUPPLY = 10_000_000_000 * 10**18; // 10 billion tokens
    uint256 public constant DAILY_MINT_RESET = 1 days;

    // Reserve ratios (basis points - 10000 = 100%)
    uint256 public reserveRatio = 8000; // 80% reserve requirement
    uint256 public totalReserves;

    modifier onlyMinter() {
        require(minters[msg.sender], "ChainSureStablecoin: caller is not a minter");
        _;
    }

    modifier withinDailyLimit(uint256 amount) {
        uint256 currentDay = block.timestamp / DAILY_MINT_RESET;
        if (lastMintDay[msg.sender] < currentDay) {
            dailyMinted[msg.sender] = 0;
            lastMintDay[msg.sender] = currentDay;
        }
        require(
            dailyMinted[msg.sender] + amount <= dailyMintLimit[msg.sender],
            "ChainSureStablecoin: daily mint limit exceeded"
        );
        _;
    }

    constructor(
        address _priceOracle,
        uint256 _inrPegRate
    ) ERC20("ChainSure INR", "csINR") {
        priceOracle = _priceOracle;
        inrPegRate = _inrPegRate;
        
        // Initial minting to deployer for liquidity bootstrapping
        _mint(msg.sender, 1_000_000 * 10**18); // 1 million tokens
        totalReserves = 800_000 * 10**18; // 80% reserve ratio
        
        emit Minted(msg.sender, 1_000_000 * 10**18, "Initial liquidity");
    }

    /**
     * @dev Mint tokens for premium collection
     * @param to Address to mint tokens to
     * @param amount Amount to mint
     * @param reason Reason for minting (for tracking)
     */
    function mint(
        address to,
        uint256 amount,
        string memory reason
    ) external onlyMinter whenNotPaused withinDailyLimit(amount) nonReentrant {
        require(to != address(0), "ChainSureStablecoin: mint to zero address");
        require(amount > 0, "ChainSureStablecoin: mint amount must be positive");
        require(totalSupply() + amount <= MAX_SUPPLY, "ChainSureStablecoin: max supply exceeded");

        _mint(to, amount);
        dailyMinted[msg.sender] += amount;

        emit Minted(to, amount, reason);
    }

    /**
     * @dev Burn tokens for claims payout
     * @param from Address to burn tokens from
     * @param amount Amount to burn
     * @param reason Reason for burning (for tracking)
     */
    function burnFrom(
        address from,
        uint256 amount,
        string memory reason
    ) public onlyMinter whenNotPaused nonReentrant {
        require(from != address(0), "ChainSureStablecoin: burn from zero address");
        require(amount > 0, "ChainSureStablecoin: burn amount must be positive");
        require(balanceOf(from) >= amount, "ChainSureStablecoin: insufficient balance");

        _spendAllowance(from, msg.sender, amount);
        _burn(from, amount);

        emit Burned(from, amount, reason);
    }

    /**
     * @dev Add a new minter (typically a smart contract)
     * @param minter Address to add as minter
     * @param _dailyLimit Daily minting limit for this minter
     */
    function addMinter(address minter, uint256 _dailyLimit) external onlyOwner {
        require(minter != address(0), "ChainSureStablecoin: minter cannot be zero address");
        require(!minters[minter], "ChainSureStablecoin: minter already exists");

        minters[minter] = true;
        dailyMintLimit[minter] = _dailyLimit;

        emit MinterAdded(minter);
    }

    /**
     * @dev Remove a minter
     * @param minter Address to remove as minter
     */
    function removeMinter(address minter) external onlyOwner {
        require(minters[minter], "ChainSureStablecoin: minter does not exist");

        minters[minter] = false;
        dailyMintLimit[minter] = 0;
        dailyMinted[minter] = 0;

        emit MinterRemoved(minter);
    }

    /**
     * @dev Update daily minting limit for a minter
     * @param minter Address of the minter
     * @param newLimit New daily limit
     */
    function updateDailyLimit(address minter, uint256 newLimit) external onlyOwner {
        require(minters[minter], "ChainSureStablecoin: minter does not exist");
        dailyMintLimit[minter] = newLimit;
    }

    /**
     * @dev Update price oracle address
     * @param newOracle New price oracle address
     */
    function updatePriceOracle(address newOracle) external onlyOwner {
        require(newOracle != address(0), "ChainSureStablecoin: oracle cannot be zero address");
        priceOracle = newOracle;
        emit PriceOracleUpdated(newOracle);
    }

    /**
     * @dev Update INR peg rate
     * @param newRate New peg rate
     */
    function updatePegRate(uint256 newRate) external onlyOwner {
        require(newRate > 0, "ChainSureStablecoin: peg rate must be positive");
        uint256 oldRate = inrPegRate;
        inrPegRate = newRate;
        emit PegAdjustment(oldRate, newRate);
    }

    /**
     * @dev Update reserve ratio
     * @param newRatio New reserve ratio in basis points
     */
    function updateReserveRatio(uint256 newRatio) external onlyOwner {
        require(newRatio <= 10000, "ChainSureStablecoin: reserve ratio cannot exceed 100%");
        require(newRatio >= 5000, "ChainSureStablecoin: reserve ratio cannot be below 50%");
        reserveRatio = newRatio;
    }

    /**
     * @dev Update total reserves
     * @param newReserves New total reserve amount
     */
    function updateReserves(uint256 newReserves) external onlyMinter {
        totalReserves = newReserves;
    }

    /**
     * @dev Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Get current INR equivalent of token amount
     * @param tokenAmount Amount of tokens
     * @return INR equivalent in wei
     */
    function getINREquivalent(uint256 tokenAmount) external view returns (uint256) {
        return (tokenAmount * inrPegRate) / 10**18;
    }

    /**
     * @dev Get token equivalent of INR amount
     * @param inrAmount Amount in INR (wei)
     * @return Token equivalent
     */
    function getTokenEquivalent(uint256 inrAmount) external view returns (uint256) {
        return (inrAmount * 10**18) / inrPegRate;
    }

    /**
     * @dev Check if reserves meet minimum ratio
     * @return Whether reserves are sufficient
     */
    function areReservesSufficient() external view returns (bool) {
        if (totalSupply() == 0) return true;
        return (totalReserves * 10000) / totalSupply() >= reserveRatio;
    }

    /**
     * @dev Get reserve coverage percentage
     * @return Reserve coverage in basis points
     */
    function getReserveCoverage() external view returns (uint256) {
        if (totalSupply() == 0) return 10000;
        return (totalReserves * 10000) / totalSupply();
    }

    // Override transfer functions to add pause functionality
    function transfer(address to, uint256 amount) public override whenNotPaused returns (bool) {
        return super.transfer(to, amount);
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override whenNotPaused returns (bool) {
        return super.transferFrom(from, to, amount);
    }
} 