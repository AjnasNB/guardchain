import React, { useState } from 'react';

type Props = {
  claimId: string;
  onSubmit: (data: { decision: 'approve'|'partial'|'reject'; percent?: number; confidence: number; rationale: string; }) => Promise<void>;
};

const VotingPanel: React.FC<Props> = ({ claimId, onSubmit }) => {
  const [decision, setDecision] = useState<'approve'|'partial'|'reject'>('approve');
  const [percent, setPercent] = useState<number>(100);
  const [confidence, setConfidence] = useState<number>(75);
  const [rationale, setRationale] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({ decision, percent: decision === 'partial' ? percent : undefined, confidence: confidence / 100, rationale });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg">
      <div className="mb-4">
        <h3 className="text-xl font-semibold">Jury Vote</h3>
        <p className="text-white/70 text-sm">Claim: {claimId}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <button onClick={() => setDecision('approve')} className={`px-3 py-2 rounded-lg ${decision==='approve'?'bg-green-600':'bg-white/10'}`}>Approve</button>
        <button onClick={() => setDecision('partial')} className={`px-3 py-2 rounded-lg ${decision==='partial'?'bg-amber-600':'bg-white/10'}`}>Partial</button>
        <button onClick={() => setDecision('reject')} className={`px-3 py-2 rounded-lg ${decision==='reject'?'bg-red-600':'bg-white/10'}`}>Reject</button>
      </div>

      {decision==='partial' && (
        <div className="mb-4">
          <label className="text-sm block mb-1">Partial payout (%)</label>
          <input type="range" min={10} max={90} step={10} value={percent} onChange={e=>setPercent(parseInt(e.target.value))} className="w-full" />
          <div className="text-sm">{percent}%</div>
        </div>
      )}

      <div className="mb-4">
        <label className="text-sm block mb-1">Confidence (50% - 100%)</label>
        <input type="range" min={50} max={100} step={1} value={confidence} onChange={e=>setConfidence(parseInt(e.target.value))} className="w-full" />
        <div className="text-sm">{confidence}%</div>
      </div>

      <div className="mb-4">
        <label className="text-sm block mb-1">Rationale</label>
        <textarea className="w-full rounded-lg bg-white/10 p-2" rows={3} placeholder="Briefly explain your reasoning" value={rationale} onChange={e=>setRationale(e.target.value)} />
      </div>

      <button disabled={submitting} onClick={handleSubmit} className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition">{submitting? 'Submitting...' : 'Submit Vote'}</button>
    </div>
  );
};

export default VotingPanel;
