import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to authenticate IoT device requests using a shared API key.
 * 
 * Expects Authorization header: "Bearer <DEVICE_API_KEY>"
 * Validates against process.env.DEVICE_API_KEY
 * 
 * Returns 401 if missing or invalid.
 */
export function authDevice(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    // Check if Authorization header exists
    if (!authHeader) {
      res.status(401).json({ message: 'Unauthorized device' });
      return;
    }

    // Extract token from "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({ message: 'Unauthorized device' });
      return;
    }

    const token = parts[1];
    const deviceApiKey = process.env.DEVICE_API_KEY;

    // Validate token against environment variable
    if (!deviceApiKey || token !== deviceApiKey) {
      res.status(401).json({ message: 'Unauthorized device' });
      return;
    }

    // Token is valid, proceed to next middleware/route
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized device' });
  }
}
