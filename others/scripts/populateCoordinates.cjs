const mongoose = require('mongoose');
require('dotenv').config();

const JHARKHAND_DISTRICT_COORDS = {
  'ranchi': { lat: 23.3441, lng: 85.3096 },
  'dhanbad': { lat: 23.7957, lng: 86.4304 },
  'east singhbhum': { lat: 22.8046, lng: 86.2029 },
  'jamshedpur': { lat: 22.8046, lng: 86.2029 },
  'bokaro': { lat: 23.6693, lng: 86.1511 },
  'deoghar': { lat: 24.4826, lng: 86.7001 },
  'hazaribagh': { lat: 23.9937, lng: 85.3637 },
  'giridih': { lat: 24.1865, lng: 86.3054 },
  'ramgarh': { lat: 23.6334, lng: 85.5146 },
  'dumka': { lat: 24.2677, lng: 87.2479 },
  'palamu': { lat: 24.0378, lng: 84.0684 },
  'medininagar': { lat: 24.0378, lng: 84.0684 },
  'daltonganj': { lat: 24.0378, lng: 84.0684 },
  'chaibasa': { lat: 22.5539, lng: 85.8080 },
  'west singhbhum': { lat: 22.5539, lng: 85.8080 },
  'seraikela kharsawan': { lat: 22.7005, lng: 85.9304 },
  'seraikela': { lat: 22.7005, lng: 85.9304 },
  'khunti': { lat: 23.0734, lng: 85.2796 },
  'gumla': { lat: 23.0435, lng: 84.5420 },
  'simdega': { lat: 22.6166, lng: 84.5098 },
  'lohardaga': { lat: 23.4326, lng: 84.6806 },
  'latehar': { lat: 23.7437, lng: 84.4984 },
  'garhwa': { lat: 24.1610, lng: 83.8115 },
  'chatra': { lat: 24.2091, lng: 84.8715 },
  'koderma': { lat: 24.4674, lng: 85.5937 },
  'jamtara': { lat: 23.9589, lng: 86.8016 },
  'godda': { lat: 24.8267, lng: 87.2144 },
  'sahibganj': { lat: 25.2425, lng: 87.6433 },
  'pakur': { lat: 24.6336, lng: 87.8492 }
};

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const Challenge = require('../models/Challenge');
  const docs = await Challenge.find({
    $or: [
      { 'location.coordinates.lat': null },
      { 'location.coordinates.lat': { $exists: false } },
      { 'location.coordinates': null },
      { 'location.coordinates': { $exists: false } }
    ]
  });
  console.log('Docs with missing coordinates:', docs.length);
  let updated = 0;
  for (const d of docs) {
    const distKey = (d.location?.district || 'ranchi').toLowerCase().trim();
    const coords = JHARKHAND_DISTRICT_COORDS[distKey] || JHARKHAND_DISTRICT_COORDS['ranchi'];
    const jitterLat = (Math.random() - 0.5) * 0.03;
    const jitterLng = (Math.random() - 0.5) * 0.03;
    d.location = d.location || {};
    d.location.coordinates = {
      lat: coords.lat + jitterLat,
      lng: coords.lng + jitterLng
    };
    await d.save();
    updated++;
  }
  console.log('Successfully updated coordinates for', updated, 'challenges!');
  process.exit(0);
})();
