import prisma from '../config/prisma.js';
import { hashPassword, comparePassword } from '../utils/password.util.js';
import { generateToken } from '../utils/jwt.util.js';
import { AppError } from '../utils/AppError.js';

export async function registerUser({ email, password, name }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('An account with this email already exists', 409);

  const hashedPassword = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name },
  });

  const token = generateToken({ userId: user.id });
  return { token, user: { id: user.id, email: user.email, name: user.name } };
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('Invalid email or password', 401);

  const isValid = await comparePassword(password, user.password);
  if (!isValid) throw new AppError('Invalid email or password', 401);

  const token = generateToken({ userId: user.id });
  return { token, user: { id: user.id, email: user.email, name: user.name } };
}