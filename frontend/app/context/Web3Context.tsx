'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';

// TypeScript declarations for MetaMask
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (eventName: string, handler: (...args: any[]) => void) => void;
      removeListener: (eventName: string, handler: (...args: any[]) => void) => void;
      selectedAddress?: string;
      chainId?: string;
    };
  }
}

interface UserData {
  id: string;
  walletAddress: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  isVerified: boolean;
  createdAt: string;
}

interface Web3ContextType {
  account: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  isConnected: boolean;
  userData: UserData | null;
  isNewUser: boolean;
  chainId: number | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  saveUserData: (data: Partial<UserData>) => Promise<void>;
  mintPolicyNFT: (policyData: any) => Promise<string>;
  mintClaimNFT: (claimData: any) => Promise<string>;
  switchToTestnet: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

// Arbitrum Sepolia Configuration
const ARBITRUM_SEPOLIA = {
  chainId: '0x66eee', // 421614 in decimal
  chainName: 'Arbitrum Sepolia',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
  blockExplorerUrls: ['https://sepolia.arbiscan.io/'],
};

// Contract addresses (deployed on Arbitrum Sepolia)
const CONTRACT_ADDRESSES = {
  stablecoin: '0x7438af9FC68fE976e33029E570720d19A975baC7',
  governanceToken: '0x9B3A8167eb01246688705FC1C11F81Efa7350fc5',
  policyNFT: '0x7596B7c1Ad9490275eC143a6bc1bbd495e338A8C',
  claimsEngine: '0x54A4c8006272fDeA157950421ceBeb510387af83',
  surplusDistributor: '0x41A34F8150226c57E613A07B9750EB5dA0076317',
  governance: '0xe3ca0A9B4D66b8dCf7B44c914Bd2c97b2a379D78',
  juryOracle: '0xA5ed6d4057D73B4D3F6fb0A6ec71334FD932eFE1',
  voteTally: '0xAAe39523b50aC68AF0710Fa84ff28934F09e61C5',
  appealSystem: '0x2Ad335BB9Ee03d71c1b6183ddd0BB92642118503',
  parametricTriggers: '0x037E960c64a5d37614a204fB6a27620Bc8076A4b',
};

export function Web3Provider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window !== 'undefined' && Boolean(window.ethereum?.isMetaMask);
  };

  // Initialize provider on component mount
  useEffect(() => {
    if (isMetaMaskInstalled()) {
      const provider = new ethers.BrowserProvider(window.ethereum!);
      setProvider(provider);

      // Check if already connected
      checkConnection();

      // Listen for account changes
      window.ethereum!.on('accountsChanged', handleAccountsChanged);
      window.ethereum!.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  // Re-check connection when provider changes
  useEffect(() => {
    if (provider) {
      checkConnection();
    }
  }, [provider]);

  const checkConnection = async () => {
    try {
      if (!provider) return;

      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const network = await provider.getNetwork();
        
        setAccount(address);
        setSigner(signer);
        setChainId(Number(network.chainId));
        setIsConnected(true);

        // Load user data
        await loadUserData(address);
      } else {
        // No accounts connected, reset state
        setAccount(null);
        setSigner(null);
        setIsConnected(false);
        setUserData(null);
        setIsNewUser(false);
        setChainId(null);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      // Reset state on error
      setAccount(null);
      setSigner(null);
      setIsConnected(false);
      setUserData(null);
      setIsNewUser(false);
      setChainId(null);
    }
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      setAccount(accounts[0]);
      setIsConnected(true);
      loadUserData(accounts[0]);
    }
  };

  const handleChainChanged = (chainId: string) => {
    setChainId(parseInt(chainId, 16));
    window.location.reload(); // Reload to reset state
  };

  const connectWallet = async () => {
    try {
      if (!isMetaMaskInstalled()) {
        alert('Please install MetaMask to use this application');
        window.open('https://metamask.io/', '_blank');
        return;
      }

      if (!provider) {
        throw new Error('Provider not initialized');
      }

      // Request account access
      await window.ethereum!.request({ method: 'eth_requestAccounts' });

      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      setAccount(address);
      setSigner(signer);
      setChainId(Number(network.chainId));
      setIsConnected(true);

      // Switch to Arbitrum Sepolia if not already on it
      if (Number(network.chainId) !== 421614) {
        await switchToTestnet();
      }

      // Load or create user data
      await loadUserData(address);

    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
    setIsConnected(false);
    setUserData(null);
    setIsNewUser(false);
    setChainId(null);
  };

  const switchToTestnet = async () => {
    try {
      // Try to switch to Arbitrum Sepolia
      await window.ethereum!.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARBITRUM_SEPOLIA.chainId }],
      });
    } catch (switchError: any) {
      // If the chain doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum!.request({
            method: 'wallet_addEthereumChain',
            params: [ARBITRUM_SEPOLIA],
          });
        } catch (addError) {
          console.error('Error adding Arbitrum Sepolia:', addError);
          alert('Failed to add Arbitrum Sepolia to MetaMask');
        }
      } else {
        console.error('Error switching to Arbitrum Sepolia:', switchError);
      }
    }
  };

  const loadUserData = async (walletAddress: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/v1/users/wallet/${walletAddress}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.users && data.users.length > 0) {
          setUserData(data.users[0]);
          setIsNewUser(false);
        } else {
          setIsNewUser(true);
        }
      } else {
        setIsNewUser(true);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setIsNewUser(true);
    }
  };

  const saveUserData = async (data: Partial<UserData>) => {
    try {
      if (!account) throw new Error('No wallet connected');

      const userData = {
        walletAddress: account,
        ...data,
      };

      const response = await fetch('http://localhost:3000/api/v1/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        const savedUser = await response.json();
        setUserData(savedUser);
        setIsNewUser(false);
      } else {
        throw new Error('Failed to save user data');
      }
    } catch (error) {
      console.error('Error saving user data:', error);
      throw error;
    }
  };

  const mintPolicyNFT = async (policyData: any): Promise<string> => {
    try {
      if (!signer) throw new Error('No signer available');

      // This would be the actual NFT contract interaction
      // For now, simulate minting and return a transaction hash
      const txHash = `0x${Math.random().toString(16).substring(2, 66)}`;
      
      // Store NFT info in backend
      await fetch('http://localhost:3000/api/v1/blockchain/mint-policy-nft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...policyData,
          ownerAddress: account,
          transactionHash: txHash,
          contractAddress: CONTRACT_ADDRESSES.policyNFT,
        }),
      });

      return txHash;
    } catch (error) {
      console.error('Error minting policy NFT:', error);
      throw error;
    }
  };

  const mintClaimNFT = async (claimData: any): Promise<string> => {
    try {
      if (!signer) throw new Error('No signer available');

      // This would be the actual NFT contract interaction
      // For now, simulate minting and return a transaction hash
      const txHash = `0x${Math.random().toString(16).substring(2, 66)}`;
      
      // Store NFT info in backend
      await fetch('http://localhost:3000/api/v1/blockchain/mint-claim-nft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...claimData,
          ownerAddress: account,
          transactionHash: txHash,
          contractAddress: CONTRACT_ADDRESSES.claimNFT,
        }),
      });

      return txHash;
    } catch (error) {
      console.error('Error minting claim NFT:', error);
      throw error;
    }
  };

  const value: Web3ContextType = {
    account,
    provider,
    signer,
    isConnected,
    userData,
    isNewUser,
    chainId,
    connectWallet,
    disconnectWallet,
    saveUserData,
    mintPolicyNFT,
    mintClaimNFT,
    switchToTestnet,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
} 