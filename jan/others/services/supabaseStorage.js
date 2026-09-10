const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const rawSupabaseUrl = process.env.SUPABASE_URL || '';
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabaseBucket = process.env.SUPABASE_BUCKET || 'jansetu-files';

let supabase = null;

function isSupabaseConfigured() {
  return Boolean(
    supabaseUrl &&
    supabaseKey &&
    !supabaseUrl.includes('your-project') &&
    !supabaseKey.includes('your-supabase-anon')
  );
}

if (isSupabaseConfigured()) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    console.log(`[Supabase Storage] Initialized client for ${supabaseUrl} (Bucket: ${supabaseBucket})`);
  } catch (err) {
    console.error('[Supabase Storage] Initialization error:', err.message);
  }
} else {
  console.log('[Supabase Storage] Using local storage fallback until valid SUPABASE_URL & SUPABASE_KEY are provided in .env');
}

/**
 * Upload a binary buffer to Supabase Cloud Storage (with local disk fallback)
 * @param {Object} options
 * @param {Buffer} options.buffer - File buffer
 * @param {string} options.originalname - Original file name
 * @param {string} options.mimetype - MIME type of file
 * @param {string} [options.folder='problems'] - Subfolder in bucket
 * @returns {Promise<{filePath: string, publicUrl: string, filename: string, size: number, mimetype: string, storageType: string}>}
 */
async function uploadBufferToSupabase({ buffer, originalname, mimetype, folder = 'problems' }) {
  const safeBase = path.basename(originalname || 'evidence.png').replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueName = `${Date.now()}_${Math.round(Math.random() * 1e6)}_${safeBase}`;
  const filePath = `${folder}/${uniqueName}`;

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.storage
        .from(supabaseBucket)
        .upload(filePath, buffer, {
          contentType: mimetype || 'image/png',
          upsert: true
        });

      if (error) {
        console.warn('[Supabase Storage] Upload error from Supabase API:', error.message);
        throw error;
      }

      const { data: publicData } = supabase.storage
        .from(supabaseBucket)
        .getPublicUrl(filePath);

      const publicUrl = publicData?.publicUrl || `${supabaseUrl}/storage/v1/object/public/${supabaseBucket}/${filePath}`;

      return {
        success: true,
        filePath,
        publicUrl,
        filename: uniqueName,
        size: buffer.length,
        mimetype: mimetype || 'image/png',
        storageType: 'supabase'
      };
    } catch (err) {
      console.warn('[Supabase Storage] Fallback to local storage due to upload failure:', err.message);
    }
  }

  // Local storage fallback
  const localUploadDir = path.join(process.env.UPLOAD_PATH || './public/uploads', folder);
  if (!fs.existsSync(localUploadDir)) {
    fs.mkdirSync(localUploadDir, { recursive: true });
  }

  const localDiskPath = path.join(localUploadDir, uniqueName);
  fs.writeFileSync(localDiskPath, buffer);

  return {
    success: true,
    filePath: `${folder}/${uniqueName}`,
    publicUrl: `/uploads/${folder}/${uniqueName}`,
    filename: uniqueName,
    size: buffer.length,
    mimetype: mimetype || 'image/png',
    storageType: 'local'
  };
}

/**
 * Upload a Base64 Data URL to Supabase Cloud Storage
 * @param {string} base64Str - Data URL or base64 string (e.g. data:image/png;base64,...)
 * @param {string} [originalname='citizen_evidence.png']
 * @param {string} [folder='problems']
 */
async function uploadBase64ToSupabase(base64Str, originalname = 'citizen_evidence.png', folder = 'problems') {
  if (!base64Str || typeof base64Str !== 'string') {
    return null;
  }

  // If it is already an http(s) URL or relative server path (not base64), return as-is
  if (!base64Str.startsWith('data:')) {
    return {
      filePath: null,
      publicUrl: base64Str,
      filename: path.basename(base64Str),
      size: 0,
      mimetype: 'image/png',
      storageType: 'existing'
    };
  }

  const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  let mimetype = 'image/png';
  let buffer;

  if (matches && matches.length === 3) {
    mimetype = matches[1];
    buffer = Buffer.from(matches[2], 'base64');
  } else {
    // raw base64 string
    buffer = Buffer.from(base64Str, 'base64');
  }

  return uploadBufferToSupabase({
    buffer,
    originalname,
    mimetype,
    folder
  });
}

/**
 * Delete one or multiple files from Supabase Storage (and local fallback)
 * @param {string|string[]} filePaths
 * @returns {Promise<{success: boolean, deleted: string[]}>}
 */
async function deleteFileFromSupabase(filePaths) {
  if (!filePaths) return { success: true, deleted: [] };

  const paths = (Array.isArray(filePaths) ? filePaths : [filePaths])
    .filter(p => typeof p === 'string' && p.trim().length > 0)
    .map(p => p.trim());

  if (paths.length === 0) {
    return { success: true, deleted: [] };
  }

  const deleted = [];

  // 1. If Supabase is configured, delete from bucket
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.storage
        .from(supabaseBucket)
        .remove(paths);

      if (error) {
        console.warn('[Supabase Storage] Delete error from Supabase API:', error.message);
      } else {
        console.log(`[Supabase Storage] Successfully deleted ${paths.length} file(s) from bucket "${supabaseBucket}":`, paths);
        deleted.push(...paths);
      }
    } catch (err) {
      console.warn('[Supabase Storage] Failed to delete from Supabase:', err.message);
    }
  }

  // 2. Also check and clean up any local fallback files on disk
  const uploadRoot = path.resolve(process.env.UPLOAD_PATH || './public/uploads');
  for (const fp of paths) {
    try {
      const normalizedPath = fp.replace(/^\/uploads\//, '');
      const localFile = path.join(uploadRoot, normalizedPath);
      if (fs.existsSync(localFile)) {
        fs.unlinkSync(localFile);
        console.log(`[Storage] Deleted local fallback file: ${localFile}`);
        if (!deleted.includes(fp)) deleted.push(fp);
      }
    } catch (err) {
      // ignore
    }
  }

  return { success: true, deleted };
}

module.exports = {
  isSupabaseConfigured,
  uploadBufferToSupabase,
  uploadBase64ToSupabase,
  deleteFileFromSupabase
};
