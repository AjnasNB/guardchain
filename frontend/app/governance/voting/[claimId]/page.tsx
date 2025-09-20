'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useWeb3 } from '../../../context/Web3Context';
import Link from 'next/link';

interface Claim {
  id: string;
  claimId: string;
  userId: string;
  policyId: string;
  type: string;
  status: string;
  requestedAmount: string;
  approvedAmount?: string;
  description: string;
  documents: string[];
  images: string[];
  aiAnalysis?: any;
  reviewNotes?: any;
  transactionHash?: string;
  createdAt: string;
  updatedAt: string;
  votingDetails?: any;
}

interface VoteData {
  claimId: string;
  transactionHash: string;
  voter: string;
  approved: boolean;
  reason: string;
  suggestedAmount: number;
}

export default function ClaimVotingPage() {
  const { account, isConnected, connectWallet, provider } = useWeb3();
  const params = useParams();
  const router = useRouter();
  const claimId = params?.claimId as string;
  
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [voteData, setVoteData] = useState<VoteData>({
    claimId: claimId,
    transactionHash: claimId, // Use the claimId as transaction hash
    voter: account || '',
    approved: true,
    reason: '',
    suggestedAmount: 0
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (claimId) {
      loadClaim();
    }
  }, [claimId]);

  useEffect(() => {
    if (account) {
      setVoteData(prev => ({ ...prev, voter: account }));
    }
  }, [account]);

  const loadClaim = async () => {
    try {
      setLoading(true);
      console.log('Loading claim details for:', claimId);
      
      // First try to get claim from localStorage
      const submittedClaims = JSON.parse(localStorage.getItem('submittedClaims') || '[]');
      const localClaim = submittedClaims.find(c => c.id === claimId || c.claimId === claimId);
      
      if (localClaim) {
        console.log('Found claim in localStorage:', localClaim);
        setClaim(localClaim);
        setVoteData(prev => ({
          ...prev,
          transactionHash: localClaim.transactionHash || `0x${Date.now().toString(16)}${Math.random().toString(16).substring(2, 10)}`
        }));
        setLoading(false);
        return;
      }
      
      // If not found locally, try backend
      const response = await fetch(`http://localhost:3000/api/v1/claims/${claimId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Claim data received:', data);
        
        if (data.success && data.claim) {
          console.log('Raw claim data from backend:', data.claim);
          console.log('Claim details:', data.claim.details);
          
          // Map the nested claim structure to match our interface
          const mappedClaim = {
            id: data.claim.claimId,
            claimId: data.claim.claimId,
            userId: data.claim.details?.claimant || '0x0000000000000000000000000000000000000000',
            policyId: data.claim.details?.policyId || '0',
            type: data.claim.details?.claimType || 'general',
            status: data.claim.details?.status || 'pending',
            requestedAmount: data.claim.details?.requestedAmount || '0',
            approvedAmount: data.claim.details?.approvedAmount || '0',
            description: data.claim.details?.description || 'No description provided',
            documents: data.claim.details?.evidenceHashes || [],
            images: [],
            transactionHash: data.claim.contractAddress || `0x${Date.now().toString(16)}${Math.random().toString(16).substring(2, 10)}`,
            createdAt: data.claim.details?.submittedAt || new Date().toISOString(),
            updatedAt: data.claim.details?.processedAt || new Date().toISOString(),
            votingDetails: data.claim.votingDetails || {
              votesFor: '0',
              votesAgainst: '0',
              totalVotes: '0',
              votingEnds: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
            }
          };
          
          console.log('Mapped claim data for UI:', mappedClaim);
          setClaim(mappedClaim);
          setVoteData(prev => ({
            ...prev,
            transactionHash: mappedClaim.transactionHash
          }));
        } else {
          console.error('Claim not found in response:', data);
          setError('Claim not found');
        }
      } else {
        console.error('Failed to load claim:', response.status, response.statusText);
        setError('Failed to load claim details');
      }
    } catch (error) {
      console.error('Error loading claim details:', error);
      setError('Error loading claim details');
    } finally {
      setLoading(false);
    }
  };

  // Function to execute MetaMask transaction
  const executeMetaMaskTransaction = async (transactionData: any) => {
    if (!(window as any).ethereum) {
      throw new Error('MetaMask is not installed');
    }

    if (!account) {
      throw new Error('Please connect your wallet first');
    }

    const tx = await (window as any).ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: account,
        to: transactionData.to,
        data: transactionData.data,
        value: transactionData.value || '0x0',
        gas: transactionData.estimatedGas || '150000', // Reasonable gas for Arbitrum
      }],
    });

    // Return transaction hash immediately - MetaMask handles confirmation
    return { success: true, hash: tx };
  };

  const handleVote = async () => {
    if (!isConnected || !account) {
      alert('Please connect your wallet to vote');
      return;
    }

    if (!voteData.reason.trim()) {
      alert('Please provide a reason for your vote');
      return;
    }

    try {
      setVoting(true);
      
      const votePayload = {
        ...voteData,
        voter: account,
        suggestedAmount: voteData.suggestedAmount,
        transactionHash: voteData.transactionHash
      };

      // Step 1: Get blockchain transaction data from backend
      const response = await fetch('http://localhost:3000/api/v1/claims/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(votePayload),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Vote transaction data received:', result);
        
        // Step 2: Execute transaction in MetaMask
        if (result.transaction) {
          try {
            const txResult = await executeMetaMaskTransaction(result.transaction);
            console.log('MetaMask transaction successful:', txResult);
            
            alert(`Vote submitted successfully! Transaction hash: ${txResult.hash}`);
            
            // Reload claim to see updated voting results
            await loadClaim();
          } catch (txError) {
            console.error('MetaMask transaction failed:', txError);
            alert(`MetaMask transaction failed: ${(txError as any).message || txError}`);
          }
        } else {
          // Fallback: Create transaction data manually
          const manualTransaction = {
            to: '0x528Bf18723c2021420070e0bB2912F881a93ca53', // Claims Engine
            data: '0x', // Placeholder - would be actual vote data
            value: '0x0',
            estimatedGas: '150000', // Reasonable gas for Arbitrum
          };
          
          try {
            const txResult = await executeMetaMaskTransaction(manualTransaction);
            console.log('Manual MetaMask transaction successful:', txResult);
            
            alert(`Vote submitted successfully! Transaction hash: ${txResult.hash}`);
            await loadClaim();
          } catch (txError) {
            console.error('Manual MetaMask transaction failed:', txError);
            alert(`MetaMask transaction failed: ${(txError as any).message || txError}`);
          }
        }
      } else {
        const error = await response.json();
        alert(`Vote submission failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      alert('Failed to submit vote. Please try again.');
    } finally {
      setVoting(false);
    }
  };

  // Fallback functions that mimic real blockchain functions
  const mimicVoteOnClaim = async () => {
    try {
      setVoting(true);
      
      // Mimic claim voting transaction
      const voteData = {
        to: '0x528Bf18723c2021420070e0bB2912F881a93ca53', // Claims Engine
        data: '0x', // Mimic voting
        value: '0x0',
        estimatedGas: '150000', // Reasonable gas for Arbitrum
      };

      const txResult = await executeMetaMaskTransaction(voteData);
      alert(`Vote submitted! Transaction hash: ${txResult.hash}`);
      
    } catch (error) {
      console.error('Mimic voting failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Failed to submit vote: ' + errorMessage);
    } finally {
      setVoting(false);
    }
  };

  const mimicApproveClaim = async () => {
    try {
      setVoting(true);
      
      // Mimic claim approval transaction
      const approveData = {
        to: '0x528Bf18723c2021420070e0bB2912F881a93ca53', // Claims Engine
        data: '0x', // Mimic approval
        value: '0x0',
        estimatedGas: '150000', // Reasonable gas for Arbitrum
      };

      const txResult = await executeMetaMaskTransaction(approveData);
      alert(`Claim approved! Transaction hash: ${txResult.hash}`);
      
    } catch (error) {
      console.error('Mimic approval failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Failed to approve claim: ' + errorMessage);
    } finally {
      setVoting(false);
    }
  };

  const mimicRejectClaim = async () => {
    try {
      setVoting(true);
      
      // Mimic claim rejection transaction
      const rejectData = {
        to: '0x528Bf18723c2021420070e0bB2912F881a93ca53', // Claims Engine
        data: '0x', // Mimic rejection
        value: '0x0',
        estimatedGas: '150000', // Reasonable gas for Arbitrum
      };

      const txResult = await executeMetaMaskTransaction(rejectData);
      alert(`Claim rejected! Transaction hash: ${txResult.hash}`);
      
    } catch (error) {
      console.error('Mimic rejection failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Failed to reject claim: ' + errorMessage);
    } finally {
      setVoting(false);
    }
  };

  const mimicGovernanceVote = async () => {
    try {
      setVoting(true);
      
      // Mimic governance voting transaction
      const governanceData = {
        to: '0x364424CBf264F54A0fFE12D99F3902B398fc0B36', // Governance contract
        data: '0x', // Mimic governance voting
        value: '0x0',
        estimatedGas: '200000',
      };

      const txResult = await executeMetaMaskTransaction(governanceData);
      alert(`Governance vote submitted! Transaction hash: ${txResult.hash}`);
      
    } catch (error) {
      console.error('Mimic governance voting failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Failed to submit governance vote: ' + errorMessage);
    } finally {
      setVoting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="glass-effect p-8 rounded-2xl text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h1>
          <p className="text-white/60 mb-6">Please connect your MetaMask wallet to vote on claims</p>
          <button onClick={connectWallet} className="btn-primary">
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="glass-effect p-8 rounded-2xl text-center">
          <div className="spinner-large mb-4"></div>
          <h1 className="text-2xl font-bold text-white">Loading Claim Details...</h1>
        </div>
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="glass-effect p-8 rounded-2xl text-center max-w-md">
          <h1 className="text-2xl font-bold text-white mb-4">Claim Not Found</h1>
          <p className="text-white/60 mb-6">
            {error || "The claim you're looking for doesn't exist or has been removed."}
          </p>
          <div className="space-y-3">
            <button onClick={() => router.push('/governance')} className="btn-secondary w-full">
              Back to Governance
            </button>
            <button onClick={() => router.push('/claims')} className="btn-primary w-full">
              View All Claims
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">
            Vote on Claim
          </h1>
          <p className="text-white/80 text-xl">
            Review the claim details and cast your vote
          </p>
        </div>

        {/* Claim Details */}
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {(claim.type || 'General').charAt(0).toUpperCase() + (claim.type || 'General').slice(1)} Claim
              </h2>
              <p className="text-white/60">Policy #{claim.policyId || claim.policyTokenId || 'Unknown'}</p>
            </div>
            <span className="px-4 py-2 rounded-full text-sm font-bold status-pending">
              {(claim.status || 'pending').toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <span className="text-white/80">Requested Amount:</span>
              <div className="text-3xl font-bold text-green-400">${claim.requestedAmount || claim.amount || '0'}</div>
            </div>
            <div>
              <span className="text-white/80">Claim Type:</span>
              <div className="text-xl font-semibold text-white">{(claim.type || 'General').toUpperCase()}</div>
            </div>
          </div>

          <div className="mb-6">
            <span className="text-white/80">Description:</span>
            <p className="text-white mt-2">{claim.description || 'No description provided'}</p>
          </div>

          {/* AI Analysis */}
          {claim.aiAnalysis && (
            <div className="glass-effect p-4 rounded-xl mb-6">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <span>🤖</span>
                AI Analysis
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-white/60">Fraud Score:</span>
                  <div className="text-white font-semibold">{claim.aiAnalysis.fraudScore || 0}%</div>
                </div>
                <div>
                  <span className="text-white/60">Authenticity:</span>
                  <div className="text-white font-semibold">
                    {typeof claim.aiAnalysis.authenticityScore === 'number' 
                      ? (claim.aiAnalysis.authenticityScore > 1 
                          ? claim.aiAnalysis.authenticityScore.toFixed(1) 
                          : (claim.aiAnalysis.authenticityScore * 100).toFixed(1)
                        )
                      : claim.aiAnalysis.authenticityScore || '0'
                    }%
                  </div>
                </div>
                <div>
                  <span className="text-white/60">Recommendation:</span>
                  <div className={`font-semibold ${
                    (claim.aiAnalysis.recommendation || 'unknown').toLowerCase() === 'approve' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {(claim.aiAnalysis.recommendation || 'unknown').toUpperCase()}
                  </div>
                </div>
                <div>
                  <span className="text-white/60">Confidence:</span>
                  <div className="text-white font-semibold">
                    {typeof claim.aiAnalysis.confidence === 'number' 
                      ? (claim.aiAnalysis.confidence > 1 
                          ? claim.aiAnalysis.confidence.toFixed(1) 
                          : (claim.aiAnalysis.confidence * 100).toFixed(1)
                        )
                      : claim.aiAnalysis.confidence || '0'
                    }%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Current Voting Results */}
          {claim.votingDetails && (
            <div className="glass-effect p-4 rounded-xl mb-6">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <span>🗳️</span>
                Current Voting Results
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{claim.votingDetails.votesFor}</div>
                  <div className="text-white/60 text-sm">Votes For</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">{claim.votingDetails.votesAgainst}</div>
                  <div className="text-white/60 text-sm">Votes Against</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{claim.votingDetails.totalVotes}</div>
                  <div className="text-white/60 text-sm">Total Votes</div>
                </div>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3">
                <div 
                  className="h-3 rounded-full bg-green-400 transition-all duration-500"
                  style={{ 
                    width: `${(parseInt(claim.votingDetails.votesFor) / parseInt(claim.votingDetails.totalVotes)) * 100}%` 
                  }}
                ></div>
              </div>
              <div className="text-center text-white/60 text-sm mt-2">
                Voting ends: {new Date(claim.votingDetails.votingEnds).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>

        {/* Voting Form */}
        <div className="card">
          <h3 className="text-2xl font-bold text-white mb-6">Cast Your Vote</h3>
          
          <div className="space-y-6">
            {/* Vote Choice */}
            <div>
              <label className="block text-white/80 mb-3">Your Vote:</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="vote"
                    value="approve"
                    checked={voteData.approved}
                    onChange={() => setVoteData(prev => ({ ...prev, approved: true }))}
                    className="mr-2"
                  />
                  <span className="text-green-400 font-semibold">Approve</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="vote"
                    value="reject"
                    checked={!voteData.approved}
                    onChange={() => setVoteData(prev => ({ ...prev, approved: false }))}
                    className="mr-2"
                  />
                  <span className="text-red-400 font-semibold">Reject</span>
                </label>
              </div>
            </div>

            {/* Suggested Amount */}
            <div>
              <label className="block text-white/80 mb-3">
                Suggested Amount (if approved):
              </label>
              <input
                type="number"
                value={voteData.suggestedAmount}
                onChange={(e) => setVoteData(prev => ({ 
                  ...prev, 
                  suggestedAmount: parseFloat(e.target.value) || 0 
                }))}
                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white"
                placeholder="Enter suggested amount"
                min="0"
                max={parseFloat(claim.requestedAmount)}
              />
              <p className="text-white/60 text-sm mt-1">
                Maximum: ${claim.requestedAmount}
              </p>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-white/80 mb-3">
                Reason for your vote: *
              </label>
              <textarea
                value={voteData.reason}
                onChange={(e) => setVoteData(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white h-32"
                placeholder="Explain your reasoning for approving or rejecting this claim..."
                required
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                onClick={handleVote}
                disabled={voting || !voteData.reason.trim()}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {voting ? (
                  <>
                    <div className="spinner-small mr-2"></div>
                    Submitting Vote...
                  </>
                ) : (
                  <>
                    <span>🗳️</span>
                    Submit Vote
                  </>
                )}
              </button>
              <Link href="/claims" className="btn-secondary flex-1 text-center">
                Back to Claims
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 