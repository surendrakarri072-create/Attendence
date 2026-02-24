const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get All Users
router.get('/', async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add New User
router.post('/', async (req, res) => {
    try {
        let { rollNumber, name, department, password } = req.body;

        // Security: Cast to string and trim to prevent NoSQL injection and handle edge cases
        rollNumber = String(rollNumber || '').trim();
        name = String(name || '').trim();
        department = String(department || '').trim();
        password = String(password || '').trim();

        // Input Validation
        if (!rollNumber || !name || !password) {
            return res.status(400).json({ success: false, message: 'Required fields missing' });
        }

        if (rollNumber.length > 20 || name.length > 100 || department.length > 100) {
            return res.status(400).json({ success: false, message: 'Invalid input length' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ rollNumber });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const newUser = new User({
            rollNumber,
            name,
            department,
            password
        });

        await newUser.save();
        res.status(201).json({ success: true, user: newUser });

    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// Delete User
router.delete('/:rollNumber', async (req, res) => {
    try {
        const rollNumber = String(req.params.rollNumber || '').trim();
        const result = await User.findOneAndDelete({ rollNumber });
        if (!result) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
