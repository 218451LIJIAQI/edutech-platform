import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import type { Request, Response } from "express";
import prisma from "../config/database";
import config from "../config/env";
import { extractUploadPathFromUrlOrPath } from "./url-or-path";
import asyncHandler from "./async-handler";
import { NotFoundError } from "./errors";

export const persistUploads = async (files: Express.Multer.File[]) => {
  if (!process.env.VERCEL) return;
  const records = await Promise.all(files.map(async (file) => ({
    path: path.relative(config.UPLOAD_DIR, file.path).split(path.sep).join("/"),
    content: await fs.readFile(file.path),
    mimeType: file.mimetype,
  })));
  await prisma.$transaction(records.map(data => prisma.storedUpload.create({ data })));
  await Promise.all(files.map(file => fs.unlink(file.path).catch(() => undefined)));
};

// Protected download callers authorize the record before reaching this helper.
export const restoreUpload = async (relativePath: string, absolutePath: string) => {
  if (!process.env.VERCEL) return;
  const stored = await prisma.storedUpload.findUnique({ where: { path: relativePath } });
  if (!stored) throw new NotFoundError("File not found");
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  const temporaryPath = `${absolutePath}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temporaryPath, stored.content);
  await fs.rename(temporaryPath, absolutePath);
};

// This runs only after the existing protected-folder and path checks.
export const serveStoredUpload = asyncHandler(async (req: Request, res: Response) => {
  const uploadPath = extractUploadPathFromUrlOrPath(req.originalUrl.split("?")[0]);
  if (!uploadPath) throw new NotFoundError("File not found");
  const stored = await prisma.storedUpload.findUnique({ where: { path: uploadPath } });
  if (!stored) throw new NotFoundError("File not found");
  const body = Buffer.from(stored.content);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "public, max-age=86400, immutable");
  res.type(stored.mimeType);
  res.setHeader("Accept-Ranges", "bytes");
  if (req.headers.range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if (!match || (!match[1] && !match[2])) {
      res.setHeader("Content-Range", `bytes */${body.length}`);
      res.status(416).end();
      return;
    }
    const start = match[1] ? Number(match[1]) : Math.max(0, body.length - Number(match[2]));
    const end = match[1] && match[2] ? Math.min(Number(match[2]), body.length - 1) : body.length - 1;
    if (start > end || start >= body.length || !Number.isSafeInteger(start)) {
      res.setHeader("Content-Range", `bytes */${body.length}`);
      res.status(416).end();
      return;
    }
    res.setHeader("Content-Range", `bytes ${start}-${end}/${body.length}`);
    res.status(206).send(body.subarray(start, end + 1));
    return;
  }
  res.send(body);
});
