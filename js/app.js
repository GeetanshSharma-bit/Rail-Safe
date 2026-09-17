// ==========================================
// SPA Section Switcher
// ==========================================
function switchPage(pageId, btnElement) {
    // 1. Hide all pages
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active-page');
    });

    // 2. Remove active class from all buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // 3. Show the selected page & highlight the button
    document.getElementById(pageId).classList.add('active-page');
    btnElement.classList.add('active');

    // 4. Force Plotly graphs to recalculate their dimensions
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 50);

    // 5. Automatically fetch data when the history tab opens
    if (pageId === 'history') {
        fetchHistory(); 
    }
}

// ==========================================
// Fetch historical MySQL logs via Flask REST API
// ==========================================
async function fetchDatabaseLogs() {
    try {
        // UPDATED: Pointing to Render API
        const response = await fetch('https://rail-safe.onrender.com/api/events');
        if (!response.ok) return;
        
        const events = await response.json();
        const tbody = document.querySelector('#table-global-events tbody');
        tbody.innerHTML = '';

        events.forEach(evt => {
            const row = `<tr>
                <td>${evt.timestamp}</td>
                <td>${evt.event_type}</td>
                <td>${evt.recorded_value}</td>
            </tr>`;
            tbody.innerHTML += row;
        });
    } catch (e) {
        console.log("REST API Server offline. Operating in live mode.");
    }
}

// Fetch logs on startup
document.addEventListener("DOMContentLoaded", () => {
    fetchDatabaseLogs();
    // setInterval(fetchDatabaseLogs, 10000); // Poll API every 10 seconds
});

// ==========================================
// Theme & UI Logic
// ==========================================
function toggleTheme() {
    const body = document.body;
    const themeBtn = document.getElementById('theme-toggle');
    
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        themeBtn.innerText = '🌙';
    } else {
        body.setAttribute('data-theme', 'dark');
        themeBtn.innerText = '☀️';
    }

    setTimeout(() => {
        if (typeof updateAllCharts === "function") updateAllCharts();
    }, 100);
}

window.alertActive = false; 

function dismissAlert() {
    document.getElementById('critical-modal').classList.remove('show-modal');
    setTimeout(() => { window.alertActive = false; }, 10000); 
}

function toggleMenu() {
    document.getElementById('nav-capsule').classList.toggle('open');
}

function closeMenu() {
    document.getElementById('nav-capsule').classList.remove('open');
}

// ==========================================
// HISTORICAL DATA FETCH & RENDER
// ==========================================
async function fetchHistory() {
    const hours = document.getElementById('history-timeframe').value;
    const chartDiv = document.getElementById('chart-history-view');
    
    chartDiv.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:100%; font-weight:bold;">Querying Database...</div>';

    try {
        // UPDATED: Pointing to Render API
        const response = await fetch(`https://rail-safe.onrender.com/api/history?hours=${hours}`);
        const data = await response.json();

        if (data.error) {
            console.error("Database Error:", data.error);
            chartDiv.innerHTML = '<div style="color: red; text-align: center; margin-top: 50px;">Failed to load data. Check console.</div>';
            return;
        }

        if (!data.time || data.time.length === 0) {
            chartDiv.innerHTML = '<div style="text-align: center; margin-top: 50px;">No data found for this timeframe.</div>';
            return;
        }

        chartDiv.innerHTML = '';

        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const fontColor = isDark ? '#f8fafc' : '#1e293b';
        const gridColor = isDark ? '#334155' : '#e2e8f0';

        Plotly.newPlot('chart-history-view', [
            {
                x: data.time, 
                y: data.weight,
                name: 'Axle Load (kg)',
                type: 'scatter', 
                mode: 'lines',
                line: { color: '#8b5cf6', width: 2 } 
            }
        ], {
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: fontColor },
            margin: { l: 50, r: 20, t: 30, b: 40 },
            xaxis: { type: 'date', gridcolor: gridColor },
            yaxis: { gridcolor: gridColor, title: "Weight (kg)" }
        }, { responsive: true });

    } catch (error) {
        console.error("API Connection Failed:", error);
        chartDiv.innerHTML = '<div style="color: red; text-align: center; margin-top: 50px;">Could not connect to Flask API. Is it running?</div>';
    }
}