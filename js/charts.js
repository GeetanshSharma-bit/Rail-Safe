// 1. Initialize the global store so Plotly has somewhere to look
window.telemetryStore = { time: [], weight: [], temp: [], hum: [], vib: [] };

// 2. The missing function to fetch the data from Flask!
async function fetchChartHistory() {
    try {
        // Fetch the last 50 records from your API
        const response = await fetch('https://rail-safe.onrender.com/api/history');
        const data = await response.json();

        if (!data || data.length === 0) return;

        // Clear the store before pushing new data
        window.telemetryStore = { time: [], weight: [], temp: [], hum: [], vib: [] };

        // Loop through the database rows and map them to Plotly's arrays
        data.forEach(row => {
            // Convert GMT string to a JavaScript Date object
            // Change this line:
// window.telemetryStore.time.push(new Date(row.timestamp));

// To this bulletproof line:
window.telemetryStore.time.push(new Date(row.timestamp || row.created_at || row.time));
            
            // Map the exact column names from your MySQL database
            window.telemetryStore.weight.push(row.weight_kg);
            window.telemetryStore.temp.push(row.temperature);
            window.telemetryStore.hum.push(row.humidity);
            
            // Convert the text "CRITICAL" / "NORMAL" into 1 or 0 for the step-line chart
            const isShock = row.vibration_status === "CRITICAL" ? 1 : 0;
            window.telemetryStore.vib.push(isShock);
        });

        // 3. Now that the store is full, tell Plotly to draw everything!
        updateAllCharts();
        
    } catch (error) {
        console.error("Failed to fetch chart data:", error);
    }
}

// 4. Run it immediately when the page loads, and then every 3 seconds to stay live
fetchChartHistory();
setInterval(fetchChartHistory, 3000);
function updateAllCharts() {
    const store = window.telemetryStore;
    if (!store || store.time.length === 0) return;

    // THE FIX: Create fresh clones of the arrays so Plotly is FORCED to redraw the lines!
    const timeData = store.time.slice();
    const weightData = store.weight.slice();
    const tempData = store.temp.slice();
    const humData = store.hum.slice();
    const vibData = store.vib.slice();

    // A unified, clean layout for all charts
   // Check if Dark Mode is currently active
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const fontColor = isDark ? '#f8fafc' : '#1e293b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    // A unified layout that automatically swaps colors
    const commonLayout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: fontColor },
        margin: { l: 50, r: 20, t: 30, b: 40 },
        xaxis: { 
            type: 'date',
            tickformat: '%H:%M:%S', 
            nticks: 6,
            gridcolor: gridColor 
        },
        yaxis: { gridcolor: gridColor }
    };

    // 1. Executive Line Chart (Axle Load)
    Plotly.react('chart-overview-area', [{
        x: timeData, y: weightData,
        type: 'scatter', mode: 'lines+markers',
        line: { color: '#2563eb', width: 3 }, marker: { size: 6, color: '#1e3a8a' }
    }], { 
        ...commonLayout, 
        height: 350,
        yaxis: { range: [0, 5] } 
    }, { responsive: true });

    // 2. Peak Gauge Chart
    const currentWeight = weightData[weightData.length - 1];
    Plotly.react('chart-overview-gauge', [{
        type: "indicator", mode: "gauge+number", value: currentWeight,
        gauge: {
            axis: { range: [0, 5], tickcolor: "#1e293b" },
            bar: { color: "#2563eb" },
            steps: [
                { range: [0,2.5 ], color: "#e2e8f0" },
                { range: [2.5, 5], color: "#fca5a5" }
            ]
        }
    }], { ...commonLayout, height: 350, margin: { l: 20, r: 20, t: 20, b: 20 } }, { responsive: true });

    // 3. Impact Line Chart (High-Frequency HX711)
    Plotly.react('chart-impact-line', [{
        x: timeData, y: weightData,
        type: 'scatter', mode: 'lines+markers',
        line: { color: '#0284c7', width: 3 }, marker: { size: 6 }
    }], { 
        ...commonLayout, 
        height: 380,
        yaxis: { range: [0, 5] } 
    }, { responsive: true });

    // 4. Vibration Step-Line Chart (Shock Events)
    Plotly.react('chart-vibration-bar', [{
        x: timeData, y: vibData,
        type: 'scatter', mode: 'lines', 
        line: { shape: 'hv', color: '#dc2626', width: 3 }
    }], { 
        ...commonLayout, 
        height: 380,
        yaxis: { range: [-0.1, 1.2], tickvals: [0, 1], ticktext: ['Normal', 'Shock'] } 
    }, { responsive: true });

    // 5. Environmental Multi-Scatter (DHT22)
    Plotly.react('chart-env-scatter', [
        { x: timeData, y: tempData, name: 'Temp (°C)', line: { color: '#d97706', width: 3 } },
        { x: timeData, y: humData, name: 'Humidity (%)', line: { color: '#2563eb', width: 3 } }
    ], { 
        ...commonLayout, 
        height: 380,
        yaxis: { range: [10, 80] } 
    }, { responsive: true });
}