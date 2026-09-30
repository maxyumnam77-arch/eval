import { useEffect, useState } from 'react';

export type WorkPhase = 'idle' | 'reading' | 'review' | 'grading' | 'ready';

export function WorkProgress({ phase, busy, scanned, mode = 'answer' }: { phase: WorkPhase; busy: boolean; scanned: boolean; mode?: 'answer' | 'mcq' }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!busy) return;
    const start = Date.now(); setSeconds(0);
    const interval = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [busy, phase]);
  if (phase === 'idle') return null;
  const steps = scanned ? ['reading', 'review', 'grading', 'ready'] : phase === 'review' ? ['review', 'grading', 'ready'] : ['grading', 'ready'];
  const labels: Record<string, string> = mode === 'mcq'
    ? { reading: 'Detect marks', review: 'Verify choices', grading: 'Score & save', ready: 'Result ready' }
    : { reading: 'Read images', review: 'Review text', grading: 'Grade & save', ready: 'Result ready' };
  const index = steps.indexOf(phase);
  return <div role="status" aria-live="polite" className="rounded-xl border border-blue-400/40 p-3 text-xs space-y-2">
    <ol className="flex flex-wrap gap-2">{steps.map((step, i) => <li key={step}
      aria-current={step === phase ? 'step' : undefined} className={`rounded-lg px-2 py-1 ${i === index ? 'bg-blue-600 text-white' : i < index ? 'bg-emerald-500/15' : 'opacity-50'}`}>
      {i < index ? '✓ ' : ''}{labels[step]}</li>)}</ol>
    {busy && <p>{phase === 'reading' ? mode === 'mcq' ? 'Reading marked choices from the sheet' : 'Uploading and reading the answer pages'
      : phase === 'grading' ? mode === 'mcq' ? 'Scoring and saving your choices' : 'Grading and saving your result' : 'Updating saved history'} · {seconds}s elapsed</p>}
    {phase === 'review' && !busy && <p>{mode === 'mcq' ? 'Verify every detected choice before scoring.' : scanned ? 'Check the extracted words before confirming.' : 'Review the saved answer text, then confirm to grade.'}</p>}
  </div>;
}
