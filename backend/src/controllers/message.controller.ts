import { Request, Response } from "express";
import asyncHandler from "../utils/async-handler";
import messageService, {
  DEFAULT_MESSAGE_LIMIT,
  MAX_MESSAGE_LIMIT,
} from "../services/message.service";
import {
  parseBoundedInt,
  parseOptionalString,
  parseRequiredParam,
  requireAuthUser,
  sendCreated,
  sendSuccess,
} from "../utils/http";

export const getContacts = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = requireAuthUser(req);
  const contacts = await messageService.getContacts(userId);
  sendSuccess(res, contacts);
});

export const getOrCreateThread = asyncHandler(
  async (req: Request, res: Response) => {
    const { id: userId } = requireAuthUser(req);
    const contactId = parseRequiredParam(req.body?.contactId, "contactId");
    const thread = await messageService.getOrCreateThread(userId, contactId);
    sendSuccess(res, { id: thread.id });
  },
);

export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = requireAuthUser(req);
  const threadId = parseRequiredParam(req.params.threadId, "Thread ID");
  const limit = parseBoundedInt(req.query.limit, DEFAULT_MESSAGE_LIMIT, {
    min: 1,
    max: MAX_MESSAGE_LIMIT,
    fieldName: "limit",
  });
  const cursor = parseOptionalString(req.query.cursor);

  const result = await messageService.getMessages(
    userId,
    threadId,
    limit,
    cursor,
  );
  sendSuccess(res, result);
});

export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = requireAuthUser(req);
  const threadId = parseRequiredParam(req.params.threadId, "Thread ID");
  const content = parseRequiredParam(req.body?.content, "Message content");

  const message = await messageService.sendMessage(userId, threadId, content);
  sendCreated(res, message);
});

export const getMessagesWithContact = asyncHandler(
  async (req: Request, res: Response) => {
    const { id: userId } = requireAuthUser(req);
    const contactId = parseRequiredParam(req.params.contactId, "Contact ID");
    const limit = parseBoundedInt(req.query.limit, DEFAULT_MESSAGE_LIMIT, {
      min: 1,
      max: MAX_MESSAGE_LIMIT,
      fieldName: "limit",
    });
    const cursor = parseOptionalString(req.query.cursor);

    const result = await messageService.getMessagesWithContact(
      userId,
      contactId,
      limit,
      cursor,
    );
    sendSuccess(res, result);
  },
);

export const sendMessageToContact = asyncHandler(
  async (req: Request, res: Response) => {
    const { id: userId } = requireAuthUser(req);
    const contactId = parseRequiredParam(req.params.contactId, "Contact ID");
    const content = parseRequiredParam(req.body?.content, "Message content");

    const message = await messageService.sendMessageToContact(
      userId,
      contactId,
      content,
    );
    sendCreated(res, message);
  },
);

export const getUnreadCount = asyncHandler(
  async (req: Request, res: Response) => {
    const { id: userId } = requireAuthUser(req);
    const unreadCount = await messageService.getUnreadCount(userId);
    sendSuccess(res, { unreadCount });
  },
);

export const markMessagesAsRead = asyncHandler(
  async (req: Request, res: Response) => {
    const { id: userId } = requireAuthUser(req);
    const threadId = parseRequiredParam(req.params.threadId, "Thread ID");
    const updatedCount = await messageService.markMessagesAsRead(
      userId,
      threadId,
    );
    sendSuccess(res, { updatedCount });
  },
);

export const getContactUnreadCount = asyncHandler(
  async (req: Request, res: Response) => {
    const { id: userId } = requireAuthUser(req);
    const contactId = parseRequiredParam(req.params.contactId, "Contact ID");
    const unreadCount = await messageService.getContactUnreadCount(
      userId,
      contactId,
    );
    sendSuccess(res, { unreadCount });
  },
);
