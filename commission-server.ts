import type { ResultSetHeader } from 'mysql2/promise';
import { Router, type ErrorRequestHandler } from 'express';
import multer from 'multer';
import { mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createDatabaseConnection } from './database.ts';

interface CommissionRequest {
  email: string;
  phone: string | null;
  description: string;
  attachments: string;
  physical: boolean;
  deadline: string | null;
  requestAcknowledgement: boolean;
  termsAccepted: boolean;
}

const projectRoot = process.cwd();
const uploadDirectory = path.join(projectRoot, 'commission-uploads');
const uploadExtensions: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/avif': ['.avif'],
  'image/bmp': ['.bmp'],
  'image/gif': ['.gif'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

export async function initializeCommissionStorage(): Promise<void> {
  await mkdir(uploadDirectory, { recursive: true });
}

export async function createCommission(commission: CommissionRequest): Promise<number> {
  const connection = await createDatabaseConnection();

  try {
    const values = [
      commission.email,
      commission.phone ?? null,
      commission.description,
      commission.attachments,
      commission.physical,
      commission.deadline,
    ];
    const query =
      'INSERT INTO commissions (email, phone, description, attachments, physical, deadline) VALUES (?, ?, ?, ?, ?, ?)';
    const [result] = await connection.execute<ResultSetHeader>(query, values);

    return result.insertId;
  } finally {
    await connection.end();
  }
}

const router = Router();
const upload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => callback(null, uploadDirectory),
    filename: (_request, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${randomUUID()}${extension}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
    fields: 7,
    fieldSize: 10 * 1024,
  },
  fileFilter: (_request, file, callback) => {
    const validExtensions = uploadExtensions[file.mimetype];
    const extension = path.extname(file.originalname).toLowerCase();

    if (!validExtensions?.includes(extension)) {
      callback(new Error('Only supported image files and PDFs can be attached.'));
      return;
    }

    callback(null, true);
  },
});

function isValidDeadline(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

router.post('/api/commissions', upload.array('references', 5), async (request, response) => {
  const uploadedFiles = (request.files ?? []) as Express.Multer.File[];
  const body = request.body ?? {};
  const removeUploadedFiles = async () => {
    const results = await Promise.allSettled(uploadedFiles.map((file) => unlink(file.path)));
    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('Failed to remove a commission attachment:', result.reason);
      }
    }
  };

  const description = String(body.description ?? '').trim();
  const email = String(body.email ?? '').trim();
  const phone = String(body.phone ?? '').trim();
  const deadline = String(body.deadline ?? '').trim();
  const requestAcknowledgement = body['request-acknowledgement'] === 'on';
  const termsAccepted = body['terms-accepted'] === 'on';

  if (!description || description.length > 10_000) {
    await removeUploadedFiles();
    response.status(400).json({ message: 'Enter a description of 1 to 10,000 characters.' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    await removeUploadedFiles();
    response.status(400).json({ message: 'Enter a valid email address.' });
    return;
  }
  if (phone.length > 40) {
    await removeUploadedFiles();
    response.status(400).json({ message: 'Phone number must be 40 characters or fewer.' });
    return;
  }
  if (deadline && !isValidDeadline(deadline)) {
    await removeUploadedFiles();
    response.status(400).json({ message: 'Enter a valid preferred deadline.' });
    return;
  }
  if (!requestAcknowledgement || !termsAccepted) {
    await removeUploadedFiles();
    response.status(400).json({ message: 'Please confirm the acknowledgement and terms of service.' });
    return;
  }

  const commission: CommissionRequest = {
    email,
    phone: phone || null,
    description,
    attachments: JSON.stringify(uploadedFiles.map((file) => file.filename)),
    physical: body['physical-commission'] === 'on',
    deadline: deadline || null,
    requestAcknowledgement,
    termsAccepted,
  };

  try {
    const id = await createCommission(commission);
    response.status(201).json({ id, message: 'Your commission request was sent successfully.' });
  } catch (error) {
    console.error('Failed to save commission request:', error);
    await removeUploadedFiles();
    response.status(500).json({ message: 'We could not send your request. Please try again later.' });
  }
});

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' || error.code === 'LIMIT_FILE_COUNT' ? 413 : 400;
    response.status(status).json({ message: 'The attached files exceed the allowed upload limits.' });
    return;
  }

  if (error instanceof Error && error.message === 'Only supported image files and PDFs can be attached.') {
    response.status(400).json({ message: error.message });
    return;
  }

  console.error('Commission server error:', error);
  response.status(500).json({ message: 'The server could not process your request.' });
};

router.use(errorHandler);

export { router as commissionRouter };
