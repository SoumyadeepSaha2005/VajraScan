const fileInput = document.getElementById('fileInput');
let severityChartInstance = null;
let cloudChartInstance = null;

// Default Settings
let currentSettings = {
    aws_s3: true,
    aws_sg: true,
    azure_storage: true
};

// --- NAVIGATION LOGIC ---
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));

    // Show selected section
    document.getElementById(sectionId + '-section').classList.remove('hidden');
    document.getElementById('nav-' + sectionId).classList.add('active');
}

// --- SETTINGS LOGIC ---
function saveSettings() {
    currentSettings.aws_s3 = document.getElementById('check_aws_s3').checked;
    currentSettings.aws_sg = document.getElementById('check_aws_sg').checked;
    currentSettings.azure_storage = document.getElementById('check_azure_storage').checked;
    
    alert("Policies Updated! Next scan will use these rules.");
    showSection('dashboard');
}

// --- SCAN LOGIC (UPDATED FOR PRIVACY) ---
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 1. PRIVACY CHECK: Get Current User
    const user = auth.currentUser;
    if (!user) {
        alert("⚠️ You must be logged in to scan files.");
        window.location.href = "login.html";
        return;
    }

    const formData = new FormData();
    formData.append('tfFile', file);
    // Send settings as a JSON string
    formData.append('settings', JSON.stringify(currentSettings));
    
    // 2. ATTACH USER ID (This keeps data private)
    formData.append('userId', user.uid);
    formData.append('userEmail', user.email);

    const btn = document.querySelector('.upload-btn');
    btn.innerText = "Scanning...";
    btn.style.opacity = "0.7";

    try {
        const response = await fetch('/scan', { method: 'POST', body: formData });
        const data = await response.json();
        
        if(data.error) { alert("Error: " + data.error); return; }

        renderDashboard(data);
        renderReport(data); // Also populate the report tab
        
    } catch (error) {
        console.error('Error:', error);
        alert("Scan Failed. Please check console.");
    } finally {
        btn.innerText = "+ New Scan";
        btn.style.opacity = "1";
    }
});

function renderDashboard(data) {
    document.getElementById('chartsArea').classList.remove('hidden');
    document.getElementById('resultsArea').classList.remove('hidden');

    // Metrics
    const critical = data.filter(i => i.Severity === 'CRITICAL').length;
    const score = Math.max(0, 100 - (data.length * 10)); // Simple scoring
    document.getElementById('score').innerText = score + "%";
    document.getElementById('criticalCount').innerText = critical;

    // Table
    const tbody = document.querySelector('#resultsTable tbody');
    tbody.innerHTML = '';
    data.forEach(issue => {
        let color = issue.Severity === 'CRITICAL' ? '#ef4444' : '#f59e0b';
        tbody.innerHTML += `
            <tr>
                <td>${issue.Cloud}</td>
                <td><b>${issue.Resource}</b></td>
                <td><span style="color:${color}">${issue.Severity}</span></td>
                <td>${issue.Compliance}</td>
                <td><code>${issue.Fix}</code></td>
            </tr>`;
    });

    renderCharts(data);
}

function renderReport(data) {
    const today = new Date().toLocaleDateString('en-IN', { 
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    
    // 1. Fill Meta Info
    document.getElementById('printDate').innerText = today;

    // 2. Fill Summary Stats
    const total = data.length;
    const critical = data.filter(i => i.Severity === 'CRITICAL').length;
    const score = Math.max(0, 100 - (total * 5) - (critical * 10));

    document.getElementById('printScore').innerText = score + "/100";
    document.getElementById('printCritical').innerText = critical;
    document.getElementById('printTotal').innerText = total;

    // 3. Fill the Narrative Summary
    const summaryText = document.getElementById('printSummary');
    if (score > 80) {
        summaryText.innerText = "The infrastructure appears mostly secure with a high compliance score. Only minor issues were detected.";
    } else if (score > 50) {
        summaryText.innerText = "Several security risks were detected. While not immediately catastrophic, these vulnerabilities should be prioritized before production deployment.";
    } else {
        summaryText.innerText = "CRITICAL WARNING: The scanned infrastructure contains severe security flaws (Public Access/Unencrypted Data). Immediate remediation is required to comply with DPDP Act laws.";
    }

    // 4. Fill the Detailed Table (Book Format)
    const tbody = document.getElementById('printTableBody');
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">No threats detected. System is secure.</td></tr>';
        return;
    }

    data.forEach(issue => {
        const row = `
            <tr>
                <td class="sev-${issue.Severity.toLowerCase()}"><strong>${issue.Severity}</strong></td>
                <td>${issue.Cloud}</td>
                <td>${issue.Resource}</td>
                <td>
                    <div class="violation-title">${issue.Compliance}</div>
                    <div class="violation-fix">Fix: <code>${issue.Fix}</code></div>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    // Also populate the on-screen simple list in the Reports tab
    const reportTbody = document.querySelector('#reportTable tbody');
    reportTbody.innerHTML = '';
    data.forEach(issue => {
        reportTbody.innerHTML += `
            <tr>
                <td>${issue.Compliance.split(' ')[0]}</td>
                <td><span style="color:#ef4444">FAILED</span></td>
                <td>${issue.Cloud}</td>
                <td>${issue.Type} - ${issue.Fix}</td>
            </tr>`;
    });
}

function renderCharts(data) {
    // (Same Chart Logic as before - keep it simple)
    const severityCounts = { 'CRITICAL': 0, 'HIGH': 0, 'MEDIUM': 0, 'LOW': 0 };
    data.forEach(i => { if(severityCounts[i.Severity] !== undefined) severityCounts[i.Severity]++; });

    const ctx1 = document.getElementById('severityChart').getContext('2d');
    if (severityChartInstance) severityChartInstance.destroy();
    severityChartInstance = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: Object.keys(severityCounts),
            datasets: [{ data: Object.values(severityCounts), backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'], borderWidth: 0 }]
        }
    });

    const cloudCounts = { 'AWS': 0, 'AZURE': 0 };
    data.forEach(i => { if(cloudCounts[i.Cloud] !== undefined) cloudCounts[i.Cloud]++; });

    const ctx2 = document.getElementById('cloudChart').getContext('2d');
    if (cloudChartInstance) cloudChartInstance.destroy();
    cloudChartInstance = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: Object.keys(cloudCounts),
            datasets: [{ label: 'Issues', data: Object.values(cloudCounts), backgroundColor: '#3b82f6' }]
        }
    });
}