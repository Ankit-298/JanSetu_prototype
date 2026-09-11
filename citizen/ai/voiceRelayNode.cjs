/**
 * JanSetu Voice Agent Node.js Bridge & WebSocket Service
 * Location: citizen/ai/voiceRelayNode.cjs
 * 
 * Flow:
 * 1. Introduction & Language Selection (Hindi / English)
 * 2. Assistance Inquiry -> Auto-Click White "Report Problem" Card
 * 3. Voice-Driven Category Detection -> Auto-Select Tile -> Auto-Next
 * 4. Polished Description Formatting -> Auto-Next
 * 5. Location Pinpoint ("Use Current Location" -> Auto-Next on fetch)
 * 6. Evidence Inquiry & Upload Guidance (Photo / Video / Skip)
 * 7. Proximity & Duplicate Check -> Announce Match / New Issue -> Twin Decision
 * 8. Final Submission Announcement & MongoDB Save -> Official JH-2026-XXXX Tracking ID
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
    // English
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
 * Detect category from spoken phrase
 */
function detectCategoryFromSpeech(text) {
  const t = text.toLowerCase();
  if (/naala|drain|waterlog|paani jam|ganda paani|sewer|pipe|leak|pipeline/i.test(t)) {
    return {
      key: 'waterlogging',
      name: 'Water & Drainage / Waterlogging',
      hindi: 'जल निकासी एवं नाला',
      officialCategory: 'Urban Infrastructure'
    };
  }
  if (/sadak|road|gaddha|pothole|pul|bridge|divider|cross/i.test(t)) {
    return {
      key: 'roads',
      name: 'Roads & Potholes',
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
          allMatches: matches
        });
      }

      return res.json({ hasDuplicate: false, match: null });
    } catch (err) {
      console.error('[VoiceAgent] Duplicate check error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // 2. Link as Twin (Co-report) endpoint
  app.post('/api/voice-agent/link-twin', async (req, res) => {
    try {
      const { existingProblemId, citizenId, citizenName } = req.body;
      let challenge = null;

      if (existingProblemId) {
        challenge = await Challenge.findOne({
          $or: [
            ...(existingProblemId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: existingProblemId }] : []),
            { challengeId: existingProblemId }
          ]
        });
      }

      if (!challenge) {
        return res.status(404).json({ error: 'Existing problem not found' });
      }

      challenge.duplicateCount = (challenge.duplicateCount || 0) + 1;
      challenge.supportCount = (challenge.supportCount || 0) + 1;

      challenge.reportedBy = challenge.reportedBy || [];
      challenge.reportedBy.push({
        citizenId: citizenId || null,
        citizenName: citizenName || 'Co-reporting Citizen',
        reportedAt: new Date(),
        viaVoiceAgent: true
      });

      challenge.statusHistory.push({
        status: challenge.status,
        note: `Linked as twin grievance via JanSetu Voice AI by ${citizenName || 'citizen'}`
      });

      await challenge.save();

      return res.json({
        success: true,
        status: 'linked',
        trackingId: challenge.challengeId,
        id: challenge._id
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
        priority: 'high',
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
          note: 'Problem reported through JanSetu Voice AI Agent (Sarvam AI)'
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
}

/**
 * Attach Voice Agent WebSocket Server to HTTP server
 */
function setupVoiceAgentWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws) => {
    console.log('🎙️ [VoiceAgent] Client connected to Voice WebSocket');

    const session = {
      lang: 'hi', // 'hi' | 'en'
      step: 'intro_lang', // intro_lang -> assistance_choice -> category_pick -> description -> location -> evidence_photo -> evidence_video -> duplicate_check -> done
      draft: {
        categoryInfo: null,
        category: 'Urban Infrastructure',
        title: '',
        description: ''
      },
      location: null,
      attachments: [],
      duplicateCandidate: null,
      trackingId: null
    };

    // Ready signal
    ws.send(JSON.stringify({
      type: 'session_ready',
      message: 'JanSetu Voice AI Connected',
      sarvamEnabled: Boolean(process.env.SARVAM_API_KEY)
    }));

    // Step 1: Initial Welcome Greeting & Language Inquiry
    setTimeout(() => {
      ws.send(JSON.stringify({
        type: 'agent_utterance',
        text: 'Namaste! JanSetu AI Sahayak me aapka swagat hai. Kripya batayein aap Hindi me baat karenge ya English me?',
        step: 'intro_lang'
      }));
    }, 400);

    ws.on('message', async (rawMsg) => {
      try {
        // If binary audio buffer (e.g. PCM streaming), ignore or forward to STT without throwing JSON parse error
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

        // 1. Language Selected (spoken or clicked)
        if (type === 'select_language') {
          session.lang = msg.lang === 'en' ? 'en' : 'hi';
          session.step = 'assistance_choice';
          console.log(`[VoiceAgent] Language chosen: ${session.lang}`);

          const promptText = session.lang === 'en'
            ? 'JanSetu AI is ready. How can I help you today? You can report a problem or track an existing report.'
            : 'JanSetu me main aapki kya madad kar sakta hoon? Aap samasya darj kar sakte hain ya report status jaan sakte hain.';

          ws.send(JSON.stringify({
            type: 'language_confirmed',
            lang: session.lang,
            step: 'assistance_choice'
          }));

          ws.send(JSON.stringify({
            type: 'agent_utterance',
            text: promptText,
            step: 'assistance_choice'
          }));
        }

        // 2. Action Chosen (e.g. "Report a Problem")
        else if (type === 'choose_action') {
          const action = msg.action || 'report_problem';
          if (action === 'report_problem') {
            session.step = 'category_pick';
            const promptText = session.lang === 'en'
              ? 'Great, let\'s report your problem. What is the issue about? For example, waterlogging, broken roads, garbage, or electricity?'
              : 'Theek hai, samasya darj karte hain. Kripya batayein samasya kis baare me hai? Jaise naala, sadak, paani, kooda ya bijli?';

            ws.send(JSON.stringify({
              type: 'action_confirmed',
              action: 'report_problem',
              step: 'category_pick'
            }));

            ws.send(JSON.stringify({
              type: 'agent_utterance',
              text: promptText,
              step: 'category_pick'
            }));
          }
        }

        // 3. Category Picked (spoken or clicked)
        else if (type === 'select_category') {
          const catInfo = detectCategoryFromSpeech(msg.category || '');
          session.draft.categoryInfo = catInfo;
          session.draft.category = catInfo.officialCategory;
          session.step = 'description';

          const promptText = session.lang === 'en'
            ? `I have selected '${catInfo.name}'. Now please describe the complete issue in detail — what happened and since how many days?`
            : `Maine '${catInfo.hindi}' select kar li hai. Ab kripya samasya ka pura vivaran batayein — kya hua hai aur kitne dino se pareshani hai?`;

          ws.send(JSON.stringify({
            type: 'category_confirmed',
            categoryInfo: catInfo,
            step: 'description'
          }));

          ws.send(JSON.stringify({
            type: 'agent_utterance',
            text: promptText,
            step: 'description'
          }));
        }

        // 4. Description Provided
        else if (type === 'submit_description') {
          const rawText = msg.text || '';
          const formatted = cleanAndFormatCivicText(rawText, session.draft.categoryInfo?.name || '', session.lang);
          session.draft.title = formatted.title;
          session.draft.description = formatted.description;
          session.step = 'location';

          const promptText = session.lang === 'en'
            ? 'Your description is recorded. Now please tap the "Use Current Location" button below to pinpoint the spot.'
            : 'Aapka vivaran darj ho gaya hai. Ab kripya neeche "Use Current Location" button dabayein taaki sahi jagah mark ho sake.';

          ws.send(JSON.stringify({
            type: 'description_confirmed',
            draft: session.draft,
            step: 'location'
          }));

          ws.send(JSON.stringify({
            type: 'agent_utterance',
            text: promptText,
            step: 'location'
          }));
        }

        // 5. Location Captured
        else if (type === 'location_captured') {
          session.location = msg.location || {};
          console.log('[VoiceAgent] Location captured:', session.location);

          // Check proximity duplicate
          const candidates = await Challenge.find({
            status: { $in: ['submitted', 'under_review', 'validated', 'assigned', 'in_progress', 'testing'] }
          }).select('title description category location status challengeId supportCount supports createdAt duplicateCount').lean();

          const matches = findSimilarCitizenProblem({
            title: session.draft.title || '',
            description: session.draft.description || '',
            category: session.draft.category || '',
            lat: session.location.lat,
            lng: session.location.lng
          }, candidates, 42);

          if (matches.length > 0) {
            session.duplicateCandidate = matches[0];
            session.step = 'duplicate_check';

            const promptText = session.lang === 'en'
              ? `A similar issue is already reported in your area: '${matches[0].title}'. Would you like to twin-link your report to boost its priority with authorities?`
              : `Aapke area me isse milti julti samasya pehle se darj hai: '${matches[0].title}'. Kya aap apni report isse jodkar twin link karna chahte hain? Isse authority ko zyada priority milegi.`;

            ws.send(JSON.stringify({
              type: 'duplicate_found',
              match: matches[0],
              step: 'duplicate_check'
            }));

            ws.send(JSON.stringify({
              type: 'agent_utterance',
              text: promptText,
              step: 'duplicate_check'
            }));
          } else {
            session.step = 'evidence_photo';

            const promptText = session.lang === 'en'
              ? 'Location pinpointed. No existing reports found nearby. Do you have a photo or video of the problem to attach?'
              : 'Location mil gayi hai aur aapke ilake me aisi koi samasya pehle se darj nahi hai. Kya aapke paas samasya ki photo ya video hai?';

            ws.send(JSON.stringify({
              type: 'no_duplicate',
              step: 'evidence_photo'
            }));

            ws.send(JSON.stringify({
              type: 'agent_utterance',
              text: promptText,
              step: 'evidence_photo'
            }));
          }
        }

        // 6. Photo & Video Evidence
        else if (type === 'photo_uploaded') {
          if (msg.url) session.attachments.push({ type: 'image', url: msg.url });
          session.step = 'evidence_video';

          const promptText = session.lang === 'en'
            ? 'Photo attached. Do you also have a short video? If not, you can tap Skip.'
            : 'Photo jud gayi hai. Agar koi chhota video hai to upload karein, warna Skip par tap kar sakte hain.';

          ws.send(JSON.stringify({
            type: 'advance_step',
            step: 'evidence_video'
          }));

          ws.send(JSON.stringify({
            type: 'agent_utterance',
            text: promptText,
            step: 'evidence_video'
          }));
        }

        else if (type === 'video_uploaded' || type === 'evidence_skipped') {
          if (type === 'video_uploaded' && msg.url) {
            session.attachments.push({ type: 'video', url: msg.url });
          }
          session.step = 'confirm_submit';

          const promptText = session.lang === 'en'
            ? 'All information is captured. Now I will submit your civic problem to the authorities.'
            : 'Saari jaankari darj ho gayi hai. Ab main aapki samasya prashasan ko darj kar rahi hoon.';

          ws.send(JSON.stringify({
            type: 'advance_step',
            step: 'confirm_submit'
          }));

          ws.send(JSON.stringify({
            type: 'agent_utterance',
            text: promptText,
            step: 'confirm_submit'
          }));

          // Trigger auto-submission after 1.5s
          setTimeout(async () => {
            try {
              const demoUser = await User.findOne({ role: 'citizen' });
              const newChallenge = new Challenge({
                title: session.draft.title || 'Voice Reported Grievance',
                description: session.draft.description || session.draft.title || 'Reported via JanSetu Real-Time Voice AI Agent',
                category: session.draft.category || 'Urban Infrastructure',
                priority: 'high',
                status: 'submitted',
                submittedBy: demoUser ? demoUser._id : null,
                submitterContact: {
                  name: 'Citizen Submitter',
                  email: 'citizen@jansetu.in',
                  phone: '9431100000'
                },
                location: {
                  address: session.location?.address || 'Jharkhand',
                  district: session.location?.district || 'Ranchi',
                  state: 'Jharkhand',
                  coordinates: {
                    lat: session.location?.lat || 23.3441,
                    lng: session.location?.lng || 85.3096
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
                  note: 'Reported via JanSetu Real-Time Voice AI Agent (Sarvam Conversational Stack)'
                }]
              });

              await newChallenge.save();
              session.trackingId = newChallenge.challengeId;
              session.step = 'done';

              const successText = session.lang === 'en'
                ? `Congratulations! Your problem has been successfully submitted. Your official Tracking ID is ${session.trackingId}. You will receive SMS updates.`
                : `Badhaai ho! Aapki samasya safaltapoorvak darj ho gayi hai. Aapka Tracking ID hai ${session.trackingId}. Aapko SMS update mil jayega.`;

              ws.send(JSON.stringify({
                type: 'submission_confirmed',
                trackingId: session.trackingId,
                draft: session.draft,
                step: 'done'
              }));

              ws.send(JSON.stringify({
                type: 'agent_utterance',
                text: successText,
                step: 'done'
              }));
            } catch (err) {
              console.error('[VoiceAgent] Auto-submit error:', err);
            }
          }, 1200);
        }

        // 7. Twin Decision
        else if (type === 'twin_decision') {
          if (msg.decision === 'link' && session.duplicateCandidate) {
            const cand = session.duplicateCandidate;
            await Challenge.findByIdAndUpdate(cand.id || cand._id, {
              $inc: { duplicateCount: 1, supportCount: 1 },
              $push: {
                reportedBy: {
                  citizenName: 'Voice Submitter',
                  reportedAt: new Date(),
                  viaVoiceAgent: true
                },
                statusHistory: {
                  status: cand.status || 'submitted',
                  note: 'Linked as twin grievance via JanSetu Voice AI'
                }
              }
            });

            session.trackingId = cand.challengeId;
            session.step = 'done';

            const successText = session.lang === 'en'
              ? `Success! Your report has been linked to the existing grievance. Your Tracking ID is ${session.trackingId}.`
              : `Badhaai ho! Aapki report safaltapoorvak link kar di gayi hai. Aapka Tracking ID hai: ${session.trackingId}`;

            ws.send(JSON.stringify({
              type: 'twin_linked',
              trackingId: session.trackingId,
              step: 'done'
            }));

            ws.send(JSON.stringify({
              type: 'agent_utterance',
              text: successText,
              step: 'done'
            }));
          } else {
            // Citizen wants to submit as fresh issue
            session.step = 'evidence_photo';
            const promptText = session.lang === 'en'
              ? 'Alright, recording this as a fresh problem. Do you have a photo or video to upload?'
              : 'Theek hai, ise alag nayi samasya ke roop me darj karte hain. Kya aapke paas photo ya video hai?';

            ws.send(JSON.stringify({
              type: 'advance_step',
              step: 'evidence_photo'
            }));

            ws.send(JSON.stringify({
              type: 'agent_utterance',
              text: promptText,
              step: 'evidence_photo'
            }));
          }
        }

        // 8. General User Spoken Utterance
        else if (type === 'user_utterance') {
          const text = (msg.text || '').trim();
          console.log(`[VoiceAgent] Spoken in step '${session.step}':`, text);

          // Step 1: Language selection by speech
          if (session.step === 'intro_lang') {
            if (/english|angreji/i.test(text)) {
              ws.emit('message', JSON.stringify({ type: 'select_language', lang: 'en' }));
            } else {
              ws.emit('message', JSON.stringify({ type: 'select_language', lang: 'hi' }));
            }
          }

          // Step 2: Assistance choice by speech
          else if (session.step === 'assistance_choice') {
            if (/report|samasya|problem|shikayat|darj|issue|complaint/i.test(text)) {
              ws.emit('message', JSON.stringify({ type: 'choose_action', action: 'report_problem' }));
            } else {
              ws.emit('message', JSON.stringify({ type: 'choose_action', action: 'report_problem' }));
            }
          }

          // Step 3: Category pick by speech
          else if (session.step === 'category_pick') {
            ws.emit('message', JSON.stringify({ type: 'select_category', category: text }));
          }

          // Step 4: Description by speech
          else if (session.step === 'description') {
            ws.emit('message', JSON.stringify({ type: 'submit_description', text }));
          }
        }
      } catch (err) {
        console.error('[VoiceAgent] WebSocket message handling error:', err);
      }
    });

    ws.on('close', () => {
      console.log('🎙️ [VoiceAgent] Client disconnected');
    });
  });

  return wss;
}

module.exports = {
  setupVoiceAgentRoutes,
  setupVoiceAgentWebSocket
};
