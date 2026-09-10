const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile, changePassword, forgotPassword, resetPassword, sendOtp, verifyOtp, resetPasswordOtp } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password-otp', resetPasswordOtp);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.get('/me', protect, getMe);
router.put('/update-profile', protect, (req, res, next) => { req.uploadSubDir = 'avatars'; next(); }, upload.single('avatar'), updateProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;
