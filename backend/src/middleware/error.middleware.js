import multer from 'multer';

export function errorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError || err.message === 'Only PDF files are allowed') {
    return res.status(400).json({ success: false, message: err.message });
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Something went wrong';

  if (!err.isOperational) {
    console.error(err);
  }

  res.status(statusCode).json({ success: false, message });
}