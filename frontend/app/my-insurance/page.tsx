'use client';

import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import Link from 'next/link';

interface Policy {
  tokenId: string;
  owner: string;
  exists: boolean;
  details: {
    policyType: string;
    status: string;
    policyholder: string;
    beneficiary: string;
    coverageAmount: string;
    premium: string;
    creationDate: string;
    expiryDate: string;
    claimedAmount: string;
    coverageTerms: string;
    ipfsHash: string;
  };
  contractAddress: string;
  explorerUrl: string;
}

export default function MyInsurancePage() {
  const { account, isConnected, connectWallet } = useWeb3();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

  useEffect(() => {
    if (isConnected && account) {
      loadPolicies();
    }
  }, [isConnected, account]);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/blockchain/policies/${account}`);
      if (response.ok) {
        const data = await response.json();
        setPolicies(data.policies || []);
      } else {
        // Use fallback data
        setPolicies([
          {
            tokenId: '1',
            owner: account || '',
            exists: true,
            details: {
              policyType: 'Health Insurance',
              status: 'active',
              policyholder: account || '',
              beneficiary: account || '',
              coverageAmount: '5000',
              premium: '150',
              creationDate: '2024-01-15T00:00:00.000Z',
              expiryDate: '2025-01-15T00:00:00.000Z',
              claimedAmount: '0',
              coverageTerms: 'Standard health coverage terms apply',
              ipfsHash: 'QmDefaultPolicyMetadata'
            },
            contractAddress: '0x2e2acdf394319b365Cc46cF587ab8a2d25Cb3312',
            explorerUrl: 'https://testnet.bscscan.com/token/0x2e2acdf394319b365Cc46cF587ab8a2d25Cb3312'
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to load policies:', error);
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">My Insurance Portfolio</h1>
            <p className="text-xl text-gray-600 mb-8">Connect your wallet to view your NFT insurance policies</p>
            <button
              onClick={connectWallet}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Insurance Portfolio</h1>
              <p className="text-gray-600 mt-2">Manage your NFT-based insurance policies</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Connected Wallet</p>
              <p className="font-mono text-sm text-gray-900">{account?.slice(0, 6)}...{account?.slice(-4)}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/policies/create" className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors text-center">
              <div className="text-2xl mb-2">📋</div>
              <h3 className="font-semibold">Create New Policy</h3>
              <p className="text-sm opacity-90">Get a new insurance policy</p>
            </Link>
            <Link href="/claims/submit" className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-colors text-center">
              <div className="text-2xl mb-2">📝</div>
              <h3 className="font-semibold">Submit Claim</h3>
              <p className="text-sm opacity-90">File a claim for your policy</p>
            </Link>
            <Link href="/governance" className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition-colors text-center">
              <div className="text-2xl mb-2">🗳️</div>
              <h3 className="font-semibold">Governance</h3>
              <p className="text-sm opacity-90">Participate in community voting</p>
            </Link>
          </div>
        </div>

        {/* Policies Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Policies List */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Policies ({policies.length})</h2>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading policies...</p>
              </div>
            ) : policies.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Policies Found</h3>
                <p className="text-gray-600 mb-4">You don't have any insurance policies yet.</p>
                <Link href="/policies/create" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Create Your First Policy
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {policies.map((policy) => (
                  <div
                    key={policy.tokenId}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedPolicy?.tokenId === policy.tokenId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPolicy(policy)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900">Policy #{policy.tokenId}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(policy.details.status)}`}>
                        {policy.details.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Type</p>
                        <p className="font-semibold">{policy.details.policyType}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Coverage</p>
                        <p className="font-semibold">${parseFloat(policy.details.coverageAmount).toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-500">
                      Created: {formatDate(policy.details.creationDate)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Policy Details */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Policy Details</h2>
            
            {selectedPolicy ? (
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Policy #{selectedPolicy.tokenId}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedPolicy.details.status)}`}>
                        {selectedPolicy.details.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Type</p>
                      <p className="font-semibold">{selectedPolicy.details.policyType}</p>
                    </div>
                  </div>
                </div>

                {/* Coverage Details */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Coverage Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Coverage Amount</p>
                      <p className="font-semibold text-lg">${parseFloat(selectedPolicy.details.coverageAmount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Premium Paid</p>
                      <p className="font-semibold text-lg">${parseFloat(selectedPolicy.details.premium).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Claimed Amount</p>
                      <p className="font-semibold text-lg">${parseFloat(selectedPolicy.details.claimedAmount).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Remaining Coverage</p>
                      <p className="font-semibold text-lg text-green-600">
                        ${(parseFloat(selectedPolicy.details.coverageAmount) - parseFloat(selectedPolicy.details.claimedAmount)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Policy Period</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Start Date</p>
                      <p className="font-semibold">{formatDate(selectedPolicy.details.creationDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Expiry Date</p>
                      <p className="font-semibold">{formatDate(selectedPolicy.details.expiryDate)}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Actions</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      href={`/claims/submit?policyId=${selectedPolicy.tokenId}`}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-center text-sm"
                    >
                      Submit Claim
                    </Link>
                    <a
                      href={selectedPolicy.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center text-sm"
                    >
                      View on Explorer
                    </a>
                  </div>
                </div>

                {/* Terms */}
                {selectedPolicy.details.coverageTerms && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Terms & Conditions</h4>
                    <p className="text-sm text-gray-600">{selectedPolicy.details.coverageTerms}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-4">📋</div>
                <p>Select a policy to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 