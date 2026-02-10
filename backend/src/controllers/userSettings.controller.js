/**
 * User Settings Controller
 * 
 * Manage user preferences like experience level and currency.
 */

import User from '../models/User.model.js';

/**
 * GET /user/settings
 * Get current user settings
 */
export const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('name email experienceLevel currency')
      .lean();
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /user/settings
 * Update user settings
 */
export const updateSettings = async (req, res) => {
  try {
    const { experienceLevel, currency } = req.body;
    
    const validLevels = ['beginner', 'intermediate', 'advanced'];
    const validCurrencies = ['INR', 'USD'];
    
    if (experienceLevel && !validLevels.includes(experienceLevel)) {
      return res.status(400).json({ 
        message: `Invalid experience level. Must be one of: ${validLevels.join(', ')}` 
      });
    }
    
    if (currency && !validCurrencies.includes(currency)) {
      return res.status(400).json({ 
        message: `Invalid currency. Must be one of: ${validCurrencies.join(', ')}` 
      });
    }

    const updates = {};
    if (experienceLevel) updates.experienceLevel = experienceLevel;
    if (currency) updates.currency = currency;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updates,
      { new: true }
    ).select('name email experienceLevel currency');

    res.json({
      message: 'Settings updated',
      user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
