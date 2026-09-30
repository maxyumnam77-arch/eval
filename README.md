# Smart Exam Evaluation

Local exam grading assistant for teacher-defined descriptive rubrics and MCQs. The React UI has **Student** and **Admin** workspaces. Students submit typed or scanned answers and receive an automatic grade; the instructor prepares questions and approved rubrics beforehand. FastAPI saves questions, rubric versions, answer images, OCR text, marks, evidence, teacher corrections, MCQ attempts, and combined exam attempts in SQLite.

## Run on the Mac

Python 3.11+ and Node 20.19+ or 22.12+ are needed. Start the local model you already have:
Copy `.env.example` to `.env` and edit the provider, served model ID, and local URL as needed. The backend and admin command automatically load this file; exported environment variables take precedence.

- **Ollama:** run `ollama list`. If `qwen3.5:4b` is present, use it; otherwise `ollama pull qwen3.5:4b`. Ollama must be running locally. This one model accepts text and images.
- **Existing MLX Qwen3.5-4B:** no second model download is needed. Start its existing OpenAI-compatible local server, then set `EVAL_PROVIDER=mlx`, `EVAL_MODEL` to its served model ID, and `EVAL_MODEL_URL` to its loopback URL/port. The old V3.3.7 server does not have to be copied into this repo.

Terminal 1 (backend):

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cp -n .env.example .env
python -m backend.create_admin
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Terminal 2 (UI):

```bash
npm install
npm run dev
```

Create the admin account only once; on later runs, skip `python -m backend.create_admin`. Open **http://127.0.0.1:3000** and sign in with that ID and password. Students create their own ID and password from the sign-in screen. Check **http://127.0.0.1:8000/api/health** if the model is unavailable. The UI and API listen on the local computer. Vite forwards `/api` to FastAPI.

If automatic grading fails, the answer stays in the student's history as **Pending**. Open it and confirm its text to retry the same attempt after restarting the model. Question/rubric forms keep their entered data when a save fails, and uploaded pages require the signed-in account to view.

**OCR:** Accurate uses the configured local Qwen vision model. Fast uses the optional PP-OCR service at `http://127.0.0.1:8001/ocr` (set `PADDLE_OCR_URL` if different). The earlier Paddle service is not included here. For image answers, students inspect and correct the transcript before pressing **Confirm text and get grade**. If OCR fails, they can type the text in that review box. Upload up to 12 ordered pages for one student submission.

## Use the app

1. In **Admin → Question Bank**, add a question, maximum marks (quick buttons 1–10 or a positive custom amount), and a teacher reference answer.
2. Configure specific rubric criteria and their marks. Their sum must equal the maximum. Approve the rubric before students can select the question.
3. Sign out of Admin and register a student account. In **Student → Submit Answer**, choose the question. Typed answers grade immediately. For uploaded images, inspect and correct the OCR text, then confirm; the student sees the score, evidence, feedback, and their saved attempt history. No instructor action is required per answer.
4. In **Admin → MCQ Answer Keys**, create or edit MCQs. In **Student → Answer MCQs**, select options or upload a scan with printed question codes and A/B/C/D marks. Qwen proposes the marked choices; the student verifies them before deterministic key scoring (1 for correct, 0 for wrong or blank). Scanned-choice detection is experimental until tested on real sheets.
5. In **Admin → Results & Review**, inspect each criterion's evidence, save optional teacher corrections and feedback, and record independent teacher marks for evaluation. **Manual Grading** remains available for exceptional cases.
6. In **Admin → Exam Sets**, select up to 30 descriptive questions and MCQs, add instructions, and publish the set. Every descriptive rubric must be approved to publish. Students open **My Exams**, start an attempt, and answer the frozen questions. Descriptive answers support the same OCR review and retry workflow. Exam MCQs use on-screen option selection and are scored together once. A combined final score appears when every question has a grade; blank MCQs receive zero. The latest descriptive submission in that attempt counts, so a pending replacement pauses the final score until it is graded.
7. In **Student → My Progress**, view subject percentages, recent descriptive results, and rubric points to practice. Subject scores use the latest graded result for each question, including teacher corrections and exam MCQs. These percentages measure earned marks, not model accuracy. No result from another account is included.

Use **Download CSV** on individual answers, MCQs, exam results, progress summaries, or answer history. Admins can export the filtered Results & Review list and all exam attempts. **Print / Save PDF** opens a printable report; choose Save as PDF in the browser's print dialog. Actual stages and elapsed time show while scanned answers or MCQ sheets are read and graded.

Each exam attempt freezes its exam title, instructions, question prompts, MCQ keys, and descriptive rubric versions when it starts. Editing or unpublishing a set affects future attempts; existing students can finish their saved attempts. Questions used by exam records cannot be deleted. Exams with attempts can be unpublished but cannot be deleted. Existing databases are upgraded automatically without replacing prior records.

Data stays in `data/evaluation.sqlite3`; images are in `data/uploads/`. The `data/` directory and local environment files are excluded from Git. Back up that directory if you need to preserve records.

## Architecture and algorithm

| Stage | Implementation |
| --- | --- |
| Input | Typed text or multiple uploaded answer images per student/question |
| OCR | Optional Paddle Fast or local Qwen vision Accurate; student corrects scanned text before grading |
| Descriptive grading | Pretrained local Qwen3.5-4B transformer receives question, teacher reference, approved criteria and maximum marks |
| Verification | Code checks that each positive criterion has a quote present in the student text, rejects invalid marks, and sums criterion awards within the teacher's maximum |
| MCQ | Deterministic answer-key comparison, 1 or 0; optional Qwen vision reads marked options from a scan before student confirmation |
| Exams | Published mixed question sets, account-owned immutable attempt snapshots, combined scores only after all questions are graded |
| Storage | SQLite question/rubric tables, submission pages, versioned grade snapshots, MCQ and exam attempts, teacher labels |
| Reports | CSV downloads and browser print / Save PDF reports; progress summaries derived from saved results |
| Evaluation | Teacher labels versus unadjusted model marks: sample count, MAE, within-one-mark rate, Pearson correlation when defined |

**Five-mark example:** five teacher-approved criteria worth one mark each can earn 5/5 when all five are supported. Five arbitrary bullet points are not automatically worth five marks. Rubric versions and the reviewed answer are copied into each grade so later edits do not rewrite old evidence.

This rebuild performs **inference** using a pretrained model; it does not train or fine-tune Qwen. It is not an unsupervised or reinforcement-learning training experiment. A separate supervised Gradient Boosting comparison script is available below; it is **not** the live descriptive grader.

## Optional supervised comparison

Collect at least 30 independently teacher-marked answers across three or more different questions. Save those marks through Results & Review, preferably before viewing model marks. Then:

```bash
source .venv/bin/activate
pip install -r backend/requirements-research.txt
python -m backend.train_baseline
```

The script takes teacher labels from the local SQLite database, extracts token overlap, length ratio and TF-IDF cosine features, fits a `GradientBoostingRegressor`, and holds out entire question IDs. The vectorizer fits only on training questions. It saves the trained artifact and measured holdout report under `data/`. If there are too few labels, it stops without inventing a model or accuracy. Teacher labels should come from real marking, not synthetic answers treated as human data.

## Limits and checks

- A model can misunderstand a valid paraphrase or overvalue an irrelevant quote. Exact quote matching confirms text presence, not semantic correctness. Review flagged or disputed grades.
- OCR can misread handwriting. Students review scanned text before grading; teachers may review disputed scores afterward.
- A 4B model's results require testing against a held-out, teacher-marked set before claiming accuracy. The UI reports no metrics until labels are entered.
- Student and admin accounts use hashed local passwords, expiring sessions, and role checks. Student answer pages and history are tied to the account that submitted them. This is still a **local academic tool**: do not expose the API to the public internet or commit real student records without a production security review.
- The MCQ scan reader needs a clear paper layout and real-image validation. Ambiguous marks are left blank for student confirmation; it never decides the academically correct choice.

Checks: `npm run lint`, `npm run build`, `npm run test:api`, `npm run test:reports`, and `.venv/bin/python -m pytest backend/tests -q`.
Install test tooling with `.venv/bin/python -m pip install -r backend/requirements-dev.txt`.

Before submission, run through these on the Mac with the actual model: create and approve a question; register a student; submit a typed answer; upload and correct a photographed answer; retry a pending attempt after stopping/restarting the model; score typed and scanned MCQs; publish a mixed exam and finish its combined attempt; check My Progress; download a CSV and save a PDF; sign in as Admin to view original pages and review results. Compare varied answers against independent teacher marks before reporting grading accuracy.
