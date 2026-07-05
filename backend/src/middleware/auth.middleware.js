import { verifyToken } from '../utils/jwt.util.js';
import { AppError } from '../utils/AppError.js';
import prisma from '../config/prisma.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError('Not authenticated', 401);
    }

    const token = header.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true },
    });
    if (!user) throw new AppError('User no longer exists', 401);

    req.user = user;
    next();
  } catch (err) {
    next(new AppError('Not authenticated', 401));
  }
}