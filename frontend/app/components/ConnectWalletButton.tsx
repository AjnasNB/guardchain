'use client';

import React from 'react';
import { useWeb3 } from '../context/Web3Context';

export default function ConnectWalletButton() {
  const { account, isConnected, connectWallet } = useWeb3();

  if (isConnected && account) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
        <span className="text-white/80 text-sm font-medium">
          {account.slice(0, 6)}...{account.slice(-4)}
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={connectWallet}
      className="bg-gradient-to-r from-yellow-400 to-orange-400 text-purple-900 px-6 py-2 rounded-xl text-sm font-semibold hover:from-yellow-300 hover:to-orange-300 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
    >
      <span className="mr-2">🦊</span>
      Connect Wallet
    </button>
  );
} 