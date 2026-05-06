import { Router } from "express";
import { body, param, query } from "express-validator";

import communityController from "../controllers/community.controller";
import { authenticate, optionalAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { validateUrlOrUploadPathForFolders } from "../utils/url-or-path";

const router = Router();

const uuidParam = (name = "id") =>
  param(name)
    .notEmpty()
    .withMessage(`${name} is required`)
    .bail()
    .isUUID()
    .withMessage(`Invalid ${name}`);

const paginationValidation = [
  query("page").optional().isInt({ min: 1 }).withMessage("page must be >= 1"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("limit must be 1-50"),
];

const tagNameValidation = body("name")
  .trim()
  .notEmpty()
  .withMessage("Tag name is required")
  .bail()
  .isLength({ max: 50 })
  .withMessage("Tag name too long");

const postValidation = [
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Content is required")
    .bail()
    .isLength({ max: 2000 })
    .withMessage("Content too long"),

  body("title")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 200 })
    .withMessage("Title too long"),

  body("tags")
    .optional()
    .isArray({ max: 5 })
    .withMessage("Maximum 5 tags allowed"),

  body("tags.*")
    .optional()
    .custom((tag) => {
      if (!tag || typeof tag !== "object") {
        throw new Error("Invalid tag format");
      }

      if (!tag.id && !tag.name) {
        throw new Error("Each tag must include either id or name");
      }

      return true;
    }),

  body("tags.*.id")
    .optional({ values: "falsy" })
    .isUUID()
    .withMessage("Invalid tag id"),

  body("tags.*.name")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Invalid tag name"),

  body("media")
    .optional()
    .isArray({ max: 10 })
    .withMessage("Maximum 10 media items allowed"),

  body("media.*")
    .optional()
    .custom((media) => {
      if (!media || typeof media !== "object") {
        throw new Error("Invalid media format");
      }

      if (!media.type || !media.url) {
        throw new Error("Each media item must include type and url");
      }

      return true;
    }),

  body("media.*.type")
    .optional()
    .isIn(["image", "video"])
    .withMessage("Invalid media type"),

  body("media.*.url")
    .optional()
    .isString()
    .withMessage("Invalid media url")
    .bail()
    .isLength({ max: 2048 })
    .withMessage("Media url too long")
    .bail()
    .custom(
      validateUrlOrUploadPathForFolders(
        "Media must be an external URL or use an allowed upload folder",
        ["community-images", "videos"],
      ),
    ),

  body("courseId")
    .optional({ values: "falsy" })
    .isUUID()
    .withMessage("Invalid course ID"),

  body("courseTitle")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 200 })
    .withMessage("Course title too long"),
];

const commentValidation = [
  uuidParam("postId"),

  body("content")
    .trim()
    .notEmpty()
    .withMessage("Content is required")
    .bail()
    .isLength({ max: 1000 })
    .withMessage("Content too long"),
];

/**
 * Community routes.
 *
 * Public users can view tags, feed, posts, comments, and user profiles.
 * Authenticated users can create posts, like, bookmark, comment, follow users, and create tags.
 */

// ================================
// TAGS
// ================================

router.get("/tags", communityController.getTags);

router.post(
  "/tags",
  authenticate,
  validate(tagNameValidation),
  communityController.addTag,
);

// ================================
// POSTS
// ================================

router.get(
  "/feed",
  optionalAuth,
  validate([
    ...paginationValidation,
    query("tag")
      .optional({ values: "falsy" })
      .trim()
      .isLength({ max: 50 })
      .withMessage("tag too long"),
  ]),
  communityController.getFeed,
);

router.post(
  "/posts",
  authenticate,
  validate(postValidation),
  communityController.createPost,
);

router.get(
  "/posts/:id",
  optionalAuth,
  validate(uuidParam("id")),
  communityController.getPostById,
);

router.post(
  "/posts/:id/like",
  authenticate,
  validate(uuidParam("id")),
  communityController.likePost,
);

router.post(
  "/posts/:id/bookmark",
  authenticate,
  validate(uuidParam("id")),
  communityController.bookmarkPost,
);

// ================================
// COMMENTS
// ================================

router.get(
  "/posts/:postId/comments",
  optionalAuth,
  validate([uuidParam("postId"), ...paginationValidation]),
  communityController.getComments,
);

router.post(
  "/posts/:postId/comments",
  authenticate,
  validate(commentValidation),
  communityController.addComment,
);

// ================================
// USERS
// ================================

router.get(
  "/users/:userId/profile",
  optionalAuth,
  validate(uuidParam("userId")),
  communityController.getUserProfile,
);

router.get(
  "/users/:userId/posts",
  optionalAuth,
  validate([uuidParam("userId"), ...paginationValidation]),
  communityController.getUserPosts,
);

router.post(
  "/users/:targetUserId/follow",
  authenticate,
  validate(uuidParam("targetUserId")),
  communityController.followUser,
);

export default router;
