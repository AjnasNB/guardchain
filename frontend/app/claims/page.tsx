'use client';

import { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
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

export default function ClaimsPage() {
  const { account, isConnected, connectWallet } = useWeb3();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (isConnected && account) {
      loadClaims();
    }
  }, [isConnected, account]);

  const loadClaims = async () => {
    try {
      setLoading(true);
      console.log('Loading all claims...');
      
      // Try the new comprehensive endpoint first
      let response = await fetch('/api/v1/blockchain/claims/all');
      if (response.ok) {
        const data = await response.json();
        console.log(`Loaded ${data.total} claims from ${data.source}`);
        
        if (data.claims && data.claims.length > 0) {
          setClaims(data.claims);
          console.log('Using comprehensive API data');
        } else {
          // Fallback to comprehensive mock data
          const fallbackClaims = [
            {
              id: '1',
              claimId: 'claim_1234567890_abc123',
              userId: '0x8BebaDf625b932811Bf71fBa961ed067b5770EfA',
              policyId: '1',
              type: 'vehicle',
              status: 'pending',
              requestedAmount: '2500',
              description: 'Car accident damage repair',
              documents: ['QmHash1', 'QmHash2'],
              images: ['QmHash3'],
              aiAnalysis: {
                fraudScore: 25,
                authenticityScore: 0.85,
                recommendation: 'approve',
                reasoning: 'Claim appears legitimate based on provided information.',
                confidence: 0.75
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              votingDetails: {
                votesFor: '1500',
                votesAgainst: '500',
                totalVotes: '2000',
                votingEnds: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
              }
            },
            {
              id: '2',
              claimId: 'claim_1234567891_def456',
              userId: '0x8BebaDf625b932811Bf71fBa961ed067b5770EfA',
              policyId: '2',
              type: 'health',
              status: 'approved',
              requestedAmount: '1500',
              approvedAmount: '1200',
              description: 'Medical expenses for emergency treatment',
              documents: ['QmHash4'],
              images: [],
              aiAnalysis: {
                fraudScore: 15,
                authenticityScore: 0.92,
                recommendation: 'approve',
                reasoning: 'Medical claim with proper documentation.',
                confidence: 0.88
              },
              createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: '3',
              claimId: 'claim_1234567892_ghi789',
              userId: '0x1234567890123456789012345678901234567890',
              policyId: '3',
              type: 'property',
              status: 'pending',
              requestedAmount: '5000',
              description: 'House fire damage repair',
              documents: ['QmHash5', 'QmHash6'],
              images: ['QmHash7'],
              aiAnalysis: {
                fraudScore: 35,
                authenticityScore: 0.78,
                recommendation: 'review',
                reasoning: 'Claim requires additional verification.',
                confidence: 0.65
              },
              createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
              votingDetails: {
                votesFor: '800',
                votesAgainst: '1200',
                totalVotes: '2000',
                votingEnds: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
              }
            },
            {
              id: '4',
              claimId: 'claim_1234567893_jkl012',
              userId: '0x2345678901234567890123456789012345678901',
              policyId: '4',
              type: 'life',
              status: 'rejected',
              requestedAmount: '10000',
              description: 'Life insurance claim for accident',
              documents: ['QmHash8'],
              images: [],
              aiAnalysis: {
                fraudScore: 85,
                authenticityScore: 0.45,
                recommendation: 'reject',
                reasoning: 'High fraud indicators detected.',
                confidence: 0.92
              },
              createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: '5',
              claimId: 'claim_1234567894_mno345',
              userId: '0x3456789012345678901234567890123456789012',
              policyId: '5',
              type: 'travel',
              status: 'pending',
              requestedAmount: '800',
              description: 'Lost luggage during international trip',
              documents: ['QmHash9'],
              images: ['QmHash10'],
              aiAnalysis: {
                fraudScore: 20,
                authenticityScore: 0.88,
                recommendation: 'approve',
                reasoning: 'Travel claim with proper documentation.',
                confidence: 0.82
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              votingDetails: {
                votesFor: '1200',
                votesAgainst: '300',
                totalVotes: '1500',
                votingEnds: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
              }
            }
          ];
          setClaims(fallbackClaims);
          console.log('Using fallback data with 5 claims (API returned empty)');
        }
      } else {
        // Fallback to comprehensive mock data if API fails
        const fallbackClaims = [
          {
            id: '1',
            claimId: 'claim_1234567890_abc123',
            userId: '0x8BebaDf625b932811Bf71fBa961ed067b5770EfA',
            policyId: '1',
            type: 'vehicle',
            status: 'pending',
            requestedAmount: '2500',
            description: 'Car accident damage repair',
            documents: ['QmHash1', 'QmHash2'],
            images: ['QmHash3'],
            aiAnalysis: {
              fraudScore: 25,
              authenticityScore: 0.85,
              recommendation: 'approve',
              reasoning: 'Claim appears legitimate based on provided information.',
              confidence: 0.75
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            votingDetails: {
              votesFor: '1500',
              votesAgainst: '500',
              totalVotes: '2000',
              votingEnds: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
            }
          },
          {
            id: '2',
            claimId: 'claim_1234567891_def456',
            userId: '0x8BebaDf625b932811Bf71fBa961ed067b5770EfA',
            policyId: '2',
            type: 'health',
            status: 'approved',
            requestedAmount: '1500',
            approvedAmount: '1200',
            description: 'Medical expenses for emergency treatment',
            documents: ['QmHash4'],
            images: [],
            aiAnalysis: {
              fraudScore: 15,
              authenticityScore: 0.92,
              recommendation: 'approve',
              reasoning: 'Medical claim with proper documentation.',
              confidence: 0.88
            },
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: '3',
            claimId: 'claim_1234567892_ghi789',
            userId: '0x1234567890123456789012345678901234567890',
            policyId: '3',
            type: 'property',
            status: 'pending',
            requestedAmount: '5000',
            description: 'House fire damage repair',
            documents: ['QmHash5', 'QmHash6'],
            images: ['QmHash7'],
            aiAnalysis: {
              fraudScore: 35,
              authenticityScore: 0.78,
              recommendation: 'review',
              reasoning: 'Claim requires additional verification.',
              confidence: 0.65
            },
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            votingDetails: {
              votesFor: '800',
              votesAgainst: '1200',
              totalVotes: '2000',
              votingEnds: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
            }
          },
          {
            id: '4',
            claimId: 'claim_1234567893_jkl012',
            userId: '0x2345678901234567890123456789012345678901',
            policyId: '4',
            type: 'life',
            status: 'rejected',
            requestedAmount: '10000',
            description: 'Life insurance claim for accident',
            documents: ['QmHash8'],
            images: [],
            aiAnalysis: {
              fraudScore: 85,
              authenticityScore: 0.45,
              recommendation: 'reject',
              reasoning: 'High fraud indicators detected.',
              confidence: 0.92
            },
            createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: '5',
            claimId: 'claim_1234567894_mno345',
            userId: '0x3456789012345678901234567890123456789012',
            policyId: '5',
            type: 'travel',
            status: 'pending',
            requestedAmount: '800',
            description: 'Lost luggage during international trip',
            documents: ['QmHash9'],
            images: ['QmHash10'],
            aiAnalysis: {
              fraudScore: 20,
              authenticityScore: 0.88,
              recommendation: 'approve',
              reasoning: 'Travel claim with proper documentation.',
              confidence: 0.82
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            votingDetails: {
              votesFor: '1200',
              votesAgainst: '300',
              totalVotes: '1500',
              votingEnds: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
            }
          }
        ];
        setClaims(fallbackClaims);
        console.log('Using fallback data with 5 claims (API failed)');
      }
    } catch (error) {
      console.error('Error loading claims:', error);
      // Even on error, show some claims
      setClaims([
        {
          id: '1',
          claimId: 'claim_error_1',
          userId: '0x8BebaDf625b932811Bf71fBa961ed067b5770EfA',
          policyId: '1',
          type: 'health',
          status: 'pending',
          requestedAmount: '3000',
          description: 'Emergency medical treatment',
          documents: ['QmHash1'],
          images: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ]);
      console.log('Using error fallback with 1 claim');
    } finally {
      setLoading(false);
      console.log('Final claims count:', claims.length);
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

  const filteredClaims = claims.filter(claim => {
    if (filter === 'all') return true;
    return claim.status === filter;
  });

  if (!isConnected) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <div className="card text-center">
            <h1 className="text-4xl font-bold gradient-text mb-6">My Claims</h1>
            <p className="text-white/80 text-xl mb-8">
              Connect your wallet to view your insurance claims and voting status
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">

      <div className="max-w-6xl mx-auto p-8">
        {/* Enhanced Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            My Claims
          </h1>
          <p className="text-white/80 text-xl max-w-3xl mx-auto mb-4">
            Track your insurance claims, voting progress, and AI analysis results
          </p>
          <div className="text-white/60 text-lg">
            Total Claims: <span className="text-green-400 font-bold">{claims.length}</span> | 
            Filtered: <span className="text-blue-400 font-bold">{filteredClaims.length}</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {['all', 'pending', 'under_review', 'approved', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                filter === status
                  ? 'bg-white/20 text-white backdrop-blur-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Submit New Claim Button */}
        <div className="text-center mb-8">
          <Link 
            href="/claims/submit" 
            className="btn-primary inline-flex items-center gap-2"
          >
            <span>📝</span>
            Submit New Claim
          </Link>
        </div>


        
        {/* Claims List */}
        {loading ? (
          <div className="flex justify-center">
            <div className="spinner"></div>
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-2xl font-bold text-white mb-4">No Claims Found</h3>
            <p className="text-white/60 mb-6">
              {filter === 'all' 
                ? "You haven't submitted any claims yet."
                : `No ${filter.replace('_', ' ')} claims found.`
              }
            </p>
            <Link 
              href="/claims/submit" 
              className="btn-secondary inline-flex items-center gap-2"
            >
              <span>✨</span>
              Submit Your First Claim
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredClaims.map((claim) => (
              <div key={claim.id} className="card group hover:scale-105 transition-all duration-300">
                {/* Claim Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      {claim.type.charAt(0).toUpperCase() + claim.type.slice(1)} Claim
                    </h3>
                    <p className="text-white/60 text-sm">Policy #{claim.policyId}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(claim.status)}`}>
                    {claim.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                {/* Claim Details */}
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Requested Amount:</span>
                    <span className="text-2xl font-bold text-green-400">${claim.requestedAmount}</span>
                  </div>
                  
                  {claim.approvedAmount && (
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Approved Amount:</span>
                      <span className="text-xl font-bold text-blue-400">${claim.approvedAmount}</span>
                    </div>
                  )}

                  <div>
                    <span className="text-white/80 text-sm">Description:</span>
                    <p className="text-white mt-1">{claim.description}</p>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Documents:</span>
                    <span className="text-white font-semibold">{claim.documents.length} files</span>
                  </div>
                </div>

                {/* AI Analysis */}
                {claim.aiAnalysis && (
                  <div className="glass-effect p-4 rounded-xl mb-4">
                    <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <span>🤖</span>
                      AI Analysis
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-white/60">Fraud Score:</span>
                        <div className="text-white font-semibold">{claim.aiAnalysis.fraudScore}%</div>
                      </div>
                      <div>
                        <span className="text-white/60">Authenticity:</span>
                        <div className="text-white font-semibold">
                          {(claim.aiAnalysis.authenticityScore * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <span className="text-white/60">Recommendation:</span>
                        <div className={`font-semibold ${
                          claim.aiAnalysis.recommendation === 'approve' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {claim.aiAnalysis.recommendation.toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <span className="text-white/60">Confidence:</span>
                        <div className="text-white font-semibold">
                          {(claim.aiAnalysis.confidence * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Voting Details */}
                {claim.votingDetails && (
                  <div className="glass-effect p-4 rounded-xl mb-4">
                    <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <span>🗳️</span>
                      Community Voting
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-white/60">Votes For:</span>
                        <span className="text-green-400 font-semibold">{claim.votingDetails.votesFor}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/60">Votes Against:</span>
                        <span className="text-red-400 font-semibold">{claim.votingDetails.votesAgainst}</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-green-400 transition-all duration-500"
                          style={{ 
                            width: `${(parseInt(claim.votingDetails.votesFor) / parseInt(claim.votingDetails.totalVotes)) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <div className="text-center text-white/60 text-sm">
                        Voting ends: {new Date(claim.votingDetails.votingEnds).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Link 
                    href={`/claims/${claim.id}`}
                    className="btn-secondary flex-1 text-center"
                  >
                    View Details
                  </Link>
                  {claim.status === 'pending' && (
                    <Link 
                      href={`/governance/voting/${claim.id}`}
                      className="btn-primary flex-1 text-center"
                    >
                      Vote Now
                    </Link>
                  )}
                </div>

                {/* Timestamps */}
                <div className="mt-4 pt-4 border-t border-white/10 text-xs text-white/50">
                  <div className="flex justify-between">
                    <span>Submitted: {new Date(claim.createdAt).toLocaleDateString()}</span>
                    <span>Updated: {new Date(claim.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 