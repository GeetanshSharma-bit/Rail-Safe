// SPA Section Switcher
// SPA Section Switcher
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

    // 4. THE FIX: Force Plotly graphs to recalculate their dimensions
    // We use a tiny 50ms delay to let the CSS 'display: block' apply first
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 50);
    function switchPage(pageId, btnElement) {
    // ... your existing code that hides pages and removes active classes ...
    // ... your existing code that shows the new page and adds the active class ...

    // ADD THIS AT THE VERY BOTTOM OF THE FUNCTION:
    if (pageId === 'history') {
        fetchHistory(); // Automatically fetch data when the tab opens!
    }
}
}

// Fetch historical MySQL logs via Flask REST API
async function fetchDatabaseLogs() {
    try {
        const response = await fetch('http://localhost:5000/api/events');
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
  //  setInterval(fetchDatabaseLogs, 10000); // Poll API every 10 seconds
});
// --- Dark Mode Logic ---
function toggleTheme() {
    const body = document.body;
    const themeBtn = document.getElementById('theme-toggle');
    
    // Toggle the data-theme attribute
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        themeBtn.innerText = '🌙';
    } else {
        body.setAttribute('data-theme', 'dark');
        themeBtn.innerText = '☀️';
    }

    // Force Plotly to redraw with new Dark/Light text colors
    setTimeout(() => {
        if (typeof updateAllCharts === "function") updateAllCharts();
    }, 100);
}

// --- Alert Modal Logic ---
window.alertActive = false; 

function dismissAlert() {
    document.getElementById('critical-modal').classList.remove('show-modal');
    // Prevents the pop-up from appearing again for the next 10 seconds
    setTimeout(() => { window.alertActive = false; }, 10000); 
}
// --- Mobile Menu Logic ---
function toggleMenu() {
    const nav = document.getElementById('nav-capsule');
    nav.classList.toggle('open');
}

function closeMenu() {
    const nav = document.getElementById('nav-capsule');
    nav.classList.remove('open');
}
// ==========================================
// HISTORICAL DATA FETCH & RENDER
// ==========================================
async function fetchHistory() {
    const hours = document.getElementById('history-timeframe').value;
    const chartDiv = document.getElementById('chart-history-view');
    
    // Show a loading state
    chartDiv.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:100%; font-weight:bold;">Querying Database...</div>';

    try {
        // Ping your Flask REST API
        const response = await fetch(`http://127.0.0.1:5000/api/history?hours=${hours}`);
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

        // Clear the loading text
        chartDiv.innerHTML = '';

        // Check if Dark Mode is active for styling
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const fontColor = isDark ? '#f8fafc' : '#1e293b';
        const gridColor = isDark ? '#334155' : '#e2e8f0';

        // Draw the Historical Plotly Chart
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