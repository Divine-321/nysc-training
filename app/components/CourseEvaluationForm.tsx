"use client";

import {
  optionRequiresText,
  type EvaluationAnswer,
  type EvaluationAnswerInput,
  type EvaluationQuestion,
  type EvaluationQuestionOption,
} from "@/app/lib/staff-learning";

/**
 * The evaluation question bank, deployed shape (2026-09). Answers live in the
 * parent as plain state, keyed by question id — this component is a
 * controlled renderer.
 *
 * There's no per-question "required" flag any more: every question the bank
 * returns is required, and the bank itself omits anything not applicable
 * (Q14 is left out server-side for a programme with no live session).
 */
export type EvaluationAnswerState = Record<
  number,
  { selected_option_id?: number; answer_text?: string }
>;

// A vertical checklist reads better once there are more than a handful of
// options (Q17's six resources, Q18's seven challenges); a horizontal row
// suits everything shorter (a Likert scale's five, yes/no's two, and so on).
// Purely a layout choice — nothing about the data says which is which.
const ROW_LAYOUT_MAX_OPTIONS = 5;

function sortedOptions(question: EvaluationQuestion) {
  return [...question.options].sort((first, second) => first.order - second.order);
}

/**
 * True when the given answer, on a MIXED question, has "Other" selected —
 * the one case that needs a companion `answer_text`. Not a backend flag:
 * "Other" is a fixed convention (see optionRequiresText).
 */
function needsOtherText(
  question: EvaluationQuestion,
  answer: EvaluationAnswerState[number] | undefined,
): boolean {
  if (question.question_type !== "MIXED" || !answer?.selected_option_id) {
    return false;
  }

  const selected = question.options.find(
    (option) => option.id === answer.selected_option_id,
  );

  return selected ? optionRequiresText(selected) : false;
}

/** Questions still missing an answer — every question the bank returns is required. */
export function missingRequiredQuestions(
  questions: EvaluationQuestion[],
  answers: EvaluationAnswerState,
): EvaluationQuestion[] {
  return questions.filter((question) => {
    const answer = answers[question.id];

    if (question.question_type === "OPEN_TEXT") {
      return !answer?.answer_text?.trim();
    }

    if (!answer?.selected_option_id) return true;

    return needsOtherText(question, answer) && !answer?.answer_text?.trim();
  });
}

/** Answers shaped for the `evaluations` array in POST /api/training/evaluations. */
export function buildEvaluationSubmission(
  questions: EvaluationQuestion[],
  answers: EvaluationAnswerState,
): EvaluationAnswerInput[] {
  const submission: EvaluationAnswerInput[] = [];

  for (const question of questions) {
    const answer = answers[question.id];
    if (!answer) continue;

    if (question.question_type === "OPEN_TEXT") {
      if (answer.answer_text?.trim()) {
        submission.push({
          question_id: question.id,
          answer_text: answer.answer_text.trim(),
        });
      }
      continue;
    }

    if (!answer.selected_option_id) continue;

    const entry: EvaluationAnswerInput = {
      question_id: question.id,
      selected_option_id: answer.selected_option_id,
    };

    // The backend rejects `answer_text` on anything but a MIXED question
    // whose chosen option is exactly "Other" — never attach it elsewhere.
    if (needsOtherText(question, answer) && answer.answer_text?.trim()) {
      entry.answer_text = answer.answer_text.trim();
    }

    submission.push(entry);
  }

  return submission;
}

/** One submitted answer, rendered as a person would read it — for the admin detail view. */
export function formatEvaluationAnswer(answer: EvaluationAnswer): string {
  const { question, selected_option, answer_text } = answer;

  if (question.question_type === "OPEN_TEXT") {
    return answer_text?.trim() || "—";
  }

  const label = selected_option?.option ?? "—";
  const showsText = selected_option ? optionRequiresText(selected_option) : false;

  return showsText && answer_text?.trim() ? `${label}: ${answer_text.trim()}` : label;
}

function OptionRow({
  option,
  selected,
  onSelect,
  asRow,
}: {
  option: EvaluationQuestionOption;
  selected: boolean;
  onSelect: () => void;
  asRow: boolean;
}) {
  if (asRow) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
          selected
            ? "border-nysc-green bg-green-50 text-nysc-green"
            : "border-gray-200 text-gray-500 hover:border-gray-300"
        }`}
      >
        {option.option}
      </button>
    );
  }

  return (
    <label
      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3.5 py-2 text-sm transition ${
        selected
          ? "border-nysc-green bg-green-50 text-nysc-green"
          : "border-gray-200 text-gray-600 hover:border-gray-300"
      }`}
    >
      <input
        type="radio"
        checked={selected}
        onChange={onSelect}
        className="accent-nysc-green"
      />
      {option.option}
    </label>
  );
}

export default function CourseEvaluationForm({
  questions,
  answers,
  onChange,
  disabled = false,
}: {
  questions: EvaluationQuestion[];
  answers: EvaluationAnswerState;
  onChange: (next: EvaluationAnswerState) => void;
  disabled?: boolean;
}) {
  const setAnswer = (
    questionId: number,
    patch: { selected_option_id?: number; answer_text?: string },
  ) => {
    onChange({
      ...answers,
      [questionId]: { ...answers[questionId], ...patch },
    });
  };

  return (
    <div className="space-y-7 text-center">
      {questions.map((question) => {
        const answer = answers[question.id];
        const options = sortedOptions(question);
        const asRow = options.length > 0 && options.length <= ROW_LAYOUT_MAX_OPTIONS;

        return (
          <fieldset key={question.id} disabled={disabled} className="space-y-2">
            <legend className="mx-auto block max-w-xl text-sm font-medium text-gray-700">
              {question.question}
              <span className="text-red-500"> *</span>
            </legend>

            {question.question_type === "OPEN_TEXT" ? (
              <textarea
                value={answer?.answer_text ?? ""}
                onChange={(event) =>
                  setAnswer(question.id, { answer_text: event.target.value })
                }
                rows={3}
                placeholder="Your answer"
                className="mx-auto block w-full max-w-xl rounded-lg border border-gray-200 px-3.5 py-2 text-left text-sm outline-none focus:border-nysc-green focus:ring-2 focus:ring-nysc-green/15"
              />
            ) : (
              <div
                className={
                  asRow
                    ? "flex flex-wrap justify-center gap-2"
                    : "mx-auto max-w-sm space-y-1.5 text-left"
                }
              >
                {options.map((option) => (
                  <OptionRow
                    key={option.id}
                    option={option}
                    asRow={asRow}
                    selected={answer?.selected_option_id === option.id}
                    onSelect={() =>
                      setAnswer(question.id, { selected_option_id: option.id })
                    }
                  />
                ))}
              </div>
            )}

            {needsOtherText(question, answer) ? (
              <input
                type="text"
                value={answer?.answer_text ?? ""}
                onChange={(event) =>
                  setAnswer(question.id, { answer_text: event.target.value })
                }
                placeholder="Please specify"
                className="mx-auto block w-full max-w-sm rounded-lg border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-nysc-green focus:ring-2 focus:ring-nysc-green/15"
              />
            ) : null}
          </fieldset>
        );
      })}
    </div>
  );
}
