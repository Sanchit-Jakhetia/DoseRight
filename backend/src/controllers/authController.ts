import { Request, Response } from 'express';
import { User } from '../models';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { signupSchema, loginSchema } from '../validation/auth';

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = signupSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      res.status(409).json({ message: 'email already registered' });
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create user
    const user = await User.create({
      name: validatedData.name,
      email: validatedData.email,
      phone: validatedData.phone,
      role: validatedData.role || 'patient',
      passwordHash: hashedPassword,
      isActive: true,
    });

    // Generate token
    const token = generateToken(user._id.toString(), user.role);

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      token,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
    } else {
      console.error('Signup error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = loginSchema.parse(req.body);

    // Find user
    const user = await User.findOne({ email: validatedData.email });
    if (!user) {
      res.status(401).json({ message: 'invalid credentials' });
      return;
    }

    // Verify password
    const isPasswordValid = await comparePassword(
      validatedData.password,
      user.passwordHash
    );
    if (!isPasswordValid) {
      res.status(401).json({ message: 'invalid credentials' });
      return;
    }

    // Generate token
    const token = generateToken(user._id.toString(), user.role);

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      token,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
    } else {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

// Debug endpoint (remove in production)
export const listUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find().select('-passwordHash');
    res.status(200).json(users);
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
