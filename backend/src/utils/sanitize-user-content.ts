import sanitizeHtml from "sanitize-html";

const plainTextSanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: "discard",
  enforceHtmlBoundary: true,
};

export const sanitizeUserPlainText = (value: string): string =>
  sanitizeHtml(value, plainTextSanitizeOptions).trim();
