import { PlusCircle, Trash2 } from 'lucide-react';
import type { EditableQuizQuestion } from './types';

interface LessonQuizEditorProps {
  enabled: boolean;
  questions: EditableQuizQuestion[];
  onToggleEnabled: (enabled: boolean) => void;
  onQuestionFieldChange: (
    questionIndex: number,
    field: keyof EditableQuizQuestion,
    value: string | number | string[]
  ) => void;
  onOptionChange: (questionIndex: number, optionIndex: number, value: string) => void;
  onAddQuestion: () => void;
  onRemoveQuestion: (questionIndex: number) => void;
  onAddOption: (questionIndex: number) => void;
  onRemoveOption: (questionIndex: number, optionIndex: number) => void;
}

export default function LessonQuizEditor({
  enabled,
  questions,
  onToggleEnabled,
  onQuestionFieldChange,
  onOptionChange,
  onAddQuestion,
  onRemoveQuestion,
  onAddOption,
  onRemoveOption,
}: LessonQuizEditorProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Lesson Quiz</h3>
          <p className="mt-1 text-xs text-gray-600">
            Add a short multiple-choice quiz for this lesson.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onToggleEnabled(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          Enable quiz
        </label>
      </div>

      {enabled && (
        <div className="mt-4 space-y-4">
          {questions.map((question, questionIndex) => (
            <div
              key={`quiz-question-${questionIndex}`}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="mb-4 flex items-center justify-between gap-4">
                <h4 className="text-sm font-semibold text-gray-900">
                  Question {questionIndex + 1}
                </h4>
                <button
                  type="button"
                  onClick={() => onRemoveQuestion(questionIndex)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Prompt
                  </label>
                  <textarea
                    value={question.question}
                    onChange={(event) =>
                      onQuestionFieldChange(questionIndex, 'question', event.target.value)
                    }
                    rows={2}
                    className="input"
                    placeholder="What is the correct answer?"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Answer Options
                    </label>
                    <button
                      type="button"
                      onClick={() => onAddOption(questionIndex)}
                      disabled={question.options.length >= 6}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Add option
                    </button>
                  </div>

                  <div className="space-y-3">
                    {question.options.map((option, optionIndex) => (
                      <div
                        key={`quiz-option-${questionIndex}-${optionIndex}`}
                        className="flex items-center gap-3"
                      >
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="radio"
                            checked={question.correctOptionIndex === optionIndex}
                            onChange={() =>
                              onQuestionFieldChange(
                                questionIndex,
                                'correctOptionIndex',
                                optionIndex
                              )
                            }
                            className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          Correct
                        </label>
                        <input
                          type="text"
                          value={option}
                          onChange={(event) =>
                            onOptionChange(questionIndex, optionIndex, event.target.value)
                          }
                          className="input flex-1"
                          placeholder={`Option ${optionIndex + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => onRemoveOption(questionIndex, optionIndex)}
                          disabled={question.options.length <= 2}
                          className="text-sm font-medium text-gray-500 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Explanation (optional)
                  </label>
                  <textarea
                    value={question.explanation}
                    onChange={(event) =>
                      onQuestionFieldChange(questionIndex, 'explanation', event.target.value)
                    }
                    rows={2}
                    className="input"
                    placeholder="Explain why this answer is correct"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={onAddQuestion}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-primary-300 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 transition hover:bg-primary-100"
          >
            <PlusCircle className="h-4 w-4" />
            Add another question
          </button>
        </div>
      )}
    </div>
  );
}
