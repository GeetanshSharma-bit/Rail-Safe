from flask import Flask, jsonify, request, Response
from flask_cors import CORS
import mysql.connector
from datetime import datetime, timedelta
import cv2
from ultralytics import YOLO
from config import DB_CONFIG

# Load the YOLO AI Model (It will auto-download the first time you run it)
model = YOLO('yolov8n.pt') 

# Your Pi's local Wi-Fi IP address
PI_CAMERA_URL = "http://192.168.1.140:5001/stream"

# 1. THE SETUP (Top of the file - ONLY ONCE)
app = Flask(__name__)
CORS(app)  # Allows JavaScript frontend to request data safely

# Helper function to keep database connections clean
def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)

# ---------------------------------------------------------
# 2. API ROUTES (Data Endpoints)
# ---------------------------------------------------------
@app.route('/api/logs/<sensor_type>', methods=['GET'])
def get_sensor_logs(sensor_type):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        query = "SELECT * FROM telemetry_logs ORDER BY id DESC LIMIT 20"
        cursor.execute(query)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Change your routes in backend/api.py to match what the frontend is calling:

# --- EVENTS ROUTES (Supports both /events and /api/events) ---
# --- CURRENT STATUS & TOP CARDS (Supports /current_status, /latest, and /api/ prefixes) ---
@app.route('/api/events', methods=['GET'])
def get_anomaly_events():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        query = "SELECT * FROM anomaly_events ORDER BY id DESC LIMIT 10"
        cursor.execute(query)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- CHARTS & HISTORY (Supports /history, /telemetry, and /api/ prefixes) ---
@app.route('/api/history', methods=['GET'])
def get_historical_data():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT * FROM (
                SELECT * FROM telemetry_logs ORDER BY id DESC LIMIT 50
            ) AS sub ORDER BY id ASC
        """
        cursor.execute(query)
        data = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------
# 3. LIVE YOLOv8 VIDEO PIPELINE
# ---------------------------------------------------------
def generate_ai_frames():
    # Connect to the Pi's raw video stream
    cap = cv2.VideoCapture(PI_CAMERA_URL)
    
    while True:
        success, frame = cap.read()
        if not success:
            break
            
        # 1. Let YOLOv8 scan the frame for objects
        results = model(frame)
        
        # 2. Draw the bounding boxes and labels onto the frame
        annotated_frame = results[0].plot()
        
        # 3. Compress and send the AI-processed frame to the dashboard
        ret, buffer = cv2.imencode('.jpg', annotated_frame)
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

@app.route('/video_feed')
def video_feed():
    return Response(generate_ai_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')


# ---------------------------------------------------------
# 4. THE RUN COMMAND (Must be at the very bottom - ONLY ONCE)
# ---------------------------------------------------------
if __name__ == '__main__':
    app.run(debug=True, port=5000)