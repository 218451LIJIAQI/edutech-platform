import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import prisma from '../src/config/database';

const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');

function toRelKey(p: string) {
  // normalize to relative under uploads and lower-case for comparison
  let rel = p.replace(/\\/g, '/');
  const idx = rel.toLowerCase().lastIndexOf('/uploads/');
  if (idx >= 0) rel = rel.substring(idx + '/uploads/'.length);
  if (rel.startsWith('/')) rel = rel.slice(1);
  return rel.toLowerCase();
}

function addRef(set: Set<string>, value?: string | null) {
  if (!value) return;
  const raw = value.trim();
  if (!raw) return;
  const rel = toRelKey(raw);
  if (rel) set.add(rel);
  // also add basename fallback
  const base = path.basename(rel || raw).toLowerCase();
  if (base) set.add(base);
}

async function listFilesRecursive(dir: string): Promise<string[]> {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      const sub = await listFilesRecursive(full);
      files.push(...sub);
    } else if (ent.isFile()) {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  try {
    console.log('=== Orphan uploads cleanup (safe) ===');
    if (!fs.existsSync(UPLOADS_DIR)) {
      console.log('Uploads directory does not exist, nothing to do.');
      return;
    }

    const allFiles = await listFilesRecursive(UPLOADS_DIR);
    const allRel = allFiles.map(f => path.relative(UPLOADS_DIR, f).replace(/\\/g, '/').toLowerCase());

    // Collect referenced files from DB
    const refs = new Set<string>();

    // Users avatars
    const users = await prisma.user.findMany({ select: { avatar: true } });
    users.forEach(u => addRef(refs, u.avatar || undefined));

    // TeacherProfile profilePhoto and certificatePhotos (JSON string)
    const tps = await prisma.teacherProfile.findMany({ select: { profilePhoto: true, certificatePhotos: true } });
    for (const t of tps) {
      addRef(refs, t.profilePhoto || undefined);
      if (t.certificatePhotos) {
        try {
          const arr = JSON.parse(t.certificatePhotos) as string[];
          if (Array.isArray(arr)) arr.forEach(s => addRef(refs, s));
        } catch {}
      }
    }

    // Courses thumbnails & previewVideoUrl
    const courses = await prisma.course.findMany({ select: { thumbnail: true, previewVideoUrl: true } });
    courses.forEach(c => { addRef(refs, c.thumbnail || undefined); addRef(refs, c.previewVideoUrl || undefined); });

    // Lessons videoUrl
    const lessons = await prisma.lesson.findMany({ select: { videoUrl: true } });
    lessons.forEach(l => addRef(refs, l.videoUrl || undefined));

    // Materials fileUrl
    const materials = await prisma.material.findMany({ select: { fileUrl: true } });
    materials.forEach(m => addRef(refs, m.fileUrl || undefined));

    // CommunityMedia url
    const medias = await prisma.communityMedia.findMany({ select: { url: true } });
    medias.forEach(x => addRef(refs, x.url || undefined));

    // LiveSession recordingUrl
    const sessions = await prisma.liveSession.findMany({ select: { recordingUrl: true } });
    sessions.forEach(s => addRef(refs, s.recordingUrl || undefined));

    // Build set of referenced keys (relative and basenames)
    // Already handled by addRef

    const orphans: { rel: string; full: string }[] = [];
    for (let i = 0; i < allFiles.length; i++) {
      const full = allFiles[i];
      const rel = allRel[i];
      const base = path.basename(rel);
      if (!refs.has(rel) && !refs.has(base)) {
        orphans.push({ rel, full });
      }
    }

    console.log(`Total files in uploads: ${allFiles.length}`);
    console.log(`Referenced files found in DB: ~${refs.size}`);
    console.log(`Orphan files to delete: ${orphans.length}`);

    // Delete orphan files only
    for (const o of orphans) {
      try {
        await fsp.unlink(o.full);
        console.log(` - deleted: ${o.rel}`);
      } catch (err) {
        console.warn(` ! failed to delete ${o.rel}:`, (err as Error).message);
      }
    }

    // Optionally remove empty directories
    async function removeEmptyDirs(dir: string) {
      const entries = await fsp.readdir(dir, { withFileTypes: true });
      if (entries.length === 0) {
        await fsp.rmdir(dir).catch(() => {});
        return;
      }
      for (const ent of entries) {
        if (ent.isDirectory()) {
          await removeEmptyDirs(path.join(dir, ent.name));
        }
      }
      // check again
      const after = await fsp.readdir(dir);
      if (after.length === 0 && path.normalize(dir) !== path.normalize(UPLOADS_DIR)) {
        await fsp.rmdir(dir).catch(() => {});
      }
    }

    await removeEmptyDirs(UPLOADS_DIR);
    console.log('Cleanup completed.');
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

