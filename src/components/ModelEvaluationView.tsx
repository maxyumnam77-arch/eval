import { useEffect, useState } from 'react';
import { request } from '../api';

type Health = { database: string; grader: { ready: boolean; provider: string; model: string; availableModels: string[] }; ocrFast: boolean };
type Metrics = { samples: number; mae: number | null; withinOneMark: number | null; pearsonCorrelation: number | null; note: string;
  supervisedComparison: null | { algorithm: string; trainingRows: number; heldOutRows: number; mae: number; withinOneMark: number } };
export const ModelEvaluationView = ({ theme }: { theme: 'light' | 'dark' }) => {
  const [health, setHealth] = useState<Health | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([request<Health>('/health'), request<Metrics>('/evaluation')])
      .then(([h, m]) => { setHealth(h); setMetrics(m); })
      .catch(e => setError((e as Error).message));
  }, []);
  const card = `alpine-card ${theme === 'light' ? 'light-theme text-slate-900' : 'text-slate-100'} p-5`;
  return <div className="space-y-5">
    <header className={card}>
      <h2 className="font-bold text-lg">Model & Evaluation</h2>
      <p className="text-xs opacity-70">Live system status and teacher-marked evaluation data. No simulated accuracy claims.</p>
    </header>
    {error && <div role="alert" className={card}>{error}</div>}
    <div className="grid lg:grid-cols-2 gap-5">
      <section className={`${card} space-y-3`}>
        <h3 className="font-bold">Descriptive grader</h3>
        <p className="text-sm">Algorithm: pretrained Qwen transformer, prompted with the teacher-approved question, reference answer, and weighted rubric. This project does not train Qwen's weights.</p>
        <p className="text-sm"><strong>Local model:</strong> {health?.grader.model || 'Checking…'} ({health?.grader.provider || 'local'})</p>
        <p className={`text-sm font-bold ${health?.grader.ready ? 'text-emerald-500' : 'text-amber-500'}`}>
          {health?.grader.ready ? 'Ready' : 'Not running or model unavailable'}</p>
        <p className="text-xs opacity-75">The model proposes marks and quotes from the student answer. Code checks each quote, bounds criterion scores, and sums the final mark out of the teacher's maximum.</p>
        <p className="text-xs opacity-75">OCR: Fast uses a local Paddle service; Accurate uses the configured Qwen vision model. The teacher checks and corrects the transcript before grading.</p>
      </section>
      <section className={`${card} space-y-3`}>
        <h3 className="font-bold">MCQ & teacher evaluation</h3>
        <p className="text-sm">MCQ algorithm: exact answer-key comparison, 1 mark for the correct choice and 0 for wrong or blank. No machine learning is used for this step.</p>
        <p className="text-sm"><strong>Teacher-marked answers:</strong> {metrics?.samples ?? 'Loading…'}</p>
        <p className="text-sm"><strong>Mean absolute error:</strong> {metrics?.mae == null ? 'Not measured yet' : metrics.mae}</p>
        <p className="text-sm"><strong>Within one mark:</strong> {metrics?.withinOneMark == null ? 'Not measured yet' : `${Math.round(metrics.withinOneMark * 100)}%`}</p>
        <p className="text-sm"><strong>Pearson correlation:</strong> {metrics?.pearsonCorrelation == null ? 'Not measured yet' : metrics.pearsonCorrelation}</p>
        <p className="text-xs opacity-75">Record independent teacher marks in Results & Review. Small or self-selected samples do not establish general accuracy; use a held-out set of varied answers for the report.</p>
      </section>
    </div>
    <section className={card}>
      <h3 className="font-bold mb-2">Supervised comparison model</h3>
      {metrics?.supervisedComparison ? <p className="text-sm">{metrics.supervisedComparison.algorithm}: trained on {metrics.supervisedComparison.trainingRows} labeled answers; question-held-out MAE {metrics.supervisedComparison.mae} over {metrics.supervisedComparison.heldOutRows} answers. This is a separate baseline, not the live scorer.</p>
        : <p className="text-sm">Not trained in this rebuild. Record enough independent teacher labels, then run the separate training script. No baseline accuracy is claimed yet.</p>}
    </section>
    <section className={card}>
      <h3 className="font-bold mb-2">What to tell the teacher</h3>
      <ul className="text-sm space-y-1 list-disc pl-5">
        <li>The live descriptive grader is pretrained-model inference with rubric prompting, not supervised training performed in this rebuild.</li>
        <li>Question-specific rubrics and maximum marks are entered and approved in Question Bank, then stored in SQLite with a version.</li>
        <li>Student answers, OCR corrections, criterion evidence, scores, overrides, and teacher labels are stored locally in SQLite.</li>
        <li>A separate supervised Gradient Boosting comparison can be trained only after enough independent teacher-scored examples are collected. It is not the live scorer.</li>
      </ul>
    </section>
  </div>;
};
