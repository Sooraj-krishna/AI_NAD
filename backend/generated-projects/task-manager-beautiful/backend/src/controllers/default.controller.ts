
import { Request, Response } from 'express';
import AuthService from '../services/auth.service';

export class DefaultController {
  async login (req: Request, res: Response) {
    try {
      const token = await AuthService.verifyFirebaseToken(req.body.idToken);
      res.cookie('auth-token', token, { httpOnly: true }).status(200).json({ message: 'Login successful' });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }

  async register (req: Request, res: Response) {
    try {
      const hashedPassword = await AuthService.hashPassword(req.body.password);
      const newUser = await AuthService.registerUser({...req.body, password: hashedPassword});
      res.status(201).json(newUser);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}
