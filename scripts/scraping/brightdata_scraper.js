const axios = require('axios');
const fs = require('fs');
const csv = require('csv-parser');
const FormData = require('form-data');
require('dotenv').config();

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337/api';
const STRAPI_TOKEN = process.env.STRAPI_TOKEN;
const BRIGHT_DATA_TOKEN = process.env.BRIGHT_DATA_TOKEN;
const DATASET_ID = process.env.BRIGHT_DATA_DATASET_ID; // gd_...

// --- Helper: Read CSV ---
function readCsv(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        const url = data.linkedin_url || data.url;
        if (url) results.push(url);
      })
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

// --- Helper: Trigger Dataset Collection (API v3) ---
async function triggerScraping(urls) {
  console.log(`🚀 Triggering Bright Data Dataset (${DATASET_ID}) for ${urls.length} profiles...`);
  
  const endpoint = `https://api.brightdata.com/datasets/v3/trigger?dataset_id=${DATASET_ID}&include_errors=true`;
  
  try {
    const response = await axios.post(endpoint, urls.map(url => ({ url })), {
      headers: {
        'Authorization': `Bearer ${BRIGHT_DATA_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const snapshotId = response.data.snapshot_id;
    console.log(`✅ Collection started! Snapshot ID: ${snapshotId}`);
    return snapshotId;
  } catch (error) {
    console.error("❌ Error triggering Bright Data:", error.response?.data || error.message);
    throw error;
  }
}

// --- Helper: Poll for Results (API v3 /progress) ---
async function waitForResults(snapshotId) {
  console.log(`⏳ Waiting for results (Snapshot: ${snapshotId})...`);
  
  let attempts = 0;
  const maxAttempts = 60; // 60 * 5s = 5 mins timeout
  const pollInterval = 5000;

  while (attempts < maxAttempts) {
    try {
      const progressUrl = `https://api.brightdata.com/datasets/v3/progress/${snapshotId}`;
      const progressRes = await axios.get(progressUrl, {
        headers: { 'Authorization': `Bearer ${BRIGHT_DATA_TOKEN}` }
      });
      
      const status = progressRes.data.status;
      const progress = progressRes.data.progress || 0;
      
      console.log(`... Status: ${status} (Progress: ${progress}%) - Attempt ${attempts + 1}/${maxAttempts}`);

      if (status === 'ready' || progress === 1 || progress === 100 || progress === '100%') {
        console.log("✅ Snapshot is ready! Downloading data...");
        
        const dataUrl = `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`;
        const dataRes = await axios.get(dataUrl, {
          headers: { 'Authorization': `Bearer ${BRIGHT_DATA_TOKEN}` }
        });
        
        let data = dataRes.data;
        if (typeof data === 'string') {
             data = data.split('\n').filter(line => line.trim() !== '').map(JSON.parse);
        }
        
        console.log(`✅ Received ${data.length} profiles!`);
        return data;
      } else if (status === 'failed') {
          throw new Error("Bright Data Snapshot failed.");
      }
      
    } catch (error) {
       if (error.response && error.response.status === 404) {
           console.log(`... Snapshot initializing (404) - Attempt ${attempts + 1}/${maxAttempts}`);
       } else {
           console.error("⚠️ Error checking progress:", error.message);
       }
    }

    attempts++;
    await new Promise(r => setTimeout(r, pollInterval));
  }
  
  throw new Error("Timeout waiting for Bright Data results");
}

// --- Helper: Upload Image to Strapi ---
async function uploadImageToStrapi(imageUrl, name) {
  if (!imageUrl) return null;

  try {
    console.log(`   Downloading image for ${name}...`);
    const imageResponse = await axios.get(imageUrl, { 
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });
    
    const formData = new FormData();
    formData.append('files', imageResponse.data, { filename: `${name.replace(/\s+/g, '_')}_profile.jpg` });
    
    // Upload to Strapi Media Library
    const uploadRes = await axios.post(`${STRAPI_URL.replace('/api', '')}/api/upload`, formData, {
      headers: {
        'Authorization': `Bearer ${STRAPI_TOKEN}`,
        ...formData.getHeaders()
      }
    });

    if (uploadRes.data && uploadRes.data.length > 0) {
      console.log(`   ✅ Image uploaded (ID: ${uploadRes.data[0].id})`);
      return uploadRes.data[0].id;
    }
  } catch (error) {
    console.error(`   ⚠️ Failed to upload image for ${name}:`, error.message);
  }
  return null;
}

// --- Helper: Process & Upload Profile (Production Optimized) ---
async function processAndUpload(profiles) {
  console.log(`\n📦 Starting batch upload for ${profiles.length} profiles...`);
  
  const BATCH_SIZE = 5; // Process 5 profiles concurrently
  const DELAY_MS = 500; // Wait 500ms between batches to be nice to Strapi
  
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
    const batch = profiles.slice(i, i + BATCH_SIZE);
    console.log(`\n--- Processing Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(profiles.length / BATCH_SIZE)} ---`);

    await Promise.all(batch.map(async (profile) => {
      if (!profile) return;

      // --- MAPPING ---
      const mapped = {
        firstName: profile.first_name || (profile.name ? profile.name.split(' ')[0] : "Unknown"),
        lastName: profile.last_name || (profile.name ? profile.name.split(' ').slice(1).join(' ') : "Alumnus"),
        
        jobTitle: profile.headline 
                  || (profile.experience && profile.experience[0]?.title) 
                  || (profile.current_company && profile.current_company.name ? `Employee at ${profile.current_company.name}` : "Job Unknown"),
        
        company: profile.current_company_name 
                 || (profile.current_company?.name) 
                 || (profile.experience && profile.experience[0]?.company) 
                 || "Company Unknown",
        
        city: profile.city || profile.location || "Paris",
        linkedinUrl: profile.url || profile.linkedin_url || profile.input?.url,
        
        photoUrl: profile.avatar || profile.profile_image_url || profile.image,
        
        promotionYear: (profile.education && profile.education.length > 0 && profile.education[0].end_year) 
            ? String(profile.education[0].end_year) 
            : "2024",
            
        sectorName: profile.industry || "Tech"
      };

      try {
         const slug = `${mapped.firstName}-${mapped.lastName}`
              .toLowerCase()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

         // Check duplicate
         const check = await axios.get(`${STRAPI_URL}/alumni?filters[slug][$eq]=${slug}`, {
           headers: { Authorization: `Bearer ${STRAPI_TOKEN}` }
         });
         
         if (check.data.data && check.data.data.length > 0) {
           console.log(`⏩ [SKIP] ${mapped.firstName} ${mapped.lastName} already exists.`);
           return;
         }
         
         // 1. Upload Image (Robust)
         let photoId = null;
         if (mapped.photoUrl) {
           photoId = await uploadImageToStrapi(mapped.photoUrl, mapped.lastName);
         }

         // 2. Create Alumnus
         await axios.post(`${STRAPI_URL}/alumni`, {
           data: {
             firstName: mapped.firstName,
             lastName: mapped.lastName,
             jobTitle: mapped.jobTitle,
             company: mapped.company,
             city: mapped.city,
             linkedinUrl: mapped.linkedinUrl,
             slug: slug,
             photo: photoId 
           }
         }, {
           headers: { Authorization: `Bearer ${STRAPI_TOKEN}` }
         });
         console.log(`✅ [OK] Saved ${mapped.firstName} ${mapped.lastName}`);
         successCount++;

      } catch (err) {
        console.error(`❌ [ERROR] ${mapped.firstName} ${mapped.lastName}:`, err.response?.data?.error?.message || err.message);
        failCount++;
      }
    }));
    
    // Throttle
    if (i + BATCH_SIZE < profiles.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }
  
  console.log(`\n🎉 Upload Complete! Success: ${successCount}, Failed: ${failCount}`);
}

// --- Helper: Check & Update Schedule ---
async function checkSchedule() {
  console.log("Checking scraping schedule...");
  try {
    const res = await axios.get(`${STRAPI_URL}/configuration`, {
      headers: { Authorization: `Bearer ${STRAPI_TOKEN}` }
    });

    const config = res.data.data;
    if (!config) {
      console.log("⚠️ No configuration found in Strapi. Assuming first run.");
      return true; // Run if no config exists yet (or Single Type empty)
    }

    const { frequency, lastRun } = config;
    if (!lastRun) {
      console.log("✨ First run detected (no lastRun date).");
      return true;
    }

    const lastRunDate = new Date(lastRun);
    const now = new Date();
    const diffMs = now - lastRunDate;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    let requiredDays = 30; // Default Monthly
    switch (frequency) {
      case 'weekly': requiredDays = 7; break;
      case 'monthly': requiredDays = 30; break;
      case 'quarterly': requiredDays = 90; break;
      case 'semester': requiredDays = 180; break;
    }

    console.log(`Last Run: ${lastRunDate.toISOString().split('T')[0]} (${Math.floor(diffDays)} days ago)`);
    console.log(`Frequency: ${frequency} (Requires ${requiredDays} days gap)`);

    if (diffDays >= requiredDays) {
      console.log("✅ Schedule condition met. Starting scrape.");
      return true;
    } else {
      console.log("zzz Skipping scrape: Too soon.");
      return false;
    }

  } catch (error) {
    // If 404 (Single Type not initialized), treat as first run
    if (error.response && error.response.status === 404) {
       console.log("⚠️ Configuration not initialized in Strapi. Starting scrape.");
       return true;
    }
    console.error("❌ Error checking schedule:", error.message);
    return false; // Fail safe
  }
}

async function updateLastRun() {
  try {
    await axios.put(`${STRAPI_URL}/configuration`, {
      data: { lastRun: new Date() }
    }, {
      headers: { Authorization: `Bearer ${STRAPI_TOKEN}` }
    });
    console.log("📅 Updated 'lastRun' in Strapi Configuration.");
  } catch (error) {
    console.error("⚠️ Failed to update 'lastRun':", error.message);
  }
}

// --- Helper: Fetch Pending Alumni from Strapi ---
async function getPendingAlumni() {
  console.log("🔍 Fetching pending alumni from Strapi...");
  try {
    const res = await axios.get(`${STRAPI_URL}/alumni?filters[scrapingStatus][$eq]=pending&pagination[pageSize]=50`, {
      headers: { Authorization: `Bearer ${STRAPI_TOKEN}` }
    });
    return res.data.data || [];
  } catch (error) {
    console.error("❌ Failed to fetch pending alumni:", error.message);
    return [];
  }
}

// --- Helper: Update Alumnus Status ---
async function updateAlumnusStatus(documentId, status, data = {}) {
  await axios.put(`${STRAPI_URL}/alumni/${documentId}`, {
    data: { scrapingStatus: status, ...data }
  }, {
    headers: { Authorization: `Bearer ${STRAPI_TOKEN}` }
  });
}

// --- Main Execution ---
(async () => {
  if (!BRIGHT_DATA_TOKEN || !DATASET_ID) {
    console.error("❌ Missing BRIGHT_DATA_TOKEN or BRIGHT_DATA_DATASET_ID in .env");
    process.exit(1);
  }

  // 1. Check Schedule
  const shouldRun = await checkSchedule();
  if (!shouldRun) {
    console.log("🛑 Exiting script (Schedule constraint).");
    process.exit(0);
  }

  try {
    // 2. Get Targets from Strapi (instead of CSV)
    const pendingAlumni = await getPendingAlumni();
    if (pendingAlumni.length === 0) {
      console.log("✅ No pending alumni to scrape. Work done!");
      process.exit(0);
    }

    const urls = pendingAlumni.map(a => a.linkedinUrl).filter(Boolean);
    if (urls.length === 0) throw new Error("Pending alumni found but no LinkedIn URLs provided.");

    // Mark as processing
    for (const alum of pendingAlumni) {
      try {
        await updateAlumnusStatus(alum.documentId, 'processing');
      } catch (err) {
        console.error(`⚠️ Failed to mark ${alum.documentId} as processing:`, err.response?.data?.error?.message || err.message);
      }
    }

    const snapshotId = await triggerScraping(urls);
    const results = await waitForResults(snapshotId);
    
    // 3. Process and match back to original records
    console.log(`📤 Updating ${results.length} profiles in Strapi...`);
    
    for (const profile of results) {
      // Find the original record by URL
      const original = pendingAlumni.find(a =>
        a.linkedinUrl && (a.linkedinUrl.includes(profile.linkedin_id) || a.linkedinUrl.includes(profile.url || profile.id))
      );

      if (!original) {
        console.log(`⚠️ No matching alumni found for profile: ${profile.url || profile.linkedin_id || profile.id}`);
        continue;
      }

      try {
        const firstName = profile.first_name || (profile.name ? profile.name.split(' ')[0] : null);
        const lastName = profile.last_name || (profile.name ? profile.name.split(' ').slice(1).join(' ') : null);

        const updateData = {
          scrapingStatus: 'done',
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(profile.headline && { jobTitle: profile.headline }),
          ...(profile.city || profile.location ? { city: profile.city || profile.location } : {}),
          ...((profile.current_company_name || profile.current_company?.name) && {
            company: profile.current_company_name || profile.current_company?.name
          }),
        };

        // Upload photo if available
        const photoUrl = profile.avatar || profile.profile_image_url || profile.image;
        if (photoUrl) {
          const photoId = await uploadImageToStrapi(photoUrl, lastName || original.documentId);
          if (photoId) updateData.photo = photoId;
        }

        await updateAlumnusStatus(original.documentId, 'done', updateData);
        console.log(`✅ [UPDATED] ${firstName || ''} ${lastName || ''} (${original.documentId})`);
      } catch (err) {
        const detail = err.response?.data?.error?.message || err.response?.data || err.message;
        console.error(`❌ [ERROR] Failed to update ${original.documentId}:`, detail);
        try {
          await updateAlumnusStatus(original.documentId, 'error');
        } catch (_) {}
      }
    }

    await updateLastRun();

  } catch (error) {
    console.error("🔥 Fatal Error:", error.message);
  }
})();
