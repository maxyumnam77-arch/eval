import React from 'react';
import {
  BrainCircuit,
  Binary,
  Workflow,
  AlertTriangle,
  Info,
  Scale,
} from 'lucide-react';

interface ModelEvaluationViewProps {
  theme?: 'light' | 'dark';
}

export const ModelEvaluationView: React.FC<ModelEvaluationViewProps> = ({
  theme = 'light',
}) => {
  const isDark = theme === 'dark';

  return (
    <div className={`space-y-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
      {/* Banner */}
      <div
        className={`p-6 rounded-2xl backdrop-blur-md border transition-colors ${
          isDark
            ? 'bg-white/10 border-white/20 text-white'
            : 'bg-white/65 border-slate-300/80 text-slate-900 shadow-xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`w-8 h-8 rounded-xl border flex items-center justify-center ${
                  isDark
                    ? 'bg-blue-500/25 border-blue-400/40 text-blue-200'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}
              >
                <BrainCircuit className={`w-5 h-5 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
              </span>
              <h2 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Planned Model Architecture & Evaluation Framework
              </h2>
            </div>
            <p className={`text-xs leading-relaxed max-w-3xl ${isDark ? 'text-blue-100/80' : 'text-slate-600'}`}>
              Comparative analysis of the planned <strong>Qwen Rubric Grader</strong> and the separate{' '}
              <strong>Supervised Gradient Boosting Comparison Model</strong>. No fabricated accuracy
              statistics are reported prior to formal dataset benchmarking.
            </p>
          </div>

          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono shrink-0 ${
              isDark
                ? 'bg-blue-500/20 border-blue-400/30 text-blue-200'
                : 'bg-blue-50 border-blue-200 text-blue-800 font-semibold'
            }`}
          >
            <Info className={`w-3.5 h-3.5 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
            <span>Prototype Architecture Specification</span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Model Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* MODEL A: Planned Qwen Rubric Grader */}
        <div
          className={`alpine-card ${
            !isDark ? 'light-theme' : ''
          } p-6 flex flex-col justify-between space-y-5 transition-colors ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          <div className="space-y-4">
            <div
              className={`flex items-center justify-between pb-3 border-b ${
                isDark ? 'border-white/15' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
                    isDark
                      ? 'bg-indigo-500/25 border-indigo-400/40 text-indigo-200'
                      : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                  }`}
                >
                  <Workflow className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Planned Qwen Rubric Grader
                  </h3>
                  <span
                    className={`text-xs font-mono font-medium ${
                      isDark ? 'text-indigo-200' : 'text-indigo-700'
                    }`}
                  >
                    LLM Multi-Step Chain-of-Thought Reasoner
                  </span>
                </div>
              </div>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded border font-semibold ${
                  isDark
                    ? 'bg-indigo-500/30 text-indigo-200 border-indigo-400/30'
                    : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                }`}
              >
                Generative / Reasoning
              </span>
            </div>

            <p className={`text-xs leading-relaxed ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
              Designed as an instruction-tuned large reasoning model (leveraging Qwen-2.5-72B-Instruct /
              Qwen2-VL) executed via multi-stage prompt engineering. It reasons directly over the
              teacher-approved rubric criteria, bounds credit within criterion limits, and extracts
              exact textual evidence spans from the candidate transcript.
            </p>

            {/* Pipeline Steps */}
            <div className="space-y-2 pt-2">
              <span
                className={`text-xs font-bold uppercase tracking-wider block ${
                  isDark ? 'text-blue-200' : 'text-slate-700'
                }`}
              >
                Multi-Step Inference Pipeline
              </span>

              <div className="space-y-2 text-xs">
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                    isDark
                      ? 'bg-black/20 border-white/10'
                      : 'bg-slate-50 border-slate-200 shadow-xs'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md font-mono text-[10px] font-bold flex items-center justify-center shrink-0 ${
                      isDark
                        ? 'bg-indigo-500/30 text-indigo-200'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    1
                  </span>
                  <div>
                    <h5 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Rubric Constraint Parsing
                    </h5>
                    <p className={`text-[11px] mt-0.5 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                      Tokenizes instructor criteria, maximum mark limits, and strict penalization boundaries.
                    </p>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                    isDark
                      ? 'bg-black/20 border-white/10'
                      : 'bg-slate-50 border-slate-200 shadow-xs'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md font-mono text-[10px] font-bold flex items-center justify-center shrink-0 ${
                      isDark
                        ? 'bg-indigo-500/30 text-indigo-200'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    2
                  </span>
                  <div>
                    <h5 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Semantic Transcript Alignment
                    </h5>
                    <p className={`text-[11px] mt-0.5 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                      Matches student explanations to each criterion regardless of phrasing, synonyms, or paragraph order.
                    </p>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                    isDark
                      ? 'bg-black/20 border-white/10'
                      : 'bg-slate-50 border-slate-200 shadow-xs'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md font-mono text-[10px] font-bold flex items-center justify-center shrink-0 ${
                      isDark
                        ? 'bg-indigo-500/30 text-indigo-200'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    3
                  </span>
                  <div>
                    <h5 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Evidence Citation & Bounded Scoring
                    </h5>
                    <p className={`text-[11px] mt-0.5 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                      Extracts verbatim evidence quotes and calculates partial credit strictly bounded between 0 and criterion maxMark.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Advantages */}
          <div
            className={`p-4 rounded-xl border text-xs space-y-1.5 ${
              isDark
                ? 'bg-indigo-500/15 border-indigo-400/30 text-white'
                : 'bg-indigo-50/70 border-indigo-200 text-slate-800'
            }`}
          >
            <span
              className={`font-semibold block ${
                isDark ? 'text-indigo-200' : 'text-indigo-900 font-bold'
              }`}
            >
              Primary Advantages:
            </span>
            <ul
              className={`list-disc list-inside text-[11px] space-y-1 ${
                isDark ? 'text-white/80' : 'text-slate-700'
              }`}
            >
              <li>Handles nuanced reasoning, conceptual paraphrasing, and non-linear answers.</li>
              <li>Generates human-readable evidence quotes and pedagogical feedback for students.</li>
              <li>Dynamically adapts to arbitrary custom rubrics without retraining.</li>
            </ul>
          </div>
        </div>

        {/* MODEL B: Supervised Gradient Boosting Comparison Model */}
        <div
          className={`alpine-card ${
            !isDark ? 'light-theme' : ''
          } p-6 flex flex-col justify-between space-y-5 transition-colors ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          <div className="space-y-4">
            <div
              className={`flex items-center justify-between pb-3 border-b ${
                isDark ? 'border-white/15' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
                    isDark
                      ? 'bg-cyan-500/25 border-cyan-400/40 text-cyan-200'
                      : 'bg-cyan-50 border-cyan-200 text-cyan-800'
                  }`}
                >
                  <Binary className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Supervised Gradient Boosting Model
                  </h3>
                  <span
                    className={`text-xs font-mono font-medium ${
                      isDark ? 'text-cyan-200' : 'text-cyan-800'
                    }`}
                  >
                    Feature-Engineered Tabular Regressor (LightGBM / XGBoost)
                  </span>
                </div>
              </div>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded border font-semibold ${
                  isDark
                    ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400/30'
                    : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                }`}
              >
                Discriminative / Baseline
              </span>
            </div>

            <p className={`text-xs leading-relaxed ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
              Designed as an interpretable, deterministic baseline. Rather than relying on autoregressive
              language modeling, it extracts an explicit feature vector from the student transcript and
              evaluates it against instructor reference answers using trained gradient-boosted decision trees.
            </p>

            {/* Feature Extraction Pipeline */}
            <div className="space-y-2 pt-2">
              <span
                className={`text-xs font-bold uppercase tracking-wider block ${
                  isDark ? 'text-blue-200' : 'text-slate-700'
                }`}
              >
                Engineered Feature Extraction Vector
              </span>

              <div className="space-y-2 text-xs">
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                    isDark
                      ? 'bg-black/20 border-white/10'
                      : 'bg-slate-50 border-slate-200 shadow-xs'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md font-mono text-[10px] font-bold flex items-center justify-center shrink-0 ${
                      isDark
                        ? 'bg-cyan-500/30 text-cyan-200'
                        : 'bg-cyan-100 text-cyan-800'
                    }`}
                  >
                    A
                  </span>
                  <div>
                    <h5 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Embedding Cosine Similarity
                    </h5>
                    <p className={`text-[11px] mt-0.5 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                      Dense sentence-BERT similarity vector between student transcript and instructor gold standard.
                    </p>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                    isDark
                      ? 'bg-black/20 border-white/10'
                      : 'bg-slate-50 border-slate-200 shadow-xs'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md font-mono text-[10px] font-bold flex items-center justify-center shrink-0 ${
                      isDark
                        ? 'bg-cyan-500/30 text-cyan-200'
                        : 'bg-cyan-100 text-cyan-800'
                    }`}
                  >
                    B
                  </span>
                  <div>
                    <h5 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Lexical Overlap & Keyword Density
                    </h5>
                    <p className={`text-[11px] mt-0.5 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                      TF-IDF n-gram matches, domain named-entity coverage, and scientific terminology presence.
                    </p>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                    isDark
                      ? 'bg-black/20 border-white/10'
                      : 'bg-slate-50 border-slate-200 shadow-xs'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md font-mono text-[10px] font-bold flex items-center justify-center shrink-0 ${
                      isDark
                        ? 'bg-cyan-500/30 text-cyan-200'
                        : 'bg-cyan-100 text-cyan-800'
                    }`}
                  >
                    C
                  </span>
                  <div>
                    <h5 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Structural Ratios & Length Metrics
                    </h5>
                    <p className={`text-[11px] mt-0.5 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                      Word count ratio vs. reference answer, syntactic depth, and vocabulary richness (TTR).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Advantages */}
          <div
            className={`p-4 rounded-xl border text-xs space-y-1.5 ${
              isDark
                ? 'bg-cyan-500/15 border-cyan-400/30 text-white'
                : 'bg-cyan-50/70 border-cyan-200 text-slate-800'
            }`}
          >
            <span
              className={`font-semibold block ${
                isDark ? 'text-cyan-200' : 'text-cyan-900 font-bold'
              }`}
            >
              Primary Advantages:
            </span>
            <ul
              className={`list-disc list-inside text-[11px] space-y-1 ${
                isDark ? 'text-white/80' : 'text-slate-700'
              }`}
            >
              <li>Near-zero latency inference (&lt;10ms per script on standard CPU hardware).</li>
              <li>Fully deterministic, reproducible outputs with zero prompt-drift risk.</li>
              <li>Provides an independent sanity check against generative LLM hallucinations.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Comparison Matrix Table */}
      <div
        className={`alpine-card ${
          !isDark ? 'light-theme' : ''
        } p-6 space-y-4 transition-colors ${
          isDark ? 'text-white' : 'text-slate-900'
        }`}
      >
        <h4 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <Scale className={`w-4 h-4 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
          Comparative Architectural Dimensions
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr
                className={`border-b font-semibold uppercase text-[11px] ${
                  isDark ? 'border-white/20 text-blue-200' : 'border-slate-300 text-slate-700'
                }`}
              >
                <th className="py-2.5 px-3">Dimension</th>
                <th className="py-2.5 px-3">Planned Qwen Rubric Grader</th>
                <th className="py-2.5 px-3">Supervised Gradient Boosting</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y ${
                isDark ? 'divide-white/10 text-white/85' : 'divide-slate-200 text-slate-700'
              }`}
            >
              <tr>
                <td className={`py-2.5 px-3 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Model Foundation
                </td>
                <td className="py-2.5 px-3">Transformer LLM (Qwen-2.5 / Qwen2-VL)</td>
                <td className="py-2.5 px-3">Gradient Boosted Decision Trees (LightGBM)</td>
              </tr>
              <tr>
                <td className={`py-2.5 px-3 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Rubric Generalization
                </td>
                <td className="py-2.5 px-3">Zero-shot / Few-shot on any custom teacher rubric</td>
                <td className="py-2.5 px-3">Requires feature re-weighting or calibrated retraining</td>
              </tr>
              <tr>
                <td className={`py-2.5 px-3 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Explanatory Evidence
                </td>
                <td className="py-2.5 px-3">Direct verbatim quote attribution + rationale</td>
                <td className="py-2.5 px-3">SHAP feature contribution values</td>
              </tr>
              <tr>
                <td className={`py-2.5 px-3 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Inference Latency
                </td>
                <td className="py-2.5 px-3">Moderate (~1.0s – 2.5s with streaming tokens)</td>
                <td className="py-2.5 px-3">Sub-millisecond tabular inference</td>
              </tr>
              <tr>
                <td className={`py-2.5 px-3 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Verification Role
                </td>
                <td className="py-2.5 px-3">Primary rubric evaluator & qualitative advisor</td>
                <td className="py-2.5 px-3">Secondary anomaly detector & calibration baseline</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Planned Benchmark Protocol Note */}
      <div
        className={`p-4 rounded-xl border text-xs flex items-start gap-3 transition-colors ${
          isDark
            ? 'bg-amber-500/15 border-amber-400/30 text-amber-200'
            : 'bg-amber-50/90 border-amber-300 text-amber-900 shadow-xs'
        }`}
      >
        <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${isDark ? 'text-amber-300' : 'text-amber-700'}`} />
        <div className="space-y-1">
          <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Formal Empirical Benchmarking Protocol (No Fabricated Stats Policy)
          </p>
          <p className={`text-[11px] leading-relaxed ${isDark ? 'text-amber-200/90' : 'text-slate-700'}`}>
            Per standard scientific protocol, quantitative metrics such as Quadratic Weighted Kappa (QWK),
            Pearson correlation ($r$), and Mean Absolute Error (MAE) will be reported following formal
            double-blind evaluations against standardized corpus benchmarks (e.g. ASAP Automated Student
            Assessment dataset) and teacher consensus ground truth.
          </p>
        </div>
      </div>
    </div>
  );
};
