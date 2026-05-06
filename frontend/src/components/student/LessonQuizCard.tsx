import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, HelpCircle, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import clientLogger from '@/utils/logger';
import { Lesson, QuizSubmissionResult } from '@/types';
import courseService from '@/services/course.service';
import { extractErrorMessage } from '@/utils/error-handler';

interface LessonQuizCardProps {
  lesson: Lesson;
  isLessonCompleted: boolean;
  hasPassedAttempt?: boolean;
  onQuizPassed: () => Promise<void> | void;
}

const LessonQuizCard = ({
  lesson,
  isLessonCompleted,
  hasPassedAttempt = false,
  onQuizPassed,
}: LessonQuizCardProps) => {
  const quiz = lesson.quiz;
  const questions = useMemo(() => quiz?.questions ?? [], [quiz?.questions]);

  const [answers, setAnswers] = useState<Array<number | null>>([]);
  const [result, setResult] = useState<QuizSubmissionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setAnswers(questions.map(() => null));
    setResult(null);
    setIsSubmitting(false);
  }, [lesson.id, questions]);

  if (!questions.length) {
    return null;
  }

  const hasResult = result !== null;
  const isQuizComplete =
    answers.length === questions.length && answers.every((answer) => answer !== null);

  const resetQuiz = () => {
    setAnswers(questions.map(() => null));
    setResult(null);
  };

  const handleAnswerChange = (questionIndex: number, optionIndex: number) => {
    if (hasResult || isSubmitting) {
      return;
    }

    setAnswers((currentAnswers) =>
      currentAnswers.map((answer, index) =>
        index === questionIndex ? optionIndex : answer
      )
    );
  };

  const handleSubmit = async () => {
    if (hasResult) {
      toast.error('Please retake the quiz before submitting again.');
      return;
    }

    if (!isQuizComplete) {
      toast.error('Please answer every quiz question before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedAnswers = answers as number[];
      const submission = await courseService.submitLessonQuiz(lesson.id, selectedAnswers);

      setResult(submission);

      if (submission.passed) {
        toast.success(`Quiz passed with ${submission.scorePercentage}%`);

        if (!isLessonCompleted) {
          try {
            await onQuizPassed();
          } catch (completionError) {
            clientLogger.error('Quiz passed, but lesson completion update failed:', completionError);
            toast.error(
              extractErrorMessage(
                completionError,
                'Quiz passed, but the lesson completion status could not be updated.'
              )
            );
          }
        }
      } else {
        toast.error(
          `Quiz score ${submission.scorePercentage}%. You need ${submission.passPercentage}% to pass.`
        );
      }
    } catch (error) {
      clientLogger.error('Failed to submit lesson quiz:', error);
      toast.error(extractErrorMessage(error, 'Failed to submit quiz'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      className="card rounded-2xl border border-gray-100 shadow-xl"
      aria-labelledby="lesson-quiz-heading"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 id="lesson-quiz-heading" className="text-2xl font-bold text-gray-900">
            Lesson Quiz
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Answer the quiz below to check your understanding of this lesson.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
          {questions.length} question{questions.length > 1 ? 's' : ''}
        </div>
      </div>

      <div className="space-y-5">
        {questions.map((question, questionIndex) => {
          const questionResult = result?.results[questionIndex];

          return (
            <fieldset
              key={`${lesson.id}-quiz-${questionIndex}`}
              className="rounded-xl border border-gray-200 bg-gray-50 p-4"
              disabled={isSubmitting || hasResult}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <legend className="text-base font-semibold text-gray-900">
                  {questionIndex + 1}. {question.question}
                </legend>

                {questionResult ? (
                  questionResult.isCorrect ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      <CheckCircle className="h-4 w-4" aria-hidden="true" />
                      Correct
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                      <AlertCircle className="h-4 w-4" aria-hidden="true" />
                      Incorrect
                    </span>
                  )
                ) : null}
              </div>

              <div className="space-y-3">
                {question.options.map((option, optionIndex) => {
                  const isSelected = answers[questionIndex] === optionIndex;
                  const isCorrectOption = questionResult?.correctOptionIndex === optionIndex;
                  const isIncorrectSelection =
                    Boolean(questionResult) && isSelected && !questionResult?.isCorrect;

                  return (
                    <label
                      key={`${lesson.id}-quiz-${questionIndex}-option-${optionIndex}`}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                        isCorrectOption
                          ? 'border-green-300 bg-green-50'
                          : isIncorrectSelection
                            ? 'border-red-300 bg-red-50'
                            : isSelected
                              ? 'border-primary-400 bg-primary-50'
                              : 'border-gray-200 bg-white hover:border-primary-200'
                      } ${isSubmitting || hasResult ? 'cursor-default' : ''}`}
                    >
                      <input
                        type="radio"
                        name={`lesson-${lesson.id}-question-${questionIndex}`}
                        checked={isSelected}
                        onChange={() => handleAnswerChange(questionIndex, optionIndex)}
                        className="mt-1 h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm leading-6 text-gray-800">{option}</span>
                    </label>
                  );
                })}
              </div>

              {questionResult?.explanation ? (
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
                  <span className="font-semibold">Explanation:</span>{' '}
                  {questionResult.explanation}
                </div>
              ) : null}
            </fieldset>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-4 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div aria-live="polite">
          {result ? (
            <div
              className={`rounded-xl px-4 py-3 text-sm font-medium ${
                result.passed ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-900'
              }`}
            >
              Score: {result.correctAnswers}/{result.totalQuestions} (
              {result.scorePercentage}%)
              {!result.passed ? `, pass mark ${result.passPercentage}%` : ''}
            </div>
          ) : hasPassedAttempt ? (
            <div className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
              You already passed this quiz. You can retake it anytime if you want to practice again.
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              Pass the quiz to unlock lesson completion.
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {result ? (
            <button
              type="button"
              onClick={resetQuiz}
              className="btn-outline inline-flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Retake
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || hasResult}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
          </button>
        </div>
      </div>
    </section>
  );
};

export default LessonQuizCard;
