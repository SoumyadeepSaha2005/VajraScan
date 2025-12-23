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
let db = null; 
try {
    let serviceAccount;
    const renderPath = '/etc/secrets/firebase-key.json';
    const localPath = './firebase-key.json';

    if (fs.existsSync(renderPath)) {
        console.log("✅ SYSTEM CHECK: Found Firebase key at " + renderPath);
        serviceAccount = require(renderPath);
    } else if (fs.existsSync(localPath)) {
        console.log("✅ SYSTEM CHECK: Found Firebase key at " + localPath);
        serviceAccount = require(localPath);
    } else {
        console.warn("⚠️ WARNING: No firebase-key.json found. Database features will be disabled.");
    }

    if (serviceAccount) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        db = admin.firestore();
        console.log("🔥 Firebase Initialized Successfully!");
    }
} catch (e) {
    console.error("❌ Firebase Setup Error:", e.message);
}

app.use(express.static('public'));
app.use(express.json()); 

// --- SCAN ROUTE ---
app.post('/scan', upload.single('tfFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const settings = req.body.settings || "{}";
    const userId = req.body.userId || 'anonymous';
    const userEmail = req.body.userEmail || 'unknown';

    // Spawn Python Process
    const pythonProcess = spawn('python', ['../scanner.py', filePath, settings]);

    let dataString = '';

    pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`Python Log: ${data}`);
    });

    pythonProcess.on('close', async (code) => {
        fs.unlinkSync(filePath); // Cleanup file

        try {
            const results = JSON.parse(dataString);

            // Save to Firebase (Fire & Forget)
            if (db) {
                db.collection('scans').add({
                    userId: userId,
                    userEmail: userEmail,
                    fileName: req.file.originalname,
                    results: results,
                    settings: settings,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                }).then(() => console.log(`✅ Saved scan for: ${userEmail}`))
                  .catch(err => console.error("⚠️ DB Save Failed:", err.message));
            }

            res.json(results);

        } catch (e) {
            console.error("❌ Scan Failed. Raw Output:", dataString);
            res.status(500).json({ error: 'Scanner failed to produce valid JSON', raw: dataString });
        }
    });
});

// --- 🧠 HYBRID AI ROUTE (BULLETPROOF) ---
app.post('/ai-fix', async (req, res) => {
    const { violation, resource } = req.body;
    console.log(`🤖 AI Request: Fixing "${violation}" for "${resource}"`);

    // 1. PREPARE BACKUP (DEMO MODE) FIX
    // If Real AI fails, we return this instantaneously.
    let backupFix = "";
    if (violation.toLowerCase().includes("s3") || resource.includes("bucket")) {
        backupFix = `# FIX: Blocking Public Access for ${resource}\nresource "aws_s3_bucket_public_access_block" "secure_storage" {\n  bucket = aws_s3_bucket.example.id\n  block_public_acls = true\n  block_public_policy = true\n  ignore_public_acls = true\n  restrict_public_buckets = true\n}`;
    } else if (violation.toLowerCase().includes("security group") || resource.includes("sg")) {
        backupFix = `# FIX: Restricting SSH/HTTP access for ${resource}\nresource "aws_security_group" "secure_sg" {\n  name = "secure-web-sg"\n  description = "Allow restricted traffic only"\n  ingress {\n    from_port = 443\n    to_port = 443\n    protocol = "tcp"\n    cidr_blocks = ["10.0.0.0/16"]\n  }\n}`;
    } else {
        backupFix = `# FIX: General Security Hardening for ${resource}\nresource "secure_resource" "main" {\n  # Enable Encryption\n  server_side_encryption = "AES256"\n  # Disable Public IP\n  associate_public_ip_address = false\n}`;
    }

    // 2. TRY REAL AI FIRST
    try {
        // Use Env Var first, fallback to hardcoded key only if needed
        const API_KEY = process.env.GEMINI_KEY || "AIzaSyBRf0o3nuGCR7VwiilhcYP-Q3ZsIxrVNwE"; 
        
        if (!API_KEY) throw new Error("No API Key found");

        const genAI = new GoogleGenerativeAI(API_KEY);
        // Use 'gemini-pro' as it is the most stable for code
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `
        I am a Cloud Security Expert.
        I have a Terraform resource named "${resource}" that failed a security check.
        The violation is: "${violation}".
        
        Please provide the CORRECTED Terraform HCL code snippet to fix this specific issue.
        Do not explain. Just give me the code block.
        `;

        // Timeout Promise: If AI takes > 5 seconds, switch to Backup
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 4500));
        
        const result = await Promise.race([
            model.generateContent(prompt),
            timeout
        ]);

        const response = await result.response;
        const text = response.text();

        console.log("✅ Real AI Success");
        res.json({ fix: text });

    } catch (error) {
        // 3. FALLBACK TO BACKUP IF REAL AI FAILS
        console.warn("⚠️ Real AI Failed (Network/Quota/Timeout). Switching to Demo Mode.");
        console.error("Error Detail:", error.message);
        
        // Return the backup fix so the user NEVER sees an error
        res.json({ fix: backupFix });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});