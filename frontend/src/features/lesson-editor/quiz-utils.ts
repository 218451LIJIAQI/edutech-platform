import type { EditableQuizQuestion } from './types';
import type { LessonQuiz } from '@/types';

export const createEmptyQuizQuestion = (): EditableQuizQuestion => ({
  question: '',
  options: ['', ''],
  correctOptionIndex: 0,
  explanation: '',
});

export const createQuizQuestionsFromLesson = (
  quiz: LessonQuiz | null | undefined
): EditableQuizQuestion[] => {
  if (!quiz?.questions?.length) {
    return [createEmptyQuizQuestion()];
  }

  return quiz.questions.map((question) => ({
    question: question.question,
    options: question.options.length >= 2 ? [...question.options] : ['', ''],
    correctOptionIndex:
      typeof question.correctOptionIndex === 'number' ? question.correctOptionIndex : 0,
    explanation: question.explanation || '',
  }));
};

export const updateQuizQuestionField = (
  questions: EditableQuizQuestion[],
  index: number,
  field: keyof EditableQuizQuestion,
  value: string | number | string[]
) =>
  questions.map((question, questionIndex) =>
    questionIndex === index ? { ...question, [field]: value } : question
  );

export const updateQuizOptionField = (
  questions: EditableQuizQuestion[],
  questionIndex: number,
  optionIndex: number,
  value: string
) =>
  questions.map((question, currentIndex) =>
    currentIndex === questionIndex
      ? {
          ...question,
          options: question.options.map((option, index) =>
            index === optionIndex ? value : option
          ),
        }
      : question
  );

export const appendQuizQuestion = (questions: EditableQuizQuestion[]) => [
  ...questions,
  createEmptyQuizQuestion(),
];

export const removeQuizQuestionAt = (
  questions: EditableQuizQuestion[],
  index: number
) => {
  if (questions.length === 1) {
    return [createEmptyQuizQuestion()];
  }

  return questions.filter((_, questionIndex) => questionIndex !== index);
};

export const appendQuizOption = (
  questions: EditableQuizQuestion[],
  questionIndex: number
) =>
  questions.map((question, currentIndex) =>
    currentIndex === questionIndex && question.options.length < 6
      ? { ...question, options: [...question.options, ''] }
      : question
  );

export const removeQuizOptionAt = (
  questions: EditableQuizQuestion[],
  questionIndex: number,
  optionIndex: number
) =>
  questions.map((question, currentIndex) => {
    if (currentIndex !== questionIndex || question.options.length <= 2) {
      return question;
    }

    const options = question.options.filter((_, index) => index !== optionIndex);
    const nextCorrectOptionIndex =
      question.correctOptionIndex >= options.length
        ? options.length - 1
        : question.correctOptionIndex === optionIndex
          ? 0
          : question.correctOptionIndex > optionIndex
            ? question.correctOptionIndex - 1
            : question.correctOptionIndex;

    return {
      ...question,
      options,
      correctOptionIndex: nextCorrectOptionIndex,
    };
  });

export const buildLessonQuizPayload = (
  enabled: boolean,
  questions: EditableQuizQuestion[]
) => {
  if (!enabled) {
    return null;
  }

  return {
    questions: questions.map((question, index) => {
      const trimmedQuestion = question.question.trim();
      const trimmedOptions = question.options.map((option) => option.trim());

      if (!trimmedQuestion) {
        throw new Error(`Quiz question ${index + 1} needs a prompt`);
      }

      if (trimmedOptions.some((option) => !option)) {
        throw new Error(`Quiz question ${index + 1} has an empty option`);
      }

      if (trimmedOptions.length < 2) {
        throw new Error(`Quiz question ${index + 1} needs at least 2 options`);
      }

      if (
        question.correctOptionIndex < 0 ||
        question.correctOptionIndex >= trimmedOptions.length
      ) {
        throw new Error(`Quiz question ${index + 1} needs a valid correct answer`);
      }

      return {
        question: trimmedQuestion,
        options: trimmedOptions,
        correctOptionIndex: question.correctOptionIndex,
        explanation: question.explanation.trim() || undefined,
      };
    }),
  };
};
