'use client';

import { useState, useEffect } from 'react';
import VotingPanel from '../../components/VotingPanel';
import { useWeb3 } from '../../context/Web3Context';
import { useParams, useRouter } from 'next/navigation';
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

interface VotingDetails {
  votesFor: string;
  votesAgainst: string;
  totalVotes: string;
  votingEnds: string;
  jurors?: string[];
  averageAmount?: string;
  concluded?: boolean;
}

export default function ClaimDetailsPage() {
  const { account, isConnected, connectWallet } = useWeb3();
  const params = useParams();
  const router = useRouter();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [votingDetails, setVotingDetails] = useState<VotingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);

  const claimId = params.id as string;

  useEffect(() => {
    if (claimId) {
      loadClaimDetails();
    }
  }, [claimId]);

  const loadClaimDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // First try to get claim from localStorage (submitted claims)
      const submittedClaims = JSON.parse(localStorage.getItem('submittedClaims') || '[]');
      const localClaim = submittedClaims.find(c => c.id === claimId || c.claimId === claimId);
      
      if (localClaim) {
        console.log('Found claim in localStorage:', localClaim);
        setClaim(localClaim);
        setLoading(false);
        return;
      }

      // If no local claim found, create a fallback claim for testing
      console.log('No claim found in localStorage, creating fallback claim');
      const fallbackClaim = {
        id: claimId,
        claimId: claimId,
        policyTokenId: '1',
        claimant: '0x8BebaDf625b932811Bf71fBa961ed067b5770EfA',
        amount: '500',
        description: 'Sample claim for testing purposes',
        status: 'pending',
        submittedAt: new Date().toISOString(),
        evidenceHashes: ['QmSampleEvidence1', 'QmSampleEvidence2'],
        transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
        aiAnalysis: {
          fraudScore: 25,
          authenticityScore: 85,
          recommendation: 'APPROVE',
          reasoning: 'AI analysis completed - low fraud risk',
          confidence: 75
        },
        votingDetails: {
          votesFor: '0',
          votesAgainst: '0',
          totalVotes: '0',
          votingEnds: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      };
      
      setClaim(fallbackClaim);
      setLoading(false);
      return;

      // If not found locally, try backend
      let claimData = null;
      try {
        const claimResponse = await fetch(`http://localhost:3000/api/v1/claims/${claimId}`);
        if (claimResponse.ok) {
          claimData = await claimResponse.json();
          setClaim(claimData);
        } else {
          throw new Error('Claim not found');
        }
      } catch (backendError) {
        console.warn('Backend claim fetch failed:', backendError);
        throw new Error('Claim not found');
      }

      // Get voting details if claim is under review
      const currentClaim = localClaim || claimData;
      if (currentClaim && (currentClaim.status === 'pending' || currentClaim.status === 'under_review')) {
        try {
          const votingResponse = await fetch(`http://localhost:3000/api/v1/claims/${claimId}/voting-details`);
          if (votingResponse.ok) {
            const votingData = await votingResponse.json();
            setVotingDetails(votingData.votingDetails);
          }
        } catch (votingError) {
          console.warn('Could not load voting details:', votingError);
        }
      }
    } catch (error) {
      console.error('Error loading claim details:', error);
      setError(error instanceof Error ? error.message : 'Failed to load claim details');
    } finally {
      setLoading(false);
    }
  };

  const submitVote = async ({ decision, percent, confidence, rationale }: { decision: 'approve'|'partial'|'reject'; percent?: number; confidence: number; rationale: string; }) => {
    if (!account) return;
    try {
      setVoting(true);
      const payload = { claimId, voter: account, decision, percent, confidence, rationale };
      const response = await fetch('http://localhost:3000/api/v1/claims/vote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Vote failed');
      await loadClaimDetails();
    } finally {
      setVoting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-400';
      case 'rejected': return 'text-red-400';
      case 'pending': return 'text-yellow-400';
      case 'under_review': return 'text-blue-400';
      default: return 'text-white/70';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      case 'pending': return 'status-pending';
      case 'under_review': return 'status-pending';
      default: return 'status-pending';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="card text-center">
            <h1 className="text-4xl font-bold gradient-text mb-6">Claim Details</h1>
            <p className="text-white/80 text-xl mb-8">
              Connect your wallet to view claim details and voting status
            </p>
            <button 
              onClick={connectWallet}
              className="metamask-btn mx-auto"
            >
              <span>🦊</span>
              Connect MetaMask
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="card text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-white/80">Loading claim details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="card text-center">
            <h1 className="text-4xl font-bold gradient-text mb-6">Claim Not Found</h1>
            <p className="text-white/80 text-xl mb-8">
              {error || 'The requested claim could not be found'}
            </p>
            <Link href="/claims" className="btn-primary">
              Back to Claims
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Claim Details
            </h1>
            <p className="text-white/60">Claim ID: {claim.claimId}</p>
          </div>
          <Link href="/claims" className="btn-secondary">
            ← Back to Claims
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Claim Information */}
          <div className="lg:col-span-2">
            <div className="card mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Claim Information</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadge(claim.status || 'unknown')}`}>
                  {(claim.status || 'unknown').replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white/60 text-sm font-medium mb-2">Policy ID</label>
                  <p className="text-white font-semibold">{claim.policyId || claim.policyTokenId || 'Unknown'}</p>
                </div>
                <div>
                  <label className="block text-white/60 text-sm font-medium mb-2">Claim Type</label>
                  <p className="text-white font-semibold capitalize">{claim.type || claim.claimType || 'General'}</p>
                </div>
                <div>
                  <label className="block text-white/60 text-sm font-medium mb-2">Requested Amount</label>
                  <p className="text-white font-semibold">${claim.requestedAmount || claim.amount || '0'}</p>
                </div>
                {(claim.approvedAmount || claim.approvedAmount === 0) && (
                  <div>
                    <label className="block text-white/60 text-sm font-medium mb-2">Approved Amount</label>
                    <p className="text-white font-semibold">${claim.approvedAmount}</p>
                  </div>
                )}
                <div>
                  <label className="block text-white/60 text-sm font-medium mb-2">Submitted By</label>
                  <p className="text-white font-semibold">{formatAddress(claim.userId || claim.claimant || 'Unknown')}</p>
                </div>
                <div>
                  <label className="block text-white/60 text-sm font-medium mb-2">Submitted At</label>
                  <p className="text-white font-semibold">{formatDate(claim.createdAt || claim.submittedAt || new Date().toISOString())}</p>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-white/60 text-sm font-medium mb-2">Description</label>
                <p className="text-white bg-white/5 p-4 rounded-lg">{claim.description || 'No description provided'}</p>
              </div>

              {(claim.documents || claim.evidenceHashes) && (claim.documents?.length > 0 || claim.evidenceHashes?.length > 0) && (
                <div className="mt-6">
                  <label className="block text-white/60 text-sm font-medium mb-2">Evidence Files</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(claim.documents || claim.evidenceHashes || []).map((doc, index) => (
                      <div key={index} className="bg-white/5 p-3 rounded-lg">
                        <p className="text-white text-sm">Evidence #{index + 1}</p>
                        <p className="text-white/60 text-xs">{doc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(claim.transactionHash || claim.txHash) && (
                <div className="mt-6">
                  <label className="block text-white/60 text-sm font-medium mb-2">Transaction Hash</label>
                  <a 
                    href={`https://sepolia.arbiscan.io/tx/${claim.transactionHash || claim.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 break-all"
                  >
                    {claim.transactionHash || claim.txHash}
                  </a>
                </div>
              )}
            </div>

            {/* AI Analysis */}
            {claim.aiAnalysis && (
              <div className="card mb-6">
                <h3 className="text-xl font-bold text-white mb-4">AI Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/60 text-sm font-medium mb-2">Fraud Score</label>
                    <p className="text-white font-semibold">{claim.aiAnalysis.fraudScore || 0}%</p>
                  </div>
                  <div>
                    <label className="block text-white/60 text-sm font-medium mb-2">Authenticity Score</label>
                    <p className="text-white font-semibold">
                      {typeof claim.aiAnalysis.authenticityScore === 'number' 
                        ? (claim.aiAnalysis.authenticityScore > 1 
                            ? claim.aiAnalysis.authenticityScore.toFixed(1) 
                            : (claim.aiAnalysis.authenticityScore * 100).toFixed(1)
                          )
                        : claim.aiAnalysis.authenticityScore || '0'
                      }%
                    </p>
                  </div>
                  <div>
                    <label className="block text-white/60 text-sm font-medium mb-2">Recommendation</label>
                    <p className="text-white font-semibold capitalize">{claim.aiAnalysis.recommendation || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="block text-white/60 text-sm font-medium mb-2">Confidence</label>
                    <p className="text-white font-semibold">
                      {typeof claim.aiAnalysis.confidence === 'number' 
                        ? (claim.aiAnalysis.confidence > 1 
                            ? claim.aiAnalysis.confidence.toFixed(1) 
                            : (claim.aiAnalysis.confidence * 100).toFixed(1)
                          )
                        : claim.aiAnalysis.confidence || '0'
                      }%
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-white/60 text-sm font-medium mb-2">Reasoning</label>
                  <p className="text-white bg-white/5 p-4 rounded-lg">{claim.aiAnalysis.reasoning || 'No reasoning provided'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Voting Section */}
          <div className="lg:col-span-1">
            {/* Voting Status */}
            {votingDetails && (
              <div className="card mb-6">
                <h3 className="text-xl font-bold text-white mb-4">Voting Status</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-white/60 text-sm font-medium mb-2">Votes For</label>
                    <p className="text-green-400 font-semibold">{votingDetails.votesFor}</p>
                  </div>
                  <div>
                    <label className="block text-white/60 text-sm font-medium mb-2">Votes Against</label>
                    <p className="text-red-400 font-semibold">{votingDetails.votesAgainst}</p>
                  </div>
                  <div>
                    <label className="block text-white/60 text-sm font-medium mb-2">Total Votes</label>
                    <p className="text-white font-semibold">{votingDetails.totalVotes}</p>
                  </div>
                  {votingDetails.votingEnds && (
                    <div>
                      <label className="block text-white/60 text-sm font-medium mb-2">Voting Ends</label>
                      <p className="text-white font-semibold">{formatDate(votingDetails.votingEnds)}</p>
                    </div>
                  )}
                  {votingDetails.concluded && (
                    <div className="bg-green-400/10 border border-green-400/20 p-3 rounded-lg">
                      <p className="text-green-400 font-semibold">Voting Concluded</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(claim.status === 'pending' || claim.status === 'under_review') && (
              <VotingPanel claimId={claimId} onSubmit={submitVote} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 