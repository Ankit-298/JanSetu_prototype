/**
 * JanSetu Unified Similarity Engine
 * Reusable engine for:
 * 1. University-side Twinning similarity detection
 * 2. Citizen duplicate challenge detection
 * 3. Real-time Voice AI Agent duplicate checking & twin linking
 */

const { calculateDistanceKm, generateTags } = require('./aiClassifier');

/**
 * Tokenize string into meaningful lowercase words (removing common stop words)
 */
function tokenize(text = '') {
  const stopWords = new Set([
    'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'up', 'down',
    'me', 'my', 'hamare', 'gaon', 'ke', 'ki', 'ka', 'ko', 'hai', 'hain', 'se', 'par', 'aur'
  ]);
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F]/gi, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !stopWords.has(t));
}

/**
 * Jaccard token overlap between two strings (0.0 to 1.0)
 */
function tokenJaccard(s1 = '', s2 = '') {
  const t1 = new Set(tokenize(s1));
  const t2 = new Set(tokenize(s2));
  if (t1.size === 0 || t2.size === 0) return 0;
  let intersection = 0;
  for (const token of t1) {
    if (t2.has(token)) intersection++;
  }
  const union = new Set([...t1, ...t2]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Compute similarity score between a query report and a target problem/challenge (0 to 100)
 */
function computeSimilarity(report, candidate) {
  let score = 0;

  const repCat = (report.category || '').toLowerCase().trim();
  const candCat = (candidate.category || '').toLowerCase().trim();
  const sameCategory = repCat && candCat && (repCat === candCat || repCat.includes(candCat) || candCat.includes(repCat));

  // 1. Category Matching (up to 30 pts)
  if (sameCategory) {
    score += 30;
  }

  // 2. Title & Description Token Overlap (up to 40 pts)
  const repText = `${report.title || ''} ${report.description || ''}`;
  const candText = `${candidate.title || ''} ${candidate.description || ''}`;
  const jaccard = tokenJaccard(repText, candText);
  score += Math.round(jaccard * 40);

  // 3. Keyword/Tag Overlap (up to 15 pts)
  const repTags = generateTags(repText);
  if (repTags.length > 0) {
    const candLower = candText.toLowerCase();
    const matches = repTags.filter(t => candLower.includes(t.toLowerCase())).length;
    score += Math.round((matches / repTags.length) * 15);
  }

  // 4. Geographic Proximity (up to 20 pts)
  let distanceKm = null;
  const repLoc = report.location || {};
  const candLoc = candidate.location || {};
  const repCoords = report.lat && report.lng ? { lat: report.lat, lng: report.lng } : (repLoc.coordinates || null);
  const candCoords = candidate.lat && candidate.lng ? { lat: candidate.lat, lng: candidate.lng } : (candLoc.coordinates || null);

  if (repCoords && repCoords.lat && repCoords.lng && candCoords && candCoords.lat && candCoords.lng) {
    distanceKm = calculateDistanceKm(repCoords.lat, repCoords.lng, candCoords.lat, candCoords.lng);
    if (distanceKm !== null) {
      if (distanceKm <= 2.0) score += 20;
      else if (distanceKm <= 5.0) score += 14;
      else if (distanceKm <= 15.0) score += 7;
    }
  } else if (repLoc.district && candLoc.district && repLoc.district.toLowerCase() === candLoc.district.toLowerCase()) {
    score += 10;
  }

  return {
    score: Math.min(99, Math.max(0, Math.round(score))),
    distanceKm: distanceKm !== null ? distanceKm : null,
    sameCategory
  };
}

/**
 * Find similar citizen problems in database
 * @param {Object} query - { title, description, category, lat, lng, location }
 * @param {Array} candidateList - Array of Challenge documents
 * @param {Number} threshold - Minimum score (default: 45)
 */
function findSimilarCitizenProblem(query, candidateList = [], threshold = 45) {
  const matches = [];

  for (const cand of candidateList) {
    const sim = computeSimilarity(query, cand);
    if (sim.score >= threshold) {
      matches.push({
        _id: cand._id,
        id: cand._id,
        challengeId: cand.challengeId || ('JH-' + cand._id.toString().slice(-6).toUpperCase()),
        title: cand.title,
        description: cand.description,
        category: cand.category,
        status: cand.status,
        district: cand.location?.district || 'Jharkhand',
        distanceKm: sim.distanceKm,
        similarityScore: sim.score,
        supportCount: cand.supportCount || (cand.supports ? cand.supports.length : 0),
        duplicateCount: cand.duplicateCount || 0,
        createdAt: cand.createdAt
      });
    }
  }

  matches.sort((a, b) => b.similarityScore - a.similarityScore);
  return matches;
}

module.exports = {
  tokenize,
  tokenJaccard,
  computeSimilarity,
  findSimilarCitizenProblem
};
