const fileInput = document.getElementById('fileInput');
let severityChartInstance = null;
let cloudChartInstance = null;

// Listen for file upload
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('tfFile', file);

    // Show loading state
    const btn = document.querySelector('.upload-btn');
    const originalText = btn.innerText;
    btn.innerText = "Scanning...";
    btn.style.opacity = "0.7";

    try {
        // Send file to Node.js server
        const response = await fetch('/scan', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        // Handle Errors
        if(data.error) {
            alert("Scan Error: " + data.error);
            return;
        }

        renderDashboard(data);
        
    } catch (error) {
        console.error('Error:', error);
        alert("Server connection failed. Is Node running?");
    } finally {
        // Reset button
        btn.innerText = originalText;
        btn.style.opacity = "1";
    }
});

function renderDashboard(data) {
    // 1. Unhide Sections
    document.getElementById('chartsArea').classList.remove('hidden');
    document.getElementById('resultsArea').classList.remove('hidden');

    // 2. Update Metrics
    const total = data.length;
    const critical = data.filter(i => i.Severity === 'CRITICAL').length;
    // Simple Score Logic: Start at 100, lose points for errors
    const score = Math.max(0, 100 - (total * 5) - (critical * 10));

    document.getElementById('score').innerText = score + "%";
    document.getElementById('criticalCount').innerText = critical;
    
    // Determine Cloud Types present
    const clouds = [...new Set(data.map(i => i.Cloud))];
    document.getElementById('cloudCount').innerText = clouds.join(" / ") || "None";

    // Color code the score
    const scoreElem = document.getElementById('score');
    scoreElem.style.color = score > 80 ? '#10b981' : (score > 50 ? '#f59e0b' : '#ef4444');

    // 3. Populate Table
    const tbody = document.querySelector('#resultsTable tbody');
    tbody.innerHTML = ''; // Clear old rows
    
    data.forEach(issue => {
        // Badge color for severity
        let sevColor = '#f59e0b'; // orange (High)
        if(issue.Severity === 'CRITICAL') sevColor = '#ef4444'; // red
        if(issue.Severity === 'MEDIUM') sevColor = '#3b82f6'; // blue

        const row = `
            <tr>
                <td>${issue.Cloud}</td>
                <td><b>${issue.Resource}</b></td>
                <td><span style="color:${sevColor}; font-weight:bold;">${issue.Severity}</span></td>
                <td>${issue.Compliance}</td>
                <td><code>${issue.Fix}</code></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    // 4. Render Charts
    renderCharts(data);
}

function renderCharts(data) {
    // A. Prepare Data for Severity Chart
    const severityCounts = { 'CRITICAL': 0, 'HIGH': 0, 'MEDIUM': 0, 'LOW': 0 };
    data.forEach(i => {
        if (severityCounts[i.Severity] !== undefined) severityCounts[i.Severity]++;
    });

    // B. Prepare Data for Cloud Chart
    const cloudCounts = { 'AWS': 0, 'AZURE': 0 };
    data.forEach(i => {
        if (cloudCounts[i.Cloud] !== undefined) cloudCounts[i.Cloud]++;
    });

    // C. Draw Severity Chart (Doughnut)
    const ctx1 = document.getElementById('severityChart').getContext('2d');
    if (severityChartInstance) severityChartInstance.destroy(); // Clear old chart
    
    severityChartInstance = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: Object.keys(severityCounts),
            datasets: [{
                data: Object.values(severityCounts),
                backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: '#94a3b8' } }
            }
        }
    });

    // D. Draw Cloud Chart (Bar)
    const ctx2 = document.getElementById('cloudChart').getContext('2d');
    if (cloudChartInstance) cloudChartInstance.destroy();

    cloudChartInstance = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: Object.keys(cloudCounts),
            datasets: [{
                label: 'Violations Found',
                data: Object.values(cloudCounts),
                backgroundColor: '#3b82f6',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
                x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}