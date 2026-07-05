import prisma from '../src/config/prisma.js';

const policyId = process.argv[2];

const chunks = await prisma.documentChunk.findMany({
  where: { policyId, text: { contains: 'Joint replacements' } },
});

console.log(`Found ${chunks.length} matching chunks`);
chunks.forEach((c) => {
  console.log(`\n--- page ${c.pageNumber}, chunkIndex ${c.chunkIndex} ---`);
  console.log(c.text);
});

process.exit(0);