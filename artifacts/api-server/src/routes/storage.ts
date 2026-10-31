import { Readable } from 'stream';
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
  GetStorageObjectParams,
} from '@workspace/api-zod';
import express, {
  Router,
  type IRouter,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import { requireStaff } from '../lib/adminAuth';
import { isPublishedDeliveryMedia } from './admin';
import {
  ObjectNotFoundError,
  InvalidUploadError,
  ObjectStorageService,
} from '../lib/objectStorage';

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();
const parseUploadBody = express.raw({
  type: '*/*',
  limit: 50 * 1024 * 1024,
});
const handleUploadBody: RequestHandler = (req, res, next) => {
  parseUploadBody(req, res, (error?: unknown) => {
    if (!error) {
      next();
      return;
    }

    const statusCode =
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      error.status === 413
        ? 413
        : 400;
    req.log.warn({ err: error }, 'Upload request body rejected');
    res.status(statusCode).json({
      error:
        statusCode === 413
          ? 'File exceeds the 50 MB upload limit'
          : 'Invalid upload body',
    });
  });
};

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL or an authenticated local upload URL.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned URL.
 * Requires auth middleware so public callers cannot mint write-capable URLs.
 */
router.post(
  '/storage/uploads/request-url',
  requireStaff('owner', 'admin_content'),
  async (req: Request, res: Response) => {
    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Missing or invalid required fields' });
      return;
    }

    try {
      const { size, contentType } = parsed.data;

      if (objectStorageService.usesLocalStorage()) {
        const { uploadId, objectPath } =
          objectStorageService.createLocalUpload(contentType);
        const host = req.get('host');
        if (!host) {
          throw new Error('Cannot determine upload URL host');
        }
        const uploadURL = new URL(
          `/api/storage/uploads/${encodeURIComponent(uploadId)}?size=${size}`,
          `${req.protocol}://${host}`,
        ).toString();

        res.json(
          RequestUploadUrlResponse.parse({
            uploadURL,
            objectPath,
          }),
        );
        return;
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath =
        objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath,
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, 'Error generating upload URL');
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  },
);

router.put(
  '/storage/uploads/:uploadId',
  requireStaff('owner', 'admin_content'),
  handleUploadBody,
  async (req: Request, res: Response) => {
    if (!objectStorageService.usesLocalStorage()) {
      res.status(404).json({ error: 'Local uploads are not enabled' });
      return;
    }

    const contentType = req.get('content-type')?.split(';', 1)[0].trim();
    if (!contentType || !Buffer.isBuffer(req.body)) {
      res.status(400).json({ error: 'Invalid upload body' });
      return;
    }
    const expectedSize = Number(req.query.size);
    if (
      !Number.isInteger(expectedSize) ||
      expectedSize < 1 ||
      expectedSize !== req.body.length
    ) {
      res.status(400).json({ error: 'Uploaded file size does not match' });
      return;
    }

    try {
      const rawUploadId = req.params.uploadId;
      const uploadId = Array.isArray(rawUploadId)
        ? rawUploadId.join('/')
        : rawUploadId;
      await objectStorageService.saveLocalUpload(
        uploadId,
        contentType,
        req.body,
      );
      res.status(204).end();
    } catch (error) {
      if (error instanceof InvalidUploadError) {
        res.status(400).json({ error: 'Invalid upload' });
        return;
      }
      req.log.error({ err: error }, 'Error saving uploaded file');
      res.status(500).json({ error: 'Failed to save uploaded file' });
    }
  },
);

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get(
  '/storage/public-objects/*filePath',
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join('/') : raw;
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const response = await objectStorageService.downloadObject(file);

      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));

      if (response.body) {
        const nodeStream = Readable.fromWeb(
          response.body as ReadableStream<Uint8Array>,
        );
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      req.log.error({ err: error }, 'Error serving public object');
      res.status(500).json({ error: 'Failed to serve public object' });
    }
  },
);

/**
 * GET /storage/objects/*
 *
 * Serve object entities from PRIVATE_OBJECT_DIR.
 * These are served from a separate path from /public-objects and can optionally
 * be protected with authentication or ACL checks based on the use case.
 */
router.get('/storage/objects/*path', async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join('/') : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const parsed = GetStorageObjectParams.safeParse({ objectPath: wildcardPath });
    if (!parsed.success || !(await isPublishedDeliveryMedia(objectPath))) {
      res.status(404).json({ error: 'Object not found' });
      return;
    }
    const response = objectStorageService.usesLocalStorage()
      ? await objectStorageService.downloadLocalObject(objectPath)
      : await objectStorageService.downloadObject(
          await objectStorageService.getObjectEntityFile(objectPath),
        );

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(
        response.body as ReadableStream<Uint8Array>,
      );
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, 'Object not found');
      res.status(404).json({ error: 'Object not found' });
      return;
    }
    req.log.error({ err: error }, 'Error serving object');
    res.status(500).json({ error: 'Failed to serve object' });
  }
});

export default router;
