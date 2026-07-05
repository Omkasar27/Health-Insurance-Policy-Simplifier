import { registerSchema, loginSchema } from '../validations/auth.validation.js';
import { registerUser, loginUser } from '../services/auth.service.js';
import { AppError } from '../utils/AppError.js';

export async function register(req, res, next) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400);

    const result = await registerUser(parsed.data);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400);

    const result = await loginUser(parsed.data);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export function me(req, res) {
  res.status(200).json({ success: true, data: { user: req.user } });
}