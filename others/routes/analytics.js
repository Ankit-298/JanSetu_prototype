const express = require('express');
const router = express.Router();
const { getDashboardAnalytics, getUserAnalytics, getUniversityAnalytics, getLeaderboard, getRecentActivity } = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const cacheService = require('../services/cacheService');

router.get('/dashboard', protect, cacheService.middleware('analytics:dashboard', 15), getDashboardAnalytics);
router.get('/user', protect, authorize('citizen'), cacheService.middleware('analytics:user', 10), getUserAnalytics);
router.get('/university', protect, authorize('university_rep', 'admin'), cacheService.middleware('analytics:university', 15), getUniversityAnalytics);
router.get('/leaderboard', cacheService.middleware('analytics:leaderboard', 30), getLeaderboard);
router.get('/activity', protect, authorize('admin'), cacheService.middleware('analytics:activity', 10), getRecentActivity);

module.exports = router;
