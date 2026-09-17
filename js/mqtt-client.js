const clientID = "web_ui_" + Math.random().toString(16).substr(2, 8);
const client = new Paho.MQTT.Client("broker.hivemq.com", 8884, clientID);
const statusElement = document.getElementById("connection-status");

// Live memory arrays for Plotly charts
window.telemetryStore = { time: [], weight: [], temp: [], hum: [], vib: [] };

// Reliable Connection Function
function connectToBroker() {
    statusElement.innerText = "Connecting...";
    statusElement.style.color = "#fbbf24";

    client.connect({
        useSSL: true,
        timeout: 3,
        onSuccess: function() {
            statusElement.innerText = "System Online";
            statusElement.style.color = "#34d399";
            
            // BUG FIX 1: Matched the exact topic used in your rail.py script!
            client.subscribe("skit/train");
        },
        onFailure: function(message) {
            statusElement.innerText = "Disconnected";
            statusElement.style.color = "#ef4444";
            setTimeout(connectToBroker, 5000);
        }
    });
}

client.onConnectionLost = function(responseObject) {
    statusElement.innerText = "Disconnected";
    statusElement.style.color = "#ef4444";
};

client.onMessageArrived = function(message) {
    try {
        const payload = JSON.parse(message.payloadString);
        const store = window.telemetryStore;
        
        // Get exact time for Plotly and readable time for Tables
        const now = new Date();
        const timeForChart = now.toISOString(); 
        const timeForTable = now.toLocaleTimeString(); 

        // BUG FIX 2: Matched JSON dictionary keys perfectly to the Python payload
        document.getElementById("metric-weight").innerText = payload.weight_kg + " kg";
        document.getElementById("metric-bogies").innerText = payload.bogies;
        document.getElementById("metric-temp").innerText = payload.temperature + " °C";
        document.getElementById("metric-hum").innerText = payload.humidity + " %";

        // BUG FIX 3: Fixed the broken bracket logic and aligned with rail.py boolean logic
        const statusBadge = document.getElementById("metric-status");
        const isShock = payload.shock_event; // Python sends True/False

        if (isShock === true) {
            statusBadge.className = "badge-alert";
            statusBadge.innerText = "Defect Detected";
            
            if (!window.alertActive) {
                const modal = document.getElementById('critical-modal');
                if(modal) modal.classList.add('show-modal');
                window.alertActive = true;
            }
        } else {
            statusBadge.className = "badge-normal";
            statusBadge.innerText = "Safe";
        }

        // 2. Push to memory arrays
        store.time.push(timeForChart);
        store.weight.push(payload.weight_kg);
        store.temp.push(payload.temperature);
        store.hum.push(payload.humidity);
        store.vib.push(isShock ? 1 : 0);

        if (store.time.length > 30) {
            store.time.shift();
            store.weight.shift();
            store.temp.shift();
            store.hum.shift();
            store.vib.shift();
        }

        // 3. Render charts and update tables safely
        if (typeof updateAllCharts === "function") updateAllCharts();
        updateLocalTables(payload, timeForTable, isShock);

    } catch (error) {
        console.error("Dashboard Error:", error);
    }
};

// 4. Safely populate all 3 specific tables
function updateLocalTables(payload, timeStr, isShock) {
    try {
        // Impact Table
        const impactTbody = document.querySelector('#table-impact-logs tbody');
        if (impactTbody) {
            impactTbody.insertAdjacentHTML('afterbegin', `<tr><td>${timeStr}</td><td>${payload.weight_kg} kg</td></tr>`);
            if (impactTbody.children.length > 10) impactTbody.removeChild(impactTbody.lastChild);
        }

        // Vibration Table
        const vibTbody = document.querySelector('#table-vibration-logs tbody');
        if (vibTbody) {
            const statusText = isShock ? "SHOCK EVENT" : "Normal";
            vibTbody.insertAdjacentHTML('afterbegin', `<tr><td>${timeStr}</td><td>${statusText}</td></tr>`);
            if (vibTbody.children.length > 10) vibTbody.removeChild(vibTbody.lastChild);
        }

        // Environment Table
        const envTbody = document.querySelector('#table-env-logs tbody');
        if (envTbody) {
            envTbody.insertAdjacentHTML('afterbegin', `<tr><td>${timeStr}</td><td>${payload.temperature} °C</td><td>${payload.humidity} %</td></tr>`);
            if (envTbody.children.length > 10) envTbody.removeChild(envTbody.lastChild);
        }
    } catch (e) {
        console.error("Table Update Error:", e);
    }
}

// Boot up
connectToBroker();