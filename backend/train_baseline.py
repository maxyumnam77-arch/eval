"""Optional supervised comparison model. Run only after collecting teacher labels."""
import json
import math
import re
from collections import Counter

import joblib
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.model_selection import GroupShuffleSplit

from . import db


def tokens(text):
    return re.findall(r"[a-z0-9]+", text.lower())


def lexical_features(answer, reference):
    a, r = Counter(tokens(answer)), Counter(tokens(reference))
    common = sum((a & r).values())
    return [common / max(sum(a.values()), 1), common / max(sum(r.values()), 1),
            min(sum(a.values()) / max(sum(r.values()), 1), 3)]


def features(rows, vectorizer):
    result = []
    for row in rows:
        answer = row["ocr_transcript"]
        reference = row["reference_answer"]
        pair = vectorizer.transform([answer, reference])
        similarity = float(cosine_similarity(pair[0], pair[1])[0, 0])
        result.append([*lexical_features(answer, reference), similarity])
    return result


def run():
    db.initialize()
    with db.connection() as conn:
        rows = [dict(row) for row in conn.execute("""
            SELECT s.question_id, s.ocr_transcript, q.reference_answer, q.max_marks, l.mark
            FROM teacher_labels l
            JOIN submissions s ON s.id=l.submission_id
            JOIN questions q ON q.id=s.question_id
            WHERE LENGTH(TRIM(s.ocr_transcript)) > 0
        """)]
    groups = [row["question_id"] for row in rows]
    if len(rows) < 30 or len(set(groups)) < 3:
        raise SystemExit("Need at least 30 teacher-marked answers across 3 questions; found "
                         f"{len(rows)} answers across {len(set(groups))} questions. No model trained.")
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42)
    train_idx, test_idx = next(splitter.split(rows, groups=groups))
    train = [rows[i] for i in train_idx]
    test = [rows[i] for i in test_idx]
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1)
    vectorizer.fit([text for row in train for text in (row["ocr_transcript"], row["reference_answer"])])
    X_train, X_test = features(train, vectorizer), features(test, vectorizer)
    y_train = [row["mark"] / row["max_marks"] for row in train]
    model = GradientBoostingRegressor(n_estimators=80, max_depth=2, random_state=42)
    model.fit(X_train, y_train)
    predicted = [min(row["max_marks"], max(0, float(value) * row["max_marks"]))
                 for row, value in zip(test, model.predict(X_test))]
    errors = [abs(row["mark"] - value) for row, value in zip(test, predicted)]
    report = {"algorithm": "GradientBoostingRegressor", "trainingRows": len(train),
              "heldOutRows": len(test), "heldOutQuestionIds": sorted({row["question_id"] for row in test}),
              "mae": round(sum(errors) / len(errors), 3),
              "withinOneMark": round(sum(e <= 1 for e in errors) / len(errors), 3),
              "limitations": "Question holdout from teacher-entered labels; do not treat this as an independent external test."}
    output = db.DATA_DIR / "research_baseline.joblib"
    joblib.dump({"model": model, "vectorizer": vectorizer, "features": [
        "token_precision", "token_recall", "length_ratio", "tfidf_cosine"]}, output)
    (db.DATA_DIR / "research_metrics.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    run()
