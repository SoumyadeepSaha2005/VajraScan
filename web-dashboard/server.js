const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Serve static files (HTML, CSS, JS) from a 'public' folder
app.use(express.static('public'));

// API Endpoint: Upload and Scan
app.post('/scan', upload.single('tfFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    
    // Call the Python Scanner from Node.js
    // We look in the parent folder (../scanner.py)
    const pythonProcess = spawn('python', ['../scanner.py', filePath]);

    let dataString = '';

    pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
    });

    pythonProcess.on('close', (code) => {
        // Delete the uploaded file after scanning
        fs.unlinkSync(filePath);

        try {
            const results = JSON.parse(dataString);
            res.json(results);
        } catch (e) {
            res.status(500).json({ error: 'Failed to parse scanner output', raw: dataString });
        }
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});