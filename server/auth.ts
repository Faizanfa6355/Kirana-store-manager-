import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, User, StoreSettings } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'kirana_secret_store_jwt_key_2026';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    storeName: string;
  };
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please login.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; storeName: string };
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: 'Session expired or invalid. Please login again.' });
  }
}

export async function handleRegister(req: Request, res: Response) {
  const { name, email, username, phone, storeName, password } = req.body;
  const rawEmail = (email || username || '').trim().toLowerCase();

  if (!rawEmail || !password) {
    return res.status(400).json({ error: 'Username/Email and Password are required.' });
  }

  const cleanEmail = rawEmail.includes('@') ? rawEmail : `${rawEmail.replace(/\s+/g, '')}@kirana.local`;

  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters.' });
  }

  const database = db.get();
  const existing = database.users.find(
    (u) => u.email.toLowerCase() === cleanEmail
  );

  if (existing) {
    return res.status(400).json({ error: 'An account with this username/email already exists. Please login.' });
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const newUser: User = {
    id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    name: (name || username || 'Shopkeeper').trim(),
    email: cleanEmail,
    phone: (phone || '').trim(),
    storeName: (storeName || 'My Kirana Store').trim(),
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  const defaultSettings: StoreSettings = {
    storeName: newUser.storeName,
    address: '',
    phone: newUser.phone,
    invoicePrefix: 'INV',
    invoiceFooter: 'Thank you for shopping with us! Please visit again.',
    currency: '₹',
  };

  database.users.push(newUser);
  database.settings[newUser.id] = defaultSettings;
  db.save(database);

  const token = jwt.sign(
    { id: newUser.id, email: newUser.email, storeName: newUser.storeName },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  return res.json({
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      storeName: newUser.storeName,
    },
    settings: defaultSettings,
  });
}

export async function handleLogin(req: Request, res: Response) {
  const { email, username, password } = req.body;
  const rawId = (email || username || '').trim().toLowerCase();

  if (!rawId || !password) {
    return res.status(400).json({ error: 'Username/Email and password are required.' });
  }

  const database = db.get();
  const user = database.users.find((u) => {
    const uEmail = u.email.toLowerCase();
    return (
      uEmail === rawId ||
      uEmail === `${rawId}@kirana.local` ||
      u.name.toLowerCase() === rawId ||
      (u.phone && u.phone.replace(/\D/g, '') === rawId.replace(/\D/g, '')) ||
      (rawId === 'shopkeeper' && uEmail === 'shopkeeper@kirana.local')
    );
  });

  if (!user) {
    return res.status(401).json({ error: 'Invalid username/email or password.' });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid username/email or password.' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, storeName: user.storeName },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  const settings = database.settings[user.id] || {
    storeName: user.storeName,
    address: '',
    phone: user.phone,
    invoicePrefix: 'INV',
    invoiceFooter: 'Thank you for shopping with us! Please visit again.',
    currency: '₹',
  };

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      storeName: user.storeName,
    },
    settings,
  });
}

export async function handleForgotPassword(req: Request, res: Response) {
  const { email, username, phone, newPassword } = req.body;
  const rawId = (email || username || '').trim().toLowerCase();

  if (!rawId || !newPassword) {
    return res.status(400).json({ error: 'Username/Email and new password are required.' });
  }

  const database = db.get();
  const userIndex = database.users.findIndex((u) => {
    const uEmail = u.email.toLowerCase();
    return (
      uEmail === rawId ||
      uEmail === `${rawId}@kirana.local` ||
      u.name.toLowerCase() === rawId ||
      (rawId === 'shopkeeper' && uEmail === 'shopkeeper@kirana.local')
    );
  });

  if (userIndex === -1) {
    return res.status(404).json({ error: 'No account found with this username or email.' });
  }

  const user = database.users[userIndex];
  if (user.phone && phone && user.phone.replace(/\D/g, '') !== phone.replace(/\D/g, '')) {
    return res.status(400).json({ error: 'Registered phone number does not match.' });
  }

  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  database.users[userIndex] = user;
  db.save(database);

  return res.json({ message: 'Password reset successful. You can now login.' });
}

export async function handleChangePassword(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current and new password are required.' });
  }

  const database = db.get();
  const userIndex = database.users.findIndex((u) => u.id === req.user!.id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  const user = database.users[userIndex];
  const match = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!match) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  database.users[userIndex] = user;
  db.save(database);

  return res.json({ message: 'Password updated successfully' });
}

export function handleGetMe(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const database = db.get();
  const user = database.users.find((u) => u.id === req.user!.id);
  if (!user) {
    return res.status(404).json({ error: 'User account not found' });
  }

  const settings = database.settings[user.id] || {
    storeName: user.storeName,
    address: '',
    phone: user.phone,
    invoicePrefix: 'INV',
    invoiceFooter: 'Thank you for shopping with us! Please visit again.',
    currency: '₹',
  };

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      storeName: user.storeName,
    },
    settings,
  });
}
