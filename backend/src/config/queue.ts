import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import logger from '../utils/logger';

/**
 * BullMQ Queue Configuration
 * Manages background job processing
 * Queue system requires Redis - if Redis is disabled, queues are disabled
 */

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
// Queue only enabled if both QUEUE_ENABLED and REDIS_ENABLED are true
const QUEUE_ENABLED = process.env.QUEUE_ENABLED === 'true' && process.env.REDIS_ENABLED === 'true';

// Parse Redis URL for BullMQ connection
const parseRedisUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || 'localhost',
      port: parseInt(parsed.port, 10) || 6379,
      password: parsed.password || undefined,
    };
  } catch {
    return { host: 'localhost', port: 6379 };
  }
};

const connection = parseRedisUrl(REDIS_URL);

// Queue names
export const QUEUE_NAMES = {
  EMAIL: 'email-queue',
  NOTIFICATION: 'notification-queue',
  ANALYTICS: 'analytics-queue',
  CLEANUP: 'cleanup-queue',
} as const;

// Store references to queues and workers
const queues: Map<string, Queue> = new Map();
const workers: Map<string, Worker> = new Map();

// Track if we've logged the disabled message
let loggedDisabled = false;

/**
 * Create or get a queue
 */
export const getQueue = (name: string): Queue | null => {
  if (!QUEUE_ENABLED) {
    if (!loggedDisabled) {
      loggedDisabled = true;
    }
    return null;
  }

  if (queues.has(name)) {
    return queues.get(name)!;
  }

  try {
    const queue = new Queue(name, { connection });
    queues.set(name, queue);
    logger.info(`Queue "${name}" created`);
    return queue;
  } catch (error) {
    logger.error(`Failed to create queue "${name}":`, error);
    return null;
  }
};

/**
 * Job processor type
 */
type JobProcessor<T = unknown, R = unknown> = (job: Job<T>) => Promise<R>;

/**
 * Create a worker for a queue
 */
export const createWorker = <T = unknown, R = unknown>(
  queueName: string,
  processor: JobProcessor<T, R>,
  concurrency: number = 5
): Worker | null => {
  if (!QUEUE_ENABLED) {
    return null;
  }

  try {
    const worker = new Worker<T, R>(queueName, processor, {
      connection,
      concurrency,
    });

    worker.on('completed', (job) => {
      logger.debug(`Job ${job.id} in queue "${queueName}" completed`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`Job ${job?.id} in queue "${queueName}" failed:`, err);
    });

    worker.on('error', (err) => {
      logger.error(`Worker error in queue "${queueName}":`, err);
    });

    workers.set(queueName, worker);
    logger.info(`Worker for queue "${queueName}" created with concurrency ${concurrency}`);
    return worker;
  } catch (error) {
    logger.error(`Failed to create worker for "${queueName}":`, error);
    return null;
  }
};

/**
 * Add a job to a queue
 */
export const addJob = async <T = unknown>(
  queueName: string,
  jobName: string,
  data: T,
  options?: {
    delay?: number;
    priority?: number;
    attempts?: number;
    removeOnComplete?: boolean | number;
    removeOnFail?: boolean | number;
  }
): Promise<Job<T> | null> => {
  const queue = getQueue(queueName);
  if (!queue) {
    logger.warn(`Queue "${queueName}" not available, job not added`);
    return null;
  }

  try {
    const job = await queue.add(jobName, data, {
      delay: options?.delay,
      priority: options?.priority,
      attempts: options?.attempts ?? 3,
      removeOnComplete: options?.removeOnComplete ?? 100,
      removeOnFail: options?.removeOnFail ?? 50,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
    logger.debug(`Job "${jobName}" added to queue "${queueName}" with id ${job.id}`);
    return job;
  } catch (error) {
    logger.error(`Failed to add job "${jobName}" to queue "${queueName}":`, error);
    return null;
  }
};

/**
 * Get queue events for monitoring
 */
export const getQueueEvents = (queueName: string): QueueEvents | null => {
  if (!QUEUE_ENABLED) {
    return null;
  }

  try {
    return new QueueEvents(queueName, { connection });
  } catch (error) {
    logger.error(`Failed to create queue events for "${queueName}":`, error);
    return null;
  }
};

/**
 * Close all queues and workers gracefully
 */
export const closeAllQueues = async (): Promise<void> => {
  const closePromises: Promise<void>[] = [];

  // Close workers first
  for (const [name, worker] of workers) {
    closePromises.push(
      worker.close().then(() => {
        logger.info(`Worker for queue "${name}" closed`);
      }).catch((err) => {
        logger.error(`Error closing worker for queue "${name}":`, err);
      })
    );
  }

  // Then close queues
  for (const [name, queue] of queues) {
    closePromises.push(
      queue.close().then(() => {
        logger.info(`Queue "${name}" closed`);
      }).catch((err) => {
        logger.error(`Error closing queue "${name}":`, err);
      })
    );
  }

  await Promise.all(closePromises);
  queues.clear();
  workers.clear();
};

/**
 * Check if queue system is available
 */
export const isQueueAvailable = (): boolean => {
  return QUEUE_ENABLED;
};

export default {
  getQueue,
  createWorker,
  addJob,
  getQueueEvents,
  closeAllQueues,
  isQueueAvailable,
  QUEUE_NAMES,
};
