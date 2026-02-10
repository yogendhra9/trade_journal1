import express from 'express';
import { signup, login } from '../controllers/auth.controllers.js';
import { validatePasswordMiddleware } from '../middleware/password.middleware.js';

const router = express.Router();

// Apply password validation to signup
router.post('/signup', validatePasswordMiddleware, signup);
router.post('/register', validatePasswordMiddleware, signup);

// Login doesn't need password validation (just authentication)
router.post('/login', login);

export default router;