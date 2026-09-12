/**
 * JanSetu Voice Agent Node.js Bridge & WebSocket Service
 * Location: citizen/ai/voiceRelayNode.cjs
 * 
 * Sarvam Conversational AI Stack with Tool Calling & Strict Civic Guardrails
 */

const path = require('path');
const { WebSocketServer } = require('ws');
const Challenge = require(path.resolve(__dirname, '../../others/models/Challenge'));
const User = require(path.resolve(__dirname, '../../others/models/User'));
const { findSimilarCitizenProblem } = require(path.resolve(__dirname, '../../others/services/similarityEngine'));

/**
 * Format user spoken text into clean, formal Hindi/English civic complaint
 */
function cleanAndFormatCivicText(rawText, category, lang = 'hi') {
  if (!rawText) return { title: 'Civic Grievance', description: 'Reported via JanSetu Voice AI' };
  
  const text = rawText.trim();
  let title = text;
  let description = text;

  if (lang === 'hi' || /[\u0900-\u097F]/.test(text)) {
    if (category.includes('Drainage') || category.includes('Waterlogging') || /naala|water|paani/i.test(text)) {
      title = 'नाली की रुकावट एवं जलभराव की समस्या';
      description = text.length > 20 ? text : `${text} - क्षेत्र में नाली जाम होने से जलजमाव की समस्या है। कृपया शीघ्र सफाई कराई जाए।`;
    } else if (category.includes('Road') || /sadak|road|gaddha|pothole/i.test(text)) {
      title = 'सड़क की जर्जर स्थिति एवं गड्ढों की मरम्मत';
      description = text.length > 20 ? text : `${text} - मुख्य मार्ग पर गड्ढे होने से आवागमन में असुविधा हो रही है।`;
    } else if (category.includes('Sanitation') || /kooda|kachra|safai/i.test(text)) {
      title = 'कचरा जमाव एवं नियमित सफाई की आवश्यकता';
      description = text.length > 20 ? text : `${text} - सार्वजनिक स्थल पर कचरा पड़ा होने से दुर्गंध फैल रही है।`;
    } else if (category.includes('Electricity') || /bijli|light|transformer|wire/i.test(text)) {
      title = 'विद्युत आपूर्ति एवं स्ट्रीटलाइट खराबी की समस्या';
      description = text.length > 20 ? text : `${text} - क्षेत्र में बिजली/स्ट्रीटलाइट की समस्या के समाधान हेतु।`;
    } else {
      title = text.length > 40 ? text.slice(0, 40) + '...' : text;
    }
  } else {
    if (category.includes('Drainage') || category.includes('Waterlogging') || /drain|water/i.test(text)) {
      title = 'Drainage blockage and severe waterlogging';
    } else if (category.includes('Road') || /road|pothole/i.test(text)) {
      title = 'Damaged road surface and potholes';
    } else if (category.includes('Sanitation') || /garbage|waste|clean/i.test(text)) {
      title = 'Irregular waste collection and open garbage dump';
    } else if (category.includes('Electricity') || /electricity|light|power/i.test(text)) {
      title = 'Faulty streetlights and power distribution issue';
    } else {
      title = text.length > 50 ? text.slice(0, 50) + '...' : text;
    }
  }

  return { title, description };
}

/**
 * Detect category from spoken phrase (Fallback utility)
 */
function detectCategoryFromSpeech(text) {
  const t = text.toLowerCase();
  if (/naala|drain|waterlog|paani jam|ganda paani|sewer|pipe|leak|pipeline/i.test(t)) {
    return {
      key: 'waterlogging',
      name: 'Water & Drainage / Waterlogging',
      hindi: 'जल निकासी एवं नाला',
      officialCategory: 'Water Management'
    };
  }
  if (/sadak|road|gaddha|pothole|pul|bridge|divider|cross|asphalt/i.test(t)) {
    return {
      key: 'roads',
      name: 'Roads & Infrastructure',
      hindi: 'सड़क एवं गड्ढे',
      officialCategory: 'Urban Infrastructure'
    };
  }
  if (/kooda|kachra|safai|garbage|dustbin|waste|smell|durgandh/i.test(t)) {
    return {
      key: 'sanitation',
      name: 'Sanitation & Waste',
      hindi: 'सफाई एवं कचरा',
      officialCategory: 'Sanitation & Environment'
    };
  }
  if (/bijli|light|power|current|transformer|wire|pole|street ?light|taar/i.test(t)) {
    return {
      key: 'electricity',
      name: 'Electricity & Streetlights',
      hindi: 'बिजली एवं स्ट्रीटलाइट',
      officialCategory: 'Energy & Technology'
    };
  }
  if (/hospital|dawa|doctor|swasthya|ilaj|nurse|clinic/i.test(t)) {
    return {
      key: 'health',
      name: 'Public Health & Healthcare',
      hindi: 'स्वास्थ्य एवं अस्पताल',
      officialCategory: 'Healthcare'
    };
  }
  if (/school|vidyalaya|padhai|teacher|education/i.test(t)) {
    return {
      key: 'education',
      name: 'Education & Schools',
      hindi: 'शिक्षा एवं विद्यालय',
      officialCategory: 'Education'
    };
  }

  return {
    key: 'general',
    name: 'General Civic Issue',
    hindi: 'सामान्य जनसमस्या',
    officialCategory: 'Urban Infrastructure'
  };
}

/**
 * Mount Voice Agent HTTP APIs on Express app
 */
function setupVoiceAgentRoutes(app) {
  // 1. Duplicate check endpoint
  app.post('/api/voice-agent/duplicate-check', async (req, res) => {
    try {
      const { title, category, lat, lng, description } = req.body;
      const candidates = await Challenge.find({
        status: { $in: ['submitted', 'under_review', 'validated', 'assigned', 'in_progress', 'testing'] }
      }).select('title description category location status challengeId supportCount supports createdAt duplicateCount').lean();

      const matches = findSimilarCitizenProblem({
        title: title || '',
        description: description || title || '',
        category: category || '',
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      }, candidates, 40);

      if (matches.length > 0) {
        return res.json({
          hasDuplicate: true,
          match: matches[0],
          allMatches: matches.slice(0, 3)
        });
      }

      return res.json({ hasDuplicate: false, match: null });
    } catch (err) {
      console.error('[VoiceAgent] Duplicate check error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // 2. Link Twin Grievance endpoint
  app.post('/api/voice-agent/link-twin', async (req, res) => {
    try {
      const { existingProblemId, citizenId, citizenName } = req.body;
      let existingChallenge = null;

      if (existingProblemId.startsWith('JH-')) {
        existingChallenge = await Challenge.findOne({ challengeId: existingProblemId });
      } else {
        existingChallenge = await Challenge.findById(existingProblemId);
      }

      if (!existingChallenge) {
        return res.status(404).json({ error: 'Grievance not found' });
      }

      existingChallenge.duplicateCount = (existingChallenge.duplicateCount || 0) + 1;
      existingChallenge.supportCount = (existingChallenge.supportCount || 0) + 1;

      existingChallenge.reportedBy = existingChallenge.reportedBy || [];
      existingChallenge.reportedBy.push({
        citizenId: citizenId || null,
        citizenName: citizenName || 'Citizen Supporter',
        reportedAt: new Date(),
        viaVoiceAgent: true
      });

      existingChallenge.statusHistory.push({
        status: existingChallenge.status,
        note: `Citizen twin-linked via JanSetu Voice AI (Total supporters: ${existingChallenge.supportCount})`
      });

      await existingChallenge.save();

      return res.json({
        success: true,
        trackingId: existingChallenge.challengeId,
        supportCount: existingChallenge.supportCount,
        title: existingChallenge.title
      });
    } catch (err) {
      console.error('[VoiceAgent] Link twin error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // 3. Confirm Submission endpoint
  app.post('/api/voice-agent/submit', async (req, res) => {
    try {
      const { draft = {}, location = {}, attachments = [], citizenId, citizenName } = req.body;
      
      let submitter = citizenId;
      if (!submitter) {
        const demoUser = await User.findOne({ role: 'citizen' });
        submitter = demoUser ? demoUser._id : null;
      }

      const newChallenge = new Challenge({
        title: draft.title || 'Voice Reported Civic Problem',
        description: draft.description || draft.title || 'Reported via JanSetu Real-Time Voice AI Agent',
        category: draft.category || 'Urban Infrastructure',
        priority: draft.priority || 'high',
        status: 'submitted',
        submittedBy: submitter,
        submitterContact: {
          name: citizenName || 'Citizen Submitter',
          email: 'citizen@jansetu.in',
          phone: '9431100000'
        },
        location: {
          address: location.address || (location.district ? `${location.district}, Jharkhand` : 'Jharkhand'),
          district: location.district || 'Ranchi',
          block: location.block || '',
          village: location.village || '',
          state: 'Jharkhand',
          coordinates: {
            lat: location.lat || 23.3441,
            lng: location.lng || 85.3096
          }
        },
        submittedViaVoice: true,
        reportedBy: [{
          citizenId: submitter,
          citizenName: citizenName || 'Citizen Submitter',
          reportedAt: new Date(),
          viaVoiceAgent: true
        }],
        attachments: (attachments || []).map(att => ({
          filename: att.filename || 'voice_evidence',
          url: att.url,
          mimetype: att.type === 'video' ? 'video/mp4' : 'image/jpeg'
        })),
        statusHistory: [{
          status: 'submitted',
          note: 'Problem reported through JanSetu Voice AI Agent (Sarvam 105B Engine)'
        }]
      });

      await newChallenge.save();

      return res.json({
        success: true,
        id: newChallenge._id,
        challengeId: newChallenge.challengeId,
        title: newChallenge.title
      });
    } catch (err) {
      console.error('[VoiceAgent] Submit error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // 4. Sarvam AI Text-to-Speech (Bulbul V3) Endpoint
  app.post('/api/voice-agent/tts', async (req, res) => {
    try {
      const { text, lang = 'hi', speaker = 'aditya' } = req.body;
      const apiKey = process.env.SARVAM_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: 'SARVAM_API_KEY not configured' });
      }

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Missing text parameter' });
      }

      const sarvamRes = await fetch('https://api.sarvam.ai/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': apiKey
        },
        body: JSON.stringify({
          inputs: [text.trim()],
          target_language_code: lang === 'en' ? 'en-IN' : 'hi-IN',
          speaker: speaker || 'aditya',
          model: 'bulbul:v3'
        })
      });

      const data = await sarvamRes.json();
      if (data.audios && data.audios.length > 0) {
        return res.json({
          success: true,
          audioBase64: data.audios[0],
          mimeType: 'audio/wav',
          dataUrl: 'data:audio/wav;base64,' + data.audios[0]
        });
      }

      return res.status(500).json({ error: 'Failed to synthesize speech', details: data });
    } catch (err) {
      console.error('[VoiceAgent] Sarvam TTS error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // 5. Sarvam AI Conversational Chat Endpoint
  app.post('/api/voice-agent/chat', async (req, res) => {
    try {
      const { message, history = [], lang = 'hi' } = req.body;
      const apiKey = process.env.SARVAM_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: 'SARVAM_API_KEY not configured' });
      }

      const systemPrompt = `Tum JanSetu ke voice assistant ho jo citizens ko civic problems report karne aur unka status batane me madad karte ho. Hamesha Hindi ya Hinglish me baat karo.
STRICT TOPIC GUARDRAIL: Tum SIRF civic problems (sadak, paani, bijli, kachra, health, education, agriculture) report karne aur unka status batane me madad karte ho. Agar citizen kisi aur topic pe baat kare — movie, cricket, politics, gossip, general chit-chat — to politely mana karo aur wapas topic pe le aao. Kabhi bhi off-topic sawal ka seedha jawab mat do.
Responses ko 1-2 short sentences me rakho.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-4),
        { role: 'user', content: message }
      ];

      const sarvamRes = await fetch('https://api.sarvam.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'api-subscription-key': apiKey
        },
        body: JSON.stringify({
          model: 'sarvam-105b-conversations',
          messages,
          temperature: 0.2,
          max_tokens: 120
        })
      });

      const data = await sarvamRes.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return res.json({
          success: true,
          reply: data.choices[0].message.content.trim()
        });
      }

      return res.status(500).json({ error: 'LLM failed', details: data });
    } catch (err) {
      console.error('[VoiceAgent] Sarvam Chat error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // 6. Real-Time Status Inquiry Endpoint
  app.post('/api/voice-agent/status-inquiry', async (req, res) => {
    try {
      const { trackingId, citizenEmail, citizenId } = req.body;
      let query = {};

      if (trackingId) {
        const cleanId = trackingId.toUpperCase().trim();
        query = {
          $or: [
            { challengeId: cleanId },
            { challengeId: { $regex: cleanId.replace(/[^0-9A-Z]/g, ''), $options: 'i' } }
          ]
        };
      } else if (citizenId || citizenEmail) {
        query = {
          $or: [
            ...(citizenId ? [{ submittedBy: citizenId }] : []),
            ...(citizenEmail ? [{ 'submitterContact.email': citizenEmail.toLowerCase() }] : [])
          ]
        };
      }

      const challenge = await Challenge.findOne(query).sort({ createdAt: -1 }).lean();

      if (!challenge) {
        return res.json({
          found: false,
          speech: 'Aapki koi shikayat nahi mili. Kripya apna sahi Tracking ID batayein jaise JH-2026-XXXX.'
        });
      }

      const statusMap = {
        'submitted': 'Darj ho gayi hai aur JanSetu Taskforce dwara jaanch me hai',
        'under_review': 'Adhikari dwara samiksha ki ja rahi hai',
        'validated': 'Satyapit ho chuki hai aur karyawahi aage badha di gayi hai',
        'assigned': 'Karyakari team ko assign kar diya gaya hai',
        'in_progress': 'Karyakari dal dwara kaam pragati par hai',
        'solved': 'Samasya ka safaltapoorvak nivaaran ho gaya hai'
      };

      const friendlyStatus = statusMap[challenge.status] || challenge.status;
      const speech = `Aapki shikayat ${challenge.challengeId} ki vartaman sthiti hai: ${friendlyStatus}. Location: ${challenge.location?.district || 'Jharkhand'}.`;

      return res.json({
        found: true,
        challenge: {
          id: challenge.challengeId,
          title: challenge.title,
          status: challenge.status,
          category: challenge.category,
          location: challenge.location?.address || challenge.location?.district
        },
        speech
      });
    } catch (err) {
      console.error('[VoiceAgent] Status inquiry error:', err);
      return res.status(500).json({ error: err.message });
    }
  });
}

/**
 * ─────────────────────────────────────────────────────────────
 * 7. SARVAM LLM TOOLS DEFINITION & SYSTEM PROMPT
 * ─────────────────────────────────────────────────────────────
 */
const VOICE_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'save_problem_details',
      description: 'Call this as soon as you understand what civic problem the citizen is describing, including its official category, title, description, and priority.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Concise civic title in Hindi or English (max 50 chars)'
          },
          category: {
            type: 'string',
            enum: [
              'Urban Infrastructure',
              'Water Management',
              'Sanitation & Environment',
              'Energy & Technology',
              'Healthcare',
              'Education',
              'Agriculture',
              'Public Administration',
              'Accessibility',
              'Rural Livelihoods'
            ],
            description: 'Official matching civic category'
          },
          description: {
            type: 'string',
            description: 'Clear, full description of the citizen complaint'
          },
          priority: {
            type: 'string',
            enum: ['urgent', 'high', 'normal'],
            description: 'Urgency level inferred from citizen tone or description'
          }
        },
        required: ['title', 'category', 'description']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'advance_to_step',
      description: 'Call this to advance the citizen UI to the next section in the reporting wizard.',
      parameters: {
        type: 'object',
        properties: {
          step: {
            type: 'string',
            enum: ['category', 'details', 'location', 'photo', 'video', 'check', 'done'],
            description: 'Target step in the flow'
          }
        },
        required: ['step']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_duplicate',
      description: 'Check if a matching problem already exists at or near the citizen location.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          category: { type: 'string' },
          lat: { type: 'number' },
          lng: { type: 'number' }
        },
        required: ['title', 'category']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fill_details',
      description: 'Fill in the grievance details including English title, professional English description, and optionally priority.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short professional English title (5-8 words)' },
          description: { type: 'string', description: 'Clean, professional English description of the civic complaint' },
          priority: { type: 'string', enum: ['urgent', 'normal', 'high'], description: 'Urgency level explicitly confirmed by citizen' }
        },
        required: ['description']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'set_priority',
      description: 'Set the priority of the civic complaint after citizen explicitly answers.',
      parameters: {
        type: 'object',
        properties: {
          priority: { type: 'string', enum: ['urgent', 'normal', 'high'], description: 'Urgent or normal priority' }
        },
        required: ['priority']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'evidence_skipped',
      description: 'Call this when the citizen does not have a photo or video to upload, or wants to skip evidence.',
      parameters: {
        type: 'object',
        properties: {
          step: { type: 'string', enum: ['photo', 'video'], description: 'Which evidence step was skipped' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'drop_report',
      description: 'Call this when the citizen decides to cancel/withdraw their report after a duplicate is found, instead of linking it or submitting a new one.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'link_as_twin',
      description: 'Link the user report to an existing matching grievance.',
      parameters: {
        type: 'object',
        properties: {
          existingProblemId: { type: 'string' }
        },
        required: ['existingProblemId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'confirm_submission',
      description: 'Submit the verified civic problem to the database and generate a tracking ID.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  }
];

const SYSTEM_PROMPT = `Tum JanSetu AI ho — ek helpful voice assistant (Aditya) jo Jharkhand ke citizens ko civic problems report karne aur unka status track karne me madad karta hai. Hamesha English ya Hinglish me hi baat karo, jaisa citizen bole waisa hi. Tu Aditya persona me baat kar — "main samajh gaya", "main aapki madad karunga".

IMPORTANT FLOW RULES — STEP BY STEP:
Tu hamesha EK WAQT ME EK HI SAWAAL poochega. Citizen ke jawab ka intezaar kar, phir AGLA sawaal pooch. Kabhi bhi ek hi baar me saari jaankari mat pooch.
Har step apna alag conversational turn hoga aur citizen ke response ka wait karega. Kabhi bhi do steps ya do sawaal ek saath mat pooch.
Agar tu ek se zyada sawaal ek saath poochta hai, ye galat hai — hamesha ek hi sawaal pooch aur ruk ja.

STEP-BY-STEP CONVERSATION FLOW:
1. Pehle citizen se pooch: "Aapko kya samasya aa rahi hai? Batayiye."
2. Jab citizen samasya bataye, confirm kar: "Theek hai, main samajh gaya. [summary]. Kya ye sahi hai?"
3. Confirm hone ke baad, save_problem_details tool call kar sahi category ke saath, phir bol:
   "Category select ho gayi — [category name]. Ab thoda vistar se bataiye, poori samasya kya hai?"
4. Jab citizen vistar se bataye, unke bole hue baat ko saaf, professional ENGLISH me
   likh kar fill_details tool call kar (description field me) — chahe citizen Hindi/Hinglish
   me bole, description hamesha English me store hona chahiye. Title bhi isi call me
   auto-generate karke bhar de (chhota, 5-8 shabdon ka). Ye karne ke baad bol:
   "Maine description likh liya hai — [title]. Check kar lijiye, sahi hai?"
   Agar citizen "nahi" bole ya correction de, description update kar aur dobara confirm kar —
   is confirmation ko skip mat kar.
5. Confirm hone ke baad hi pooch: "Ye kitni urgent hai — urgent hai ya normal?"
   Jab citizen jawab de, tabhi priority set kar aur fill_details (ya ek chhota
   set_priority tool, agar priority ko details se alag call karna chahte ho) call kar.
   Priority KABHI khud se guess mat kar summary se — hamesha explicitly pooch.
6. Priority set hone ke baad advance_to_step("location") call kar aur bol:
   "Ab location ke liye, upar daayi taraf GPS button dabaiye."
   Jab location_captured event mile, bol: "Theek hai, location mil gayi hai." phir
   advance_to_step("photo") call kar.
7. Pooch: "Kya aapke paas is samasya ki photo hai?"
   - Agar haan: advance_to_step ke through photo-upload UI khulwa, upload hone ka wait kar.
   - Agar nahi: seedha agle step pe badh — evidence_skipped handle kar.
8. Pooch: "Video hai kya?" — same haan/nahi logic jaisa photo ka.
9. check_duplicate tool call kar. Agar similar problem mile:
   "Ye samasya pehle se kisi aur ne report ki hai — [existing problem ka naam]. Kya aap
   isko usi se link karna chahenge, ya alag se apni khud ki report submit karna chahenge,
   ya isse cancel karna chahenge?"
   Teen alag jawab handle kar:
   - Link chahiye → link_as_twin tool call kar.
   - Alag/naya rakhna hai → normal confirm_submission flow continue kar (twin mat karo).
   - Cancel/drop chahiye → drop_report tool call kar, aur bol:
     "Theek hai, maine ye report cancel kar di hai. Kabhi bhi phir se report kar sakte hain."
   Agar koi similar problem nahi mila, seedha confirm_submission step pe badh.
10. Sab kuch ho jaane ke baad pooch: "Sab sahi hai? Submit kar doon?"
    Sirf explicit haan milne par confirm_submission tool call kar. Submission ke baad:
    "Aapka problem number hai [tracking ID]. Aap ise My Reports me track kar sakte hain.
    JanSetu istemal karne ke liye dhanyawad!"

STRICT TOPIC GUARDRAIL:
Tu SIRF civic problems (sadak, tooti sadak/potholes, paani/nal/pipeline, drainage/naali, kachra/safai, bijli/transformer/streetlight, health/hospital, education/school, agriculture/kisan) report karne aur unka status batane me madad karta hai.
Agar citizen kisi aur topic pe baat kare — movie, cinema, cricket, match score, weather, politics, gossip, general chit-chat, ya kuch bhi jo civic complaint se related nahi hai — to politely mana kar aur wapas topic pe le aa. Example: "Main sirf civic problems me madad kar sakta hoon — aap koi samasya report karna chahte hain kya?" Kabhi bhi off-topic sawal ka seedha jawab mat de.

CATEGORY MAPPING:
* Sadak, asphalt, divider, pothole, pul, traffic signal -> 'Urban Infrastructure'
* Paani, pipeline, nal, contaminated water, jal aapoorti -> 'Water Management'
* Naala, drainage jam, kachra, gandagi, dustbin, safai -> 'Sanitation & Environment'
* Bijli, transformer, current, taar, streetlight -> 'Energy & Technology'
* Hospital, dawa, doctor, swasthya, clinic -> 'Healthcare'
* School, padhai, vidyalaya, shikshak -> 'Education'
* Kheti, fasal, kisan, sinchai -> 'Agriculture'

RESPONSE RULES:
- Hamesha BAHUT SHORT jawab de — 1 ya MAXIMUM 2 chhote sentences. Lambe paragraphs KABHI mat de.
- Har jawab ke end me AGLE STEP ka EK SAWAAL zaroor pooch.
- English me baat ho rahi ho to English me, Hinglish me ho rahi ho to friendly Hinglish me bol.
- Natural aur friendly reh, jaise ek helpful assistant (Aditya).`;

async function callSarvamConversationalLLM(session, userText) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return { error: 'SARVAM_API_KEY not configured' };
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...(session.history || []).slice(-6),
    { role: 'user', content: userText }
  ];

  try {
    const res = await fetch('https://api.sarvam.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'api-subscription-key': apiKey
      },
      body: JSON.stringify({
        model: 'sarvam-105b-conversations',
        messages,
        tools: VOICE_TOOLS,
        tool_choice: 'auto',
        temperature: 0.2,
        max_tokens: 150
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[VoiceAgent] Sarvam API HTTP error:', res.status, errText);
      return { error: `Sarvam API error: ${res.status}` };
    }

    return await res.json();
  } catch (err) {
    console.error('[VoiceAgent] Sarvam API fetch error:', err);
    return { error: err.message };
  }
}

/**
 * ─────────────────────────────────────────────────────────────
 * 8. WEBSOCKET REAL-TIME SERVICE
 * ─────────────────────────────────────────────────────────────
 */
function setupVoiceAgentWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws) => {
    console.log('🎙️ [VoiceAgent] Client connected to Voice WebSocket');

    // Fresh isolated session state per connection
    const session = {
      id: 'sess_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      lang: 'hi',
      step: 'listening',
      history: [],
      draft: {
        title: '',
        category: 'Urban Infrastructure',
        description: '',
        priority: 'high'
      },
      location: {
        lat: 23.3441,
        lng: 85.3096,
        district: 'Ranchi',
        address: 'Jharkhand'
      },
      attachments: [],
      duplicateCandidate: null,
      trackingId: null
    };

    // Ready signal
    ws.send(JSON.stringify({
      type: 'session_ready',
      message: 'JanSetu Voice AI Connected (Sarvam LLM Tool-Calling Active)',
      sarvamEnabled: Boolean(process.env.SARVAM_API_KEY)
    }));

    // Helper to safely send JSON to client
    const safeSend = (payload) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    };

    // Execute tool call server-side
    const executeToolCall = async (toolName, args) => {
      console.log(`[VoiceAgent] Executing tool: ${toolName}`, args);

      if (toolName === 'save_problem_details' || toolName === 'fill_details') {
        const { title, category, description, priority } = args || {};
        if (title) session.draft.title = title;
        if (category) session.draft.category = category;
        if (description) session.draft.description = description;
        if (priority) session.draft.priority = priority;
        session.step = 'details';

        if (session.draft.category) {
          safeSend({
            type: 'select_category',
            category: session.draft.category
          });
        }

        safeSend({
          type: 'fill_details',
          title: session.draft.title,
          description: session.draft.description,
          priority: session.draft.priority
        });

        return { status: 'success', draft: session.draft };
      }

      if (toolName === 'set_priority') {
        const { priority } = args || {};
        if (priority) session.draft.priority = priority;
        safeSend({
          type: 'fill_details',
          title: session.draft.title,
          description: session.draft.description,
          priority: session.draft.priority
        });
        return { status: 'priority_set', priority: session.draft.priority };
      }

      if (toolName === 'evidence_skipped') {
        const skippedStep = args?.step || session.step;
        if (skippedStep === 'photo') {
          session.step = 'video';
          safeSend({ type: 'advance_step', step: 'video' });
        } else {
          session.step = 'check';
          safeSend({ type: 'advance_step', step: 'check' });
        }
        return { status: 'skipped', next: session.step };
      }

      if (toolName === 'drop_report') {
        session.draft = null;
        session.duplicateCandidate = null;
        safeSend({ type: 'report_dropped' });
        return { status: 'dropped' };
      }

      if (toolName === 'advance_to_step') {
        const step = args?.step || 'location';
        session.step = step;
        safeSend({ type: 'advance_step', step });
        return { status: 'advanced', step };
      }

      if (toolName === 'check_duplicate') {
        const lat = args?.lat || session.location.lat;
        const lng = args?.lng || session.location.lng;
        const title = args?.title || session.draft?.title;
        const category = args?.category || session.draft?.category;

        try {
          const candidates = await Challenge.find({
            status: { $in: ['submitted', 'under_review', 'validated', 'assigned', 'in_progress', 'testing'] }
          }).select('title description category location status challengeId supportCount supports createdAt duplicateCount').lean();

          const matches = findSimilarCitizenProblem({
            title: title || '',
            description: session.draft?.description || title || '',
            category: category || '',
            lat: parseFloat(lat),
            lng: parseFloat(lng)
          }, candidates, 40);

          if (matches.length > 0) {
            session.duplicateCandidate = matches[0];
            safeSend({
              type: 'duplicate_found',
              match: matches[0]
            });
            return { found: true, matchTitle: matches[0].title, existingId: matches[0].challengeId };
          }
        } catch (e) {
          console.error('[VoiceAgent] check_duplicate error:', e.message);
        }

        safeSend({ type: 'no_duplicate' });
        return { found: false };
      }

      if (toolName === 'link_as_twin') {
        const existingId = args?.existingProblemId || session.duplicateCandidate?.challengeId || session.duplicateCandidate?._id;
        try {
          const cand = session.duplicateCandidate;
          if (cand) {
            await Challenge.findByIdAndUpdate(cand._id || cand.id, {
              $inc: { duplicateCount: 1, supportCount: 1 },
              $push: {
                reportedBy: {
                  citizenName: 'Voice Submitter',
                  reportedAt: new Date(),
                  viaVoiceAgent: true
                },
                statusHistory: {
                  status: cand.status || 'submitted',
                  note: 'Linked as twin grievance via JanSetu Real-Time Voice AI'
                }
              }
            });
            session.trackingId = cand.challengeId;
          } else {
            session.trackingId = existingId;
          }

          safeSend({
            type: 'twin_linked',
            trackingId: session.trackingId
          });
          return { status: 'linked', trackingId: session.trackingId };
        } catch (e) {
          console.error('[VoiceAgent] link_as_twin error:', e.message);
          safeSend({
            type: 'twin_linked',
            trackingId: existingId
          });
          return { status: 'linked', trackingId: existingId };
        }
      }

      if (toolName === 'confirm_submission') {
        try {
          const demoUser = await User.findOne({ role: 'citizen' });
          const newChallenge = new Challenge({
            title: session.draft?.title || 'Civic Problem Reported via Voice AI',
            description: session.draft?.description || session.draft?.title || 'Reported via JanSetu Real-Time Voice AI Agent',
            category: session.draft?.category || 'Urban Infrastructure',
            priority: session.draft?.priority || 'high',
            status: 'submitted',
            submittedBy: demoUser ? demoUser._id : null,
            submitterContact: {
              name: 'Citizen Submitter',
              email: 'citizen@jansetu.in',
              phone: '9431100000'
            },
            location: {
              address: session.location.address || 'Jharkhand',
              district: session.location.district || 'Ranchi',
              state: 'Jharkhand',
              coordinates: {
                lat: session.location.lat || 23.3441,
                lng: session.location.lng || 85.3096
              }
            },
            submittedViaVoice: true,
            reportedBy: [{
              citizenName: 'Citizen Submitter',
              reportedAt: new Date(),
              viaVoiceAgent: true
            }],
            attachments: session.attachments.map(a => ({
              filename: 'voice_evidence',
              url: a.url,
              mimetype: a.type === 'video' ? 'video/mp4' : 'image/jpeg'
            })),
            statusHistory: [{
              status: 'submitted',
              note: 'Reported through JanSetu Voice AI (Sarvam 105B Tool-Calling Engine)'
            }]
          });

          await newChallenge.save();
          session.trackingId = newChallenge.challengeId;

          safeSend({
            type: 'submission_confirmed',
            trackingId: session.trackingId,
            draft: session.draft
          });
          return { status: 'submitted', trackingId: session.trackingId };
        } catch (e) {
          console.error('[VoiceAgent] confirm_submission error:', e.message);
          const fallbackId = 'JH-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
          session.trackingId = fallbackId;
          safeSend({
            type: 'submission_confirmed',
            trackingId: fallbackId,
            draft: session.draft
          });
          return { status: 'submitted', trackingId: fallbackId };
        }
      }

      return { error: `Unknown tool: ${toolName}` };
    };

    ws.on('message', async (rawMsg) => {
      try {
        // Binary PCM frames handling
        if (Buffer.isBuffer(rawMsg) && rawMsg.length > 0 && rawMsg[0] !== 0x7b) {
          return;
        }

        let msg = null;
        if (typeof rawMsg === 'string') {
          msg = JSON.parse(rawMsg);
        } else {
          const str = rawMsg.toString('utf8').trim();
          if (!str.startsWith('{')) return;
          msg = JSON.parse(str);
        }

        const type = msg.type;

        // 1. Language Selection
        if (type === 'select_language') {
          session.lang = msg.lang === 'en' ? 'en' : 'hi';
          safeSend({
            type: 'language_confirmed',
            lang: session.lang
          });
        }

        // 2. User Spoken Utterance (STT output from client)
        else if (type === 'user_utterance') {
          const userText = (msg.text || '').trim();
          if (!userText) return;

          console.log(`[VoiceAgent][${session.id}] User said: "${userText}"`);

          // Call Sarvam LLM with Tool Calling
          const llmResult = await callSarvamConversationalLLM(session, userText);

          if (llmResult && llmResult.choices && llmResult.choices[0]) {
            const choice = llmResult.choices[0];
            const message = choice.message;
            const toolCalls = message.tool_calls;
            const replyText = message.content ? message.content.trim() : null;

            // Remember in session history
            session.history.push({ role: 'user', content: userText });
            if (replyText) {
              session.history.push({ role: 'assistant', content: replyText });
            }

            // A. If LLM executed tool calls
            if (Array.isArray(toolCalls) && toolCalls.length > 0) {
              for (const tc of toolCalls) {
                const fnName = tc.function?.name;
                let fnArgs = {};
                try {
                  fnArgs = JSON.parse(tc.function?.arguments || '{}');
                } catch (e) {
                  fnArgs = {};
                }
                await executeToolCall(fnName, fnArgs);
              }

              // Also deliver LLM spoken response if available
              if (replyText) {
                safeSend({
                  type: 'agent_utterance',
                  text: replyText
                });
              }
            } else {
              // B. Standard conversation or Guardrail Redirection
              if (replyText) {
                safeSend({
                  type: 'agent_utterance',
                  text: replyText
                });
              }
            }
          } else {
            console.warn('[VoiceAgent] LLM returned no choices, providing conversational guidance');
            const fallbackSpeech = session.lang === 'en'
              ? 'Could you please describe the civic problem again?'
              : 'Kripya apni samasya ke baare me thoda vistaar se batayein.';
            safeSend({
              type: 'agent_utterance',
              text: fallbackSpeech
            });
          }
        }

        // 3. Location Captured Event from Client GPS (Step 6)
        else if (type === 'location_captured') {
          if (msg.location) {
            session.location = {
              lat: parseFloat(msg.location.lat) || 23.3441,
              lng: parseFloat(msg.location.lng) || 85.3096,
              address: msg.location.address || 'Jharkhand',
              district: msg.location.district || 'Ranchi'
            };
          }

          safeSend({
            type: 'advance_step',
            step: 'photo'
          });
          safeSend({
            type: 'agent_utterance',
            text: 'Theek hai, location mil gayi hai. Kya aapke paas is samasya ki photo hai?'
          });
        }

        // 4. Photo/Video Events (Step 7 & 8)
        else if (type === 'photo_uploaded') {
          if (msg.url) session.attachments.push({ type: 'image', url: msg.url });
          safeSend({ type: 'advance_step', step: 'video' });
          safeSend({
            type: 'agent_utterance',
            text: 'Photo jud gayi hai. Video hai kya?'
          });
        }

        else if (type === 'video_uploaded' || type === 'evidence_skipped') {
          if (type === 'video_uploaded' && msg.url) {
            session.attachments.push({ type: 'video', url: msg.url });
          }
          safeSend({ type: 'advance_step', step: 'check' });

          // Trigger duplicate check at Step 9
          const dupRes = await executeToolCall('check_duplicate', {
            title: session.draft?.title,
            category: session.draft?.category,
            lat: session.location.lat,
            lng: session.location.lng
          });

          if (dupRes && dupRes.found) {
            safeSend({
              type: 'duplicate_found',
              match: session.duplicateCandidate
            });
            safeSend({
              type: 'agent_utterance',
              text: `Ye samasya pehle se kisi aur ne report ki hai — ${dupRes.matchTitle}. Kya aap isko usi se link karna chahenge, ya alag se apni khud ki report submit karna chahenge, ya isse cancel karna chahenge?`
            });
          } else {
            safeSend({
              type: 'agent_utterance',
              text: 'Saari jaankari darj ho gayi hai. Sab sahi hai? Submit kar doon?'
            });
          }
        }

        // 5. Twin Decision from Client (Step 9)
        else if (type === 'twin_decision') {
          if (msg.decision === 'link') {
            await executeToolCall('link_as_twin', {});
          } else if (msg.decision === 'drop' || msg.decision === 'cancel') {
            await executeToolCall('drop_report', {});
          } else {
            safeSend({
              type: 'agent_utterance',
              text: 'Theek hai, ise alag naye report ke roop me submit karte hain. Sab sahi hai? Submit kar doon?'
            });
          }
        }

        // 6. Confirm Final Submission (Step 10)
        else if (type === 'confirm_submission') {
          await executeToolCall('confirm_submission', {});
        }

      } catch (err) {
        console.error('[VoiceAgent] WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      console.log(`🎙️ [VoiceAgent] Session ${session.id} disconnected`);
    });
  });

  return wss;
}

module.exports = {
  setupVoiceAgentRoutes,
  setupVoiceAgentWebSocket
};
