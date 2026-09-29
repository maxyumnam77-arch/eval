import { DescriptiveQuestion, StudentSubmission, MCQQuestion, MCQStudentAttempt } from '../types';

export const INITIAL_QUESTIONS: DescriptiveQuestion[] = [
  {
    id: 'q-bio-04',
    code: 'BIO-11-Q04',
    subject: 'AP Biology · Cell Bioenergetics',
    classGrade: 'Grade 11',
    title: 'Light-Dependent Reactions of Photosynthesis',
    prompt:
      'Describe the sequence of light-dependent reactions occurring in the thylakoid membrane during photosynthesis. Explain the roles of Photosystems II and I, photolysis of water, the generation of the proton electrochemical gradient, and the final production of ATP and NADPH.',
    maxMarks: 5.0,
    rubricApproved: true,
    approvedBy: 'Dr. Sarah Lin (Lead Evaluator)',
    approvedAt: '2026-09-28 09:15',
    referenceAnswer:
      'Light photons strike Photosystem II (P680), exciting electrons that enter an electron transport chain. Photolysis of water (2H₂O → 4H⁺ + 4e⁻ + O₂) replenishes PSII electrons and releases oxygen gas. Electrons transfer via plastoquinone and cytochrome b₆f complex, pumping H⁺ ions from the stroma into the thylakoid lumen to establish a steep electrochemical proton gradient. As electrons reach Photosystem I (P700), re-excitation by light drives ferredoxin to reduce NADP⁺ into NADPH catalyzed by NADP⁺ reductase. Chemiosmosis occurs when accumulated protons in the lumen flow back down their gradient through ATP synthase, phosphorylation of ADP produces ATP in the stroma.',
    criteria: [
      {
        id: 'crit-1',
        title: 'Photolysis of Water & O₂ Release',
        description: 'Explains water oxidation at PSII supplying replacement electrons and releasing molecular oxygen.',
        maxMark: 1.0,
      },
      {
        id: 'crit-2',
        title: 'Electron Transport in Thylakoid Membrane',
        description: 'Details electron movement through plastoquinone and cytochrome complex from PSII to PSI.',
        maxMark: 1.0,
      },
      {
        id: 'crit-3',
        title: 'Proton Electrochemical Gradient Generation',
        description: 'Explains active H⁺ translocation from stroma into thylakoid lumen establishing delta pH.',
        maxMark: 1.0,
      },
      {
        id: 'crit-4',
        title: 'Chemiosmotic ATP Synthesis via ATP Synthase',
        description: 'Explains proton motive force driving rotational phosphorylation of ADP into ATP.',
        maxMark: 1.0,
      },
      {
        id: 'crit-5',
        title: 'NADP⁺ Reduction to NADPH & Scientific Clarity',
        description: 'Describes ferredoxin reducing NADP⁺ catalyzed by NADP⁺ reductase, with accurate nomenclature.',
        maxMark: 1.0,
      },
    ],
  },
  {
    id: 'q-phys-02',
    code: 'PHY-12-Q02',
    subject: 'Physics · Classical Mechanics',
    classGrade: 'Grade 12',
    title: "Newton's Second Law & Momentum in Variable-Mass Systems",
    prompt:
      'Derive and explain how Newton’s Second Law applies to variable mass systems such as rocket propulsion in deep space. Clearly define thrust and conservation of linear momentum.',
    maxMarks: 3.0,
    rubricApproved: true,
    approvedBy: 'Prof. A. Thorne',
    approvedAt: '2026-09-27 14:00',
    referenceAnswer:
      'In a variable-mass system, F_ext = dp/dt = m(dv/dt) - v_rel(dm/dt). In the absence of external gravitational fields (F_ext = 0), rocket thrust equals v_rel * (dm/dt). Integration yields the Tsiolkovsky rocket equation: Δv = v_e * ln(m₀ / m_f).',
    criteria: [
      {
        id: 'p-crit-1',
        title: 'Differential Momentum Equation Formulation',
        description: 'Properly accounts for escaping exhaust momentum and rocket body mass differential.',
        maxMark: 1.0,
      },
      {
        id: 'p-crit-2',
        title: 'Thrust Definition & Conservation of Momentum',
        description: 'Relates thrust directly to relative exhaust speed and mass burn rate.',
        maxMark: 1.0,
      },
      {
        id: 'p-crit-3',
        title: 'Ideal Rocket Equation & Variable Limits',
        description: 'Integrates to Δv = v_e * ln(m0/mf) and defines initial/dry mass boundaries.',
        maxMark: 1.0,
      },
    ],
  },
  {
    id: 'q-gen-07',
    code: 'BIO-12-Q07',
    subject: 'Genetics · Cellular Division',
    classGrade: 'Grade 12',
    title: 'Mitosis vs Meiosis: Sources of Genetic Variation',
    prompt:
      'Compare the structural segregation mechanisms in mitosis and meiosis. Contrast crossing over, independent assortment, and chromosome distribution during anaphase I and II.',
    maxMarks: 10.0,
    rubricApproved: true,
    approvedBy: 'Dr. Sarah Lin (Lead Evaluator)',
    approvedAt: '2026-09-26 11:20',
    referenceAnswer:
      'Mitosis produces two genetically identical diploid daughter cells through one round of division. Meiosis produces four unique haploid gametes through two successive divisions. Crossing over in Prophase I (chiasmata formation between homologous non-sister chromatids) generates recombinant chromosomes. Independent assortment in Metaphase I provides 2^n possible maternal/paternal orientations. In Anaphase I homologous pairs segregate, whereas sister chromatids segregate during Anaphase II and mitotic anaphase.',
    criteria: [
      {
        id: 'm-crit-1',
        title: 'Ploidy & Daughter Cell Fate Comparison',
        description: 'Diploids vs haploids, single division vs dual reductional/equational division cycles.',
        maxMark: 2.5,
      },
      {
        id: 'm-crit-2',
        title: 'Crossing Over & Recombination in Prophase I',
        description: 'Synaptonemal complex, homologous non-sister chromatid exchange, chiasmata.',
        maxMark: 2.5,
      },
      {
        id: 'm-crit-3',
        title: 'Independent Assortment & Random Alignment',
        description: 'Bivalent orientation on metaphase plate and quantitative combinatorial formula 2^n.',
        maxMark: 3.0,
      },
      {
        id: 'm-crit-4',
        title: 'Anaphase I vs II Segregation Differences',
        description: 'Clear distinction between homologous separation (reductional) vs sister chromatid disjunction.',
        maxMark: 2.0,
      },
    ],
  },
  {
    id: 'q-econ-01',
    code: 'ECON-11-Q01',
    subject: 'Economics · Macroeconomic Policy',
    classGrade: 'Grade 11',
    title: 'Monetary vs Fiscal Policy Stabilization',
    prompt:
      'Distinguish between expansionary fiscal policy and monetary policy. Identify who executes each and give one specific policy lever for each.',
    maxMarks: 2.0,
    rubricApproved: true,
    approvedBy: 'M. Vance (Dept Head)',
    approvedAt: '2026-09-25 16:45',
    referenceAnswer:
      'Fiscal policy is conducted by the government through taxation and public spending. Monetary policy is conducted by the central bank through interest rates, reserve ratios, or quantitative easing.',
    criteria: [
      {
        id: 'e-crit-1',
        title: 'Fiscal Policy Authority & Primary Instruments',
        description: 'Executive/legislative branch enacting tax adjustments or infrastructure spending programs.',
        maxMark: 1.0,
      },
      {
        id: 'e-crit-2',
        title: 'Monetary Policy Authority & Primary Instruments',
        description: 'Central bank regulating money supply, discount rates, or open-market asset purchases.',
        maxMark: 1.0,
      },
    ],
  },
];

export const INITIAL_SUBMISSIONS: StudentSubmission[] = [
  {
    id: 'sub-01',
    studentName: 'Elena Rostova',
    studentId: 'BIO-8842',
    avatarSeed: 'elena',
    fileName: 'elena_rostova_p1.scan',
    submittedAt: 'Today, 09:42 AM',
    questionId: 'q-bio-04',
    handwrittenAnswerLines: [
      'During photosynthesis, light-dependent reactions take place inside the thylakoid membrane.',
      'Light photons are absorbed by chlorophyll pigments in Photosystem II (P680), which boosts electrons',
      'to a higher energy state. To replace these excited electrons, water molecules undergo photolysis: enzymes',
      'split H2O into protons (H+), electrons, and free oxygen gas (O2) which is given off as a byproduct.',
      'The energized electrons then pass along an electron transport chain containing plastoquinone and',
      'the cytochrome b6f complex. As electrons move down the chain, their energy is used to pump H+ ions',
      'from the stroma across into the thylakoid lumen. This builds up a steep proton electrochemical gradient.',
      'Electrons continue to Photosystem I (P700) where second photon absorption re-energizes them to transfer to',
      'ferredoxin, and finally NADP+ reductase reduces NADP+ + H+ into NADPH.',
      'Simultaneously, the accumulated protons inside the lumen flow down their gradient back to the stroma through',
      'ATP synthase. This rotational flow powers the phosphorylation of ADP + Pi into ATP (chemiosmosis). Both',
      'ATP and NADPH then enter the Calvin cycle in the stroma.',
    ],
    ocrTranscript:
      'During photosynthesis, light-dependent reactions take place inside the thylakoid membrane. Light photons are absorbed by chlorophyll pigments in Photosystem II (P680), which boosts electrons to a higher energy state. To replace these excited electrons, water molecules undergo photolysis: enzymes split H2O into protons (H+), electrons, and free oxygen gas (O2) which is given off as a byproduct. The energized electrons then pass along an electron transport chain containing plastoquinone and the cytochrome b6f complex. As electrons move down the chain, their energy is used to pump H+ ions from the stroma across into the thylakoid lumen. This builds up a steep proton electrochemical gradient. Electrons continue to Photosystem I (P700) where second photon absorption re-energizes them to transfer to ferredoxin, and finally NADP+ reductase reduces NADP+ + H+ into NADPH. Simultaneously, the accumulated protons inside the lumen flow down their gradient back to the stroma through ATP synthase. This rotational flow powers the phosphorylation of ADP + Pi into ATP (chemiosmosis). Both ATP and NADPH then enter the Calvin cycle in the stroma.',
    demoNote: 'Simulated OCR Transcript (Demo)',
    status: 'pending' as const,
  },
  {
    id: 'sub-02',
    studentName: 'Marcus Vance',
    studentId: 'BIO-8839',
    avatarSeed: 'marcus',
    fileName: 'marcus_vance_p1.scan',
    submittedAt: 'Today, 09:44 AM',
    questionId: 'q-bio-04',
    handwrittenAnswerLines: [
      'The light reactions happen in the thylakoid disks. Chlorophyll in PS2 absorbs sunlight, sending',
      'excited electrons down the transport chain. Water is split to give new electrons, which produces oxygen.',
      'As electrons travel down to PS1, protons are moved across the membrane to build a gradient.',
      'At the end, ATP synthase uses the proton gradient to make ATP molecules. Electrons also reach PS1',
      'where light excites them again, but this student forgot to detail NADPH formation explicitly.',
      'Overall the process captures solar radiation and turns it into chemical fuel.',
    ],
    ocrTranscript:
      'The light reactions happen in the thylakoid disks. Chlorophyll in PS2 absorbs sunlight, sending excited electrons down the transport chain. Water is split to give new electrons, which produces oxygen. As electrons travel down to PS1, protons are moved across the membrane to build a gradient. At the end, ATP synthase uses the proton gradient to make ATP molecules. Electrons also reach PS1 where light excites them again, but this student forgot to detail NADPH formation explicitly. Overall the process captures solar radiation and turns it into chemical fuel.',
    demoNote: 'Simulated OCR Transcript (Demo)',
    status: 'pending' as const,
  },
  {
    id: 'sub-03',
    studentName: 'Devon Patel',
    studentId: 'BIO-8851',
    avatarSeed: 'devon',
    fileName: 'devon_patel_p1.scan',
    submittedAt: 'Today, 09:47 AM',
    questionId: 'q-bio-04',
    handwrittenAnswerLines: [
      'Photosynthesis light reactions occur across thylakoid membranes. Photons strike P680 reaction center in PSII.',
      'Photolysis: 2H2O -> 4H+ + 4e- + O2 replenishes the P680 reaction center while releasing molecular oxygen.',
      'Plastoquinone, cytochrome b6f, and plastocyanin relay electrons to PSI, pumping H+ into the lumen to establish',
      'a high delta pH / electrochemical gradient. In PSI (P700), photons re-excite electrons which reduce ferredoxin',
      'and NADP+ reductase yields NADPH in stroma. Protons drive ATP synthase rotor, synthesizing ATP from ADP + Pi',
      'via Peter Mitchell chemiosmosis model. Excellent terminology and complete pathway illustrated.',
    ],
    ocrTranscript:
      'Photosynthesis light reactions occur across thylakoid membranes. Photons strike P680 reaction center in PSII. Photolysis: 2H2O -> 4H+ + 4e- + O2 replenishes the P680 reaction center while releasing molecular oxygen. Plastoquinone, cytochrome b6f, and plastocyanin relay electrons to PSI, pumping H+ into the lumen to establish a high delta pH / electrochemical gradient. In PSI (P700), photons re-excite electrons which reduce ferredoxin and NADP+ reductase yields NADPH in stroma. Protons drive ATP synthase rotor, synthesizing ATP from ADP + Pi via Peter Mitchell chemiosmosis model. Excellent terminology and complete pathway illustrated.',
    demoNote: 'Simulated OCR Transcript (Demo)',
    status: 'pending' as const,
  },
  {
    id: 'sub-04',
    studentName: 'Chloe Chen',
    studentId: 'BIO-8855',
    avatarSeed: 'chloe',
    fileName: 'chloe_chen_p1.scan',
    submittedAt: 'Today, 09:50 AM',
    questionId: 'q-bio-04',
    handwrittenAnswerLines: [
      'Sunlight strikes photosystems in thylakoid membrane. Water breaks apart into oxygen and hydrogen.',
      'Electrons jump along electron carriers. Hydrogen ions become concentrated inside the lumen space.',
      'When protons escape through ATP synthase enzymes, ATP energy is produced.',
      'NADP+ turns into NADPH using excited electrons from photosystem 1. The whole set of products',
      'goes to the light independent reactions.',
    ],
    ocrTranscript:
      'Sunlight strikes photosystems in thylakoid membrane. Water breaks apart into oxygen and hydrogen. Electrons jump along electron carriers. Hydrogen ions become concentrated inside the lumen space. When protons escape through ATP synthase enzymes, ATP energy is produced. NADP+ turns into NADPH using excited electrons from photosystem 1. The whole set of products goes to the light independent reactions.',
    demoNote: 'Simulated OCR Transcript (Demo)',
    status: 'pending' as const,
  },
];

export const INITIAL_MCQS: MCQQuestion[] = [
  {
    id: 'mcq-01',
    code: 'MCQ-BIO-01',
    subject: 'Cellular Energetics',
    question: 'During non-cyclic photophosphorylation, what is the ultimate source of electrons that replenish Photosystem II?',
    options: [
      { key: 'A', text: 'Carbon dioxide (CO₂)' },
      { key: 'B', text: 'Water molecules (H₂O)' },
      { key: 'C', text: 'Glucose (C₆H₁₂O₆)' },
      { key: 'D', text: 'NADPH oxidation' },
    ],
    correctKey: 'B',
    explanation: 'Water oxidation (photolysis) at the oxygen-evolving complex of PSII donates electrons directly to P680+.',
    mark: 1.0,
  },
  {
    id: 'mcq-02',
    code: 'MCQ-BIO-02',
    subject: 'Cellular Energetics',
    question: 'In which compartment of the chloroplast does the Calvin Cycle (light-independent reactions) occur?',
    options: [
      { key: 'A', text: 'Thylakoid lumen' },
      { key: 'B', text: 'Intermembrane space' },
      { key: 'C', text: 'Stroma' },
      { key: 'D', text: 'Outer envelope membrane' },
    ],
    correctKey: 'C',
    explanation: 'The stroma contains the soluble enzymes, notably RuBisCO, needed for carbon fixation.',
    mark: 1.0,
  },
  {
    id: 'mcq-03',
    code: 'MCQ-BIO-03',
    subject: 'Molecular Genetics',
    question: 'Which enzyme is responsible for synthesizing leading and lagging DNA strands in prokaryotic replication?',
    options: [
      { key: 'A', text: 'DNA Polymerase III' },
      { key: 'B', text: 'RNA Primase' },
      { key: 'C', text: 'DNA Ligase' },
      { key: 'D', text: 'Topoisomerase I' },
    ],
    correctKey: 'A',
    explanation: 'DNA Polymerase III carries out 5’ to 3’ processive elongation in prokaryotes.',
    mark: 1.0,
  },
  {
    id: 'mcq-04',
    code: 'MCQ-BIO-04',
    subject: 'Cellular Energetics',
    question: 'What is the net gain of ATP molecules produced per molecule of glucose solely through glycolysis?',
    options: [
      { key: 'A', text: '4 ATP' },
      { key: 'B', text: '32 ATP' },
      { key: 'C', text: '2 ATP' },
      { key: 'D', text: '1 ATP' },
    ],
    correctKey: 'C',
    explanation: 'Glycolysis invests 2 ATP and produces 4 ATP, resulting in a net yield of 2 ATP per glucose.',
    mark: 1.0,
  },
  {
    id: 'mcq-05',
    code: 'MCQ-BIO-05',
    subject: 'Genetics & Evolution',
    question: 'Which mechanism during Meiosis I contributes to novel genetic combinations prior to segregation?',
    options: [
      { key: 'A', text: 'DNA methylation' },
      { key: 'B', text: 'Homologous crossing over at chiasmata' },
      { key: 'C', text: 'Cytokinesis furrowing' },
      { key: 'D', text: 'Ribosomal translocation' },
    ],
    correctKey: 'B',
    explanation: 'Chiasmata allow reciprocal physical exchange of non-sister chromatid DNA during Prophase I.',
    mark: 1.0,
  },
];

export const INITIAL_MCQ_ATTEMPTS: MCQStudentAttempt[] = [
  {
    id: 'mcq-att-1',
    studentName: 'Elena Rostova',
    studentId: 'BIO-8842',
    answers: {
      'mcq-01': 'B',
      'mcq-02': 'C',
      'mcq-03': 'A',
      'mcq-04': 'C',
      'mcq-05': 'B',
    },
    submittedAt: 'Today, 10:15 AM',
  },
  {
    id: 'mcq-att-2',
    studentName: 'Marcus Vance',
    studentId: 'BIO-8839',
    answers: {
      'mcq-01': 'B',
      'mcq-02': 'A', // Wrong: A instead of C
      'mcq-03': 'A',
      'mcq-04': 'C',
      'mcq-05': '',  // Blank
    },
    submittedAt: 'Today, 10:18 AM',
  },
  {
    id: 'mcq-att-3',
    studentName: 'Devon Patel',
    studentId: 'BIO-8851',
    answers: {
      'mcq-01': 'B',
      'mcq-02': 'C',
      'mcq-03': 'A',
      'mcq-04': 'C',
      'mcq-05': 'B',
    },
    submittedAt: 'Today, 10:20 AM',
  },
  {
    id: 'mcq-att-4',
    studentName: 'Chloe Chen',
    studentId: 'BIO-8855',
    answers: {
      'mcq-01': 'A', // Wrong: A instead of B
      'mcq-02': 'C',
      'mcq-03': 'D', // Wrong: D instead of A
      'mcq-04': 'C',
      'mcq-05': 'B',
    },
    submittedAt: 'Today, 10:22 AM',
  },
];
