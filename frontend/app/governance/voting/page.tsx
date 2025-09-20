'use client';

import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../../context/Web3Context';

interface Claim {
  id: string;
  policyTokenId: string;
  claimant: string;
  amount: string;
  description: string;
  status: string;
  submittedAt: string;
  evidenceHashes: string[];
  aiAnalysis?: {
    fraudScore: number;
    authenticityScore: number;
    recommendation: string;
    reasoning: string;
    detectedIssues: string[];
  };
}

interface Proposal {
  id: string;
  title: string;
  description: string;
  status: string;
  votesFor: string;
  votesAgainst: string;
  startTime: string;
  endTime: string;
  executed: boolean;
}

export default function VotingPage() {
  const { account, isConnected, connectWallet } = useWeb3();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [votingPower, setVotingPower] = useState('0');
  const [loading, setLoading] = useState(true);
  const [voteLoading, setVoteLoading] = useState(false);
  const [voteChoice, setVoteChoice] = useState<'approve' | 'reject'>('approve');
  const [voteReason, setVoteReason] = useState('');

  useEffect(() => {
    if (isConnected && account) {
      loadVotingData();
    }
  }, [isConnected, account]);

  const loadVotingData = async () => {
    try {
      setLoading(true);
      
      // Load claims that need voting
      const claimsResponse = await fetch('/api/v1/claims?status=pending');
      const claimsData = await claimsResponse.json();
      
      // Load governance proposals
      const proposalsResponse = await fetch('/api/v1/blockchain/governance/proposals');
      const proposalsData = await proposalsResponse.json();
      
      // Load user's voting power
      const votingPowerResponse = await fetch(`/api/v1/blockchain/tokens/${account}`);
      const votingPowerData = await votingPowerResponse.json();
      
      setClaims(claimsData.claims || []);
      setProposals(proposalsData.proposals || []);
      setVotingPower(votingPowerData.tokens?.governanceToken?.balance || '0');
      
    } catch (error) {
      console.error('Error loading voting data:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeClaimWithAI = async (claimId: string) => {
    try {
      const response = await fetch('/api/v1/ai/analyze-claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer chainsure_dev_key_2024'
        },
        body: JSON.stringify({
          claimId,
          claimType: 'general',
          requestedAmount: selectedClaim?.amount || 0,
          description: selectedClaim?.description || ''
        })
      });
      
      const analysis = await response.json();
      
      // Update claim with AI analysis
      setClaims(prev => prev.map(claim => 
        claim.id === claimId 
          ? { ...claim, aiAnalysis: analysis }
          : claim
      ));
      
      if (selectedClaim?.id === claimId) {
        setSelectedClaim(prev => prev ? { ...prev, aiAnalysis: analysis } : null);
      }
      
    } catch (error) {
      console.error('Error analyzing claim with AI:', error);
    }
  };

  const submitVote = async (claimId: string) => {
    if (!account || !voteReason.trim()) {
      alert('Please connect wallet and provide a reason for your vote');
      return;
    }

    try {
      setVoteLoading(true);
      
      const voteData = {
        proposalId: claimId,
        voter: account,
        support: voteChoice === 'approve',
        reason: voteReason,
        votingPower: votingPower
      };
      
      const response = await fetch('/api/v1/blockchain/governance/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(voteData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('Vote submitted successfully! Transaction data prepared for wallet execution.');
        // Reload data
        await loadVotingData();
        setVoteReason('');
        setVoteChoice('approve');
      } else {
        alert('Failed to submit vote: ' + result.message);
      }
      
    } catch (error) {
      console.error('Error submitting vote:', error);
      alert('Error submitting vote');
    } finally {
      setVoteLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFraudScoreColor = (score: number) => {
    if (score < 30) return 'text-green-600';
    if (score < 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-20">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Community Governance</h1>
            <p className="text-xl text-gray-600 mb-8">Connect your wallet to participate in claim voting</p>
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Community Governance</h1>
              <p className="text-gray-600 mt-2">Vote on insurance claims and governance proposals</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Voting Power</p>
              <p className="text-2xl font-bold text-blue-600">{parseFloat(votingPower).toFixed(2)} CSG</p>
              <p className="text-xs text-gray-400">Connected: {account?.slice(0, 6)}...{account?.slice(-4)}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading voting data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Claims for Voting */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Claims Pending Review</h2>
              
              {claims.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No claims pending review</p>
              ) : (
                <div className="space-y-4">
                  {claims.map((claim) => (
                    <div
                      key={claim.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedClaim(claim)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900">Claim #{claim.id}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(claim.status)}`}>
                          {claim.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Amount</p>
                          <p className="font-semibold">${parseFloat(claim.amount).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Policy ID</p>
                          <p className="font-mono text-xs">#{claim.policyTokenId}</p>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                        {claim.description}
                      </p>
                      
                      {claim.aiAnalysis && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">AI Fraud Score:</span>
                            <span className={`text-sm font-semibold ${getFraudScoreColor(claim.aiAnalysis.fraudScore)}`}>
                              {claim.aiAnalysis.fraudScore}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Recommendation:</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              claim.aiAnalysis.recommendation === 'approve' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {claim.aiAnalysis.recommendation}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Claim Details */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Claim Details</h2>
              
              {selectedClaim ? (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Claim Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Claim ID</p>
                        <p className="font-mono">#{selectedClaim.id}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Policy ID</p>
                        <p className="font-mono">#{selectedClaim.policyTokenId}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Amount</p>
                        <p className="font-semibold text-lg">${parseFloat(selectedClaim.amount).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Status</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedClaim.status)}`}>
                          {selectedClaim.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {selectedClaim.description}
                    </p>
                  </div>

                  {/* AI Analysis */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">AI Analysis</h3>
                      {!selectedClaim.aiAnalysis && (
                        <button
                          onClick={() => analyzeClaimWithAI(selectedClaim.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded transition-colors"
                        >
                          Analyze
                        </button>
                      )}
                    </div>
                    
                    {selectedClaim.aiAnalysis ? (
                      <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Fraud Score</p>
                            <p className={`text-lg font-semibold ${getFraudScoreColor(selectedClaim.aiAnalysis.fraudScore)}`}>
                              {selectedClaim.aiAnalysis.fraudScore}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Authenticity</p>
                            <p className="text-lg font-semibold text-blue-600">
                              {Math.round(selectedClaim.aiAnalysis.authenticityScore * 100)}%
                            </p>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500">AI Recommendation</p>
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                            selectedClaim.aiAnalysis.recommendation === 'approve' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {selectedClaim.aiAnalysis.recommendation.toUpperCase()}
                          </span>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500">Reasoning</p>
                          <p className="text-sm text-gray-700 mt-1">
                            {selectedClaim.aiAnalysis.reasoning}
                          </p>
                        </div>
                        
                        {selectedClaim.aiAnalysis.detectedIssues.length > 0 && (
                          <div>
                            <p className="text-sm text-gray-500">Detected Issues</p>
                            <ul className="text-sm text-gray-700 mt-1 space-y-1">
                              {selectedClaim.aiAnalysis.detectedIssues.map((issue, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="text-red-500 mr-2">•</span>
                                  {issue}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">Click "Analyze" to get AI insights</p>
                    )}
                  </div>

                  {/* Voting Section */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Cast Your Vote</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Vote Choice</label>
                        <div className="flex space-x-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="approve"
                              checked={voteChoice === 'approve'}
                              onChange={(e) => setVoteChoice(e.target.value as 'approve' | 'reject')}
                              className="mr-2"
                            />
                            <span className="text-green-700 font-medium">Approve</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="reject"
                              checked={voteChoice === 'reject'}
                              onChange={(e) => setVoteChoice(e.target.value as 'approve' | 'reject')}
                              className="mr-2"
                            />
                            <span className="text-red-700 font-medium">Reject</span>
                          </label>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Reason for Vote *
                        </label>
                        <textarea
                          value={voteReason}
                          onChange={(e) => setVoteReason(e.target.value)}
                          placeholder="Explain your voting decision..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={3}
                        />
                      </div>
                      
                      <button
                        onClick={() => submitVote(selectedClaim.id)}
                        disabled={voteLoading || !voteReason.trim()}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                      >
                        {voteLoading ? 'Submitting Vote...' : 'Submit Vote'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="text-gray-400 text-6xl mb-4">📋</div>
                  <p className="text-gray-500">Select a claim to view details and vote</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Governance Proposals */}
        {proposals.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Governance Proposals</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {proposals.map((proposal) => (
                <div key={proposal.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-900">{proposal.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      proposal.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {proposal.status}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {proposal.description}
                  </p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Votes For:</span>
                      <span className="font-semibold text-green-600">{parseFloat(proposal.votesFor).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Votes Against:</span>
                      <span className="font-semibold text-red-600">{parseFloat(proposal.votesAgainst).toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      Ends: {new Date(proposal.endTime).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 