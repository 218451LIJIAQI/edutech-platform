import {
  AlertCircle,
  BarChart3,
  CheckCircle,
  ClipboardCheck,
} from 'lucide-react';
import type { QuizAttempt } from '@/types';
import type { QuizMetrics } from './types';

interface CourseManagementQuizResultsTabProps {
  metrics: QuizMetrics;
  quizAttempts: QuizAttempt[];
}

export default function CourseManagementQuizResultsTab({
  metrics,
  quizAttempts,
}: CourseManagementQuizResultsTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-50 to-blue-100 border-2 border-indigo-200 p-6 rounded-lg">
        <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center space-x-2">
          <ClipboardCheck className="w-5 h-5" />
          <span>Quiz Results</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl bg-white/80 p-4 border border-indigo-100">
            <p className="text-xs font-semibold uppercase text-indigo-600">
              Quiz lessons
            </p>
            <p className="mt-2 text-3xl font-bold text-indigo-950">
              {metrics.quizLessons.length}
            </p>
          </div>
          <div className="rounded-xl bg-white/80 p-4 border border-indigo-100">
            <p className="text-xs font-semibold uppercase text-indigo-600">
              Attempts
            </p>
            <p className="mt-2 text-3xl font-bold text-indigo-950">
              {quizAttempts.length}
            </p>
          </div>
          <div className="rounded-xl bg-white/80 p-4 border border-indigo-100">
            <p className="text-xs font-semibold uppercase text-indigo-600">
              Students
            </p>
            <p className="mt-2 text-3xl font-bold text-indigo-950">
              {metrics.uniqueQuizStudents}
            </p>
          </div>
          <div className="rounded-xl bg-white/80 p-4 border border-indigo-100">
            <p className="text-xs font-semibold uppercase text-indigo-600">
              Pass rate
            </p>
            <p className="mt-2 text-3xl font-bold text-indigo-950">
              {metrics.passRate}%
            </p>
            <p className="mt-1 text-sm text-indigo-700">
              Avg score {metrics.averageQuizScore}%
            </p>
          </div>
        </div>
      </div>

      {metrics.quizLessons.length === 0 ? (
        <div className="bg-gray-50 p-6 rounded-lg">
          <p className="text-gray-600">No quizzes created for this course yet.</p>
        </div>
      ) : (
        metrics.quizLessons.map((lesson) => {
          const lessonAttempts = quizAttempts.filter(
            (attempt) => attempt.lessonId === lesson.id
          );

          return (
            <div key={lesson.id} className="bg-gray-50 p-6 rounded-lg">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">
                    Lesson {lesson.orderIndex}: {lesson.title}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {(lesson.quiz?.questions?.length || 0)} question(s),{' '}
                    {lessonAttempts.length} attempt(s)
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-medium text-gray-700 border border-gray-200">
                  <BarChart3 className="w-4 h-4 text-primary-600" />
                  Avg score{' '}
                  {lessonAttempts.length
                    ? Math.round(
                        lessonAttempts.reduce(
                          (sum, attempt) => sum + attempt.scorePercentage,
                          0
                        ) / lessonAttempts.length
                      )
                    : 0}
                  %
                </div>
              </div>

              {lessonAttempts.length === 0 ? (
                <p className="text-gray-600">
                  No student has attempted this quiz yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {lessonAttempts.map((attempt) => (
                    <details
                      key={attempt.id}
                      className="rounded-xl border border-gray-200 bg-white p-4"
                    >
                      <summary className="cursor-pointer list-none">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {attempt.student.firstName} {attempt.student.lastName}
                            </p>
                            <p className="text-sm text-gray-600">
                              {attempt.student.email}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Submitted{' '}
                              {new Date(attempt.submittedAt).toLocaleString()}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                                attempt.passed
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {attempt.passed ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                <AlertCircle className="w-4 h-4" />
                              )}
                              {attempt.passed ? 'Passed' : 'Not Passed'}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">
                              {attempt.correctAnswers}/{attempt.totalQuestions} correct
                            </span>
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                              Score {attempt.scorePercentage}%
                            </span>
                          </div>
                        </div>
                      </summary>

                      <div className="mt-5 space-y-4 border-t border-gray-100 pt-5">
                        {attempt.results.map((result, resultIndex) => (
                          <div
                            key={`${attempt.id}-result-${resultIndex}`}
                            className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {resultIndex + 1}. {result.question}
                                </p>
                                <p className="text-sm text-gray-600 mt-2">
                                  Student answer:{' '}
                                  <span
                                    className={`font-medium ${
                                      result.isCorrect
                                        ? 'text-green-700'
                                        : 'text-red-700'
                                    }`}
                                  >
                                    {result.options[result.selectedOptionIndex] ||
                                      'No answer'}
                                  </span>
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                  Correct answer:{' '}
                                  <span className="font-medium text-green-700">
                                    {result.options[result.correctOptionIndex] ||
                                      'Unknown'}
                                  </span>
                                </p>
                                {result.explanation ? (
                                  <p className="text-sm text-gray-600 mt-2">
                                    Explanation: {result.explanation}
                                  </p>
                                ) : null}
                              </div>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                                  result.isCorrect
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {result.isCorrect ? 'Correct' : 'Incorrect'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
