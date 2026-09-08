"use client";

import {
  optionRequiresText,
  type EvaluationAnswer,
  type EvaluationAnswerInput,
  type EvaluationQuestion,
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

/** Whether one question has everything it needs — the single source both the progress styling and the submit gate read. */
function isAnswered(
  question: EvaluationQuestion,
  answer: EvaluationAnswerState[number] | undefined,
): boolean {
  if (question.question_type === "OPEN_TEXT") {
    return Boolean(answer?.answer_text?.trim());
  }

  if (!answer?.selected_option_id) return false;

  // A MIXED question isn't finished until the "Other" text is in, if that's
  // the option chosen.
  return (
    !needsOtherText(question, answer) || Boolean(answer?.answer_text?.trim())
  );
}

/** Questions still missing an answer — every question the bank returns is required. */
export function missingRequiredQuestions(
  questions: EvaluationQuestion[],
  answers: EvaluationAnswerState,
): EvaluationQuestion[] {
  return questions.filter(
    (question) => !isAnswered(question, answers[question.id]),
  );
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
    <div className="space-y-6 text-left">
      {questions.map((question, index) => {
        const answer = answers[question.id];

        return (
          <fieldset key={question.id} disabled={disabled}>
            {/* Numbered by position, not by the question's own `order`: the
                bank omits the live-session question entirely for a course
                without one, and a list that jumps 13 → 15 reads like
                something is missing. Whoever is filling this in just needs
                a list that counts up. */}
            <legend className="block w-full text-sm leading-relaxed text-gray-700">
              <span className="mr-1.5 font-semibold text-gray-400">
                {index + 1}.
              </span>
              {question.question}
              <span className="ml-0.5 text-red-500">*</span>
            </legend>

            {question.question_type === "OPEN_TEXT" ? (
              <textarea
                value={answer?.answer_text ?? ""}
                onChange={(event) =>
                  setAnswer(question.id, { answer_text: event.target.value })
                }
                rows={3}
                placeholder="Your answer"
                className="mt-2.5 block w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-nysc-green focus:ring-2 focus:ring-nysc-green/15"
              />
            ) : (
              // One row of plain radios, wrapping when the labels are long.
              // The generous column gap is what keeps a wrapped row readable
              // — without it, options on the same line run together.
              <div className="mt-2.5 flex flex-wrap gap-x-7 gap-y-2.5">
                {sortedOptions(question).map((option) => (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 transition hover:text-gray-900"
                  >
                    <input
                      type="radio"
                      name={`evaluation-question-${question.id}`}
                      checked={answer?.selected_option_id === option.id}
                      onChange={() =>
                        setAnswer(question.id, {
                          selected_option_id: option.id,
                        })
                      }
                      className="h-4 w-4 shrink-0 accent-nysc-green"
                    />
                    {option.option}
                  </label>
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
                className="mt-2.5 block w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-nysc-green focus:ring-2 focus:ring-nysc-green/15"
              />
            ) : null}
          </fieldset>
        );
      })}
    </div>
  );
}
