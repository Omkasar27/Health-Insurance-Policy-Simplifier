import prisma from '../config/prisma.js';
import {
  extractSelectableText,
  ocrPdf,
  needsOcr,
  cleanText,
} from './pdfProcessor.service.js';
import { AppError } from '../utils/AppError.js';

export async function processAndSavePolicy({ userId, file }) {
  const policy = await prisma.policy.create({
    data: {
      userId,
      name: file.originalname.replace(/\.pdf$/i, ''),
      originalFilename: file.originalname,
      storagePath: file.path,
      status: 'processing',
    },
  });

  try {
    let pagesText = await extractSelectableText(file.path);
    let usedOcr = false;

    if (needsOcr(pagesText)) {
      pagesText = await ocrPdf(file.path);
      usedOcr = true;
    }

    const cleanedPages = pagesText.map(cleanText);

    await prisma.$transaction([
      prisma.policyPage.createMany({
        data: cleanedPages.map((text, index) => ({
          policyId: policy.id,
          pageNumber: index + 1,
          text,
        })),
      }),
      prisma.policy.update({
        where: { id: policy.id },
        data: { pageCount: cleanedPages.length, isScanned: usedOcr, status: 'completed' },
      }),
    ]);

    return prisma.policy.findUnique({ where: { id: policy.id } });
  } catch (err) {
    console.error('PDF processing failed:', err);
    await prisma.policy.update({ where: { id: policy.id }, data: { status: 'failed' } });
    throw new AppError('Failed to process the uploaded PDF', 500);
  }
}