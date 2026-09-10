const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

const DEMO_PRESETS_BY_ID = {
  '67cb56000000000000000001': {
    _id: '67cb56000000000000000001',
    id: '67cb56000000000000000001',
    name: 'JanSetu Admin',
    email: 'admin@jansetu.in',
    role: 'admin',
    department: 'Municipal Administration',
    isActive: true
  },
  '67cb56000000000000000002': {
    _id: '67cb56000000000000000002',
    id: '67cb56000000000000000002',
    name: 'Rajesh Mahto',
    email: 'rajesh@gmail.com',
    role: 'citizen',
    citizenId: 'C4819',
    phone: '9431100003',
    aadhaar: '8492-3840-4819',
    isActive: true
  },
  '67cb56000000000000000003': {
    _id: '67cb56000000000000000003',
    id: '67cb56000000000000000003',
    name: 'Kavya Sharma',
    email: 'kavya@gmail.com',
    role: 'citizen',
    citizenId: 'C1002',
    phone: '9431100002',
    isActive: true
  },
  '67cb56000000000000000004': {
    _id: '67cb56000000000000000004',
    id: '67cb56000000000000000004',
    name: 'Dr. Rajesh Sharma',
    email: 'rajesh@iitjharkhand.ac.in',
    role: 'university_rep',
    universityIdString: 'U4819',
    institution: 'IIT Delhi',
    department: 'Department of Computer Science & Engineering',
    isActive: true
  },
  '67cb56000000000000000005': {
    _id: '67cb56000000000000000005',
    id: '67cb56000000000000000005',
    name: 'Tata Steel CSR',
    email: 'tata@steel.com',
    role: 'industry_rep',
    organization: 'Tata Steel',
    isActive: true
  }
};

exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_strong_jwt_secret_key_here');
    let user = null;
    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.findById(decoded.id).select('-password');
      } catch (e) {}
    }
    if (!user && decoded.id && DEMO_PRESETS_BY_ID[decoded.id.toString()]) {
      user = { ...DEMO_PRESETS_BY_ID[decoded.id.toString()] };
    }
    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }
    if (user.isActive === false) {
      return res.status(401).json({ success: false, message: 'Your account has been deactivated' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token is not valid' });
  }
};

exports.optionalAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_strong_jwt_secret_key_here');
      let user = null;
      if (mongoose.connection.readyState === 1) {
        try {
          user = await User.findById(decoded.id).select('-password');
        } catch (e) {}
      }
      if (!user && decoded.id && DEMO_PRESETS_BY_ID[decoded.id.toString()]) {
        user = { ...DEMO_PRESETS_BY_ID[decoded.id.toString()] };
      }
      req.user = user;
    } catch (e) {
      req.user = null;
    }
  }
  next();
};
