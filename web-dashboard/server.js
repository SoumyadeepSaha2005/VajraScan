require('dotenv').config(); // Load environment variables
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');
const admin = require('firebase-admin');

const app = express();
const upload = multer({ dest: 'uploads/' });

// --- SMART FIREBASE SETUP ---
let db = null; // Start with database as null
try {
    let serviceAccount;
    // Check Render's secret path first, then local path
    const renderPath = '/etc/secrets/firebase-key.json';
    const localPath = './firebase-key.json';

    if (fs.existsSync(renderPath)) {
        console.log("✅ SYSTEM CHECK: Found key at " + renderPath);
        serviceAccount = require(renderPath);
    } else if (fs.existsSync(localPath)) {
        console.log("✅ SYSTEM CHECK: Found key at " + localPath);
        serviceAccount = require(localPath);
    } else {
        console.error("❌ CRITICAL: No serviceAccountKey.json found in any location!");
    }

    // Only initialize if we found a key
    if (serviceAccount) {
        console.log("🧐 KEY INSPECTION:");
        console.log("   - Project ID:", serviceAccount.project_id);
        console.log("   - Client Email:", serviceAccount.client_email);

        const serverTime = new Date();
        console.log("   - Server Time:", serverTime.toISOString());
        
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        db = admin.firestore();
        console.log("🔥 Firebase Initialized!");
    }
} catch (e) {
    console.error("❌ Firebase Setup Error:", e.message);
}
// ----------------------------

app.use(express.static('public'));
// Note: express.json() is not strictly needed for the scan route (multer handles it), 
// but good to keep for other potential routes.
app.use(express.json()); 

app.post('/scan', upload.single('tfFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const settings = req.body.settings || "{}";
    
    // --- 1. CAPTURE USER INFO (Added This) ---
    const userId = req.body.userId || 'anonymous';
    const userEmail = req.body.userEmail || 'unknown';
    // ----------------------------------------

    const pythonProcess = spawn('python', ['../scanner.py', filePath, settings]);

    let dataString = '';

    pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        // Log Python errors but don't crash yet
        console.error(`Python Log: ${data}`);
    });

    pythonProcess.on('close', async (code) => {
        fs.unlinkSync(filePath); // Cleanup

        try {
            // 1. Try to parse the scanner results
            const results = JSON.parse(dataString);

            // 2. Try to save to Firebase (Safely)
            if (db) {
                try {
                    console.log(`⏳ Attempting to save scan for user: ${userEmail}`);
                    
                    // --- 2. SAVE WITH USER ID (Added This) ---
                    await db.collection('scans').add({
                        userId: userId,        // <--- Privacy Key
                        userEmail: userEmail,  // <--- Audit Log
                        fileName: req.file.originalname,
                        results: results,
                        settings: settings,
                        timestamp: admin.firestore.FieldValue.serverTimestamp()
                    });
                    console.log("✅ SUCCESS: Result saved to Firebase!");
                    // -----------------------------------------
                    
                } catch (dbError) {
                    // IF FIREBASE FAILS, WE LOG IT BUT DO NOT CRASH
                    console.error("⚠️ DATABASE ERROR:", dbError.message);
                    console.error("Hint: Check IAM permissions for the Service Account.");
                }
            } else {
                console.warn("⚠️ Database skipped (Init failed earlier).");
            }

            // 3. Always send results to the user
            res.json(results);

        } catch (e) {
            console.error("❌ JSON Parse Error. Raw Python Output:", dataString);
            res.status(500).json({ error: 'Scanner failed to produce valid JSON', raw: dataString });
        }
    });
});

app.post('/ai-fix', async (req, res) => {
    try {
        const { violation, resource } = req.body;
        
        const genAI = new GoogleGenerativeAI("AIzaSyBRf0o3nuGCR7VwiilhcYP-Q3ZsIxrVNwE");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
        I am a Cloud Security Expert.
        I have a Terraform resource named "${resource}" that failed a security check.
        The violation is: "${violation}".
        
        Please provide the CORRECTED Terraform HCL code snippet to fix this specific issue.
        Do not explain. Just give me the code block.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ fix: text });

    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: "AI Brain is tired. Try again." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running...`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});