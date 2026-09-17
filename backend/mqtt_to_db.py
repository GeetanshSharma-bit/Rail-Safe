import paho.mqtt.client as mqtt
import mysql.connector
import json
from config import DB_CONFIG, MQTT_BROKER, MQTT_PORT, MQTT_TOPIC

def save_to_mysql(payload):
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # --- DATA TRANSLATION ---
        # 1. Grab 'shock_event' (True/False) from rail.py and convert to a string for the DB
        is_shock = payload.get('shock_event', False)
        vib_status = "CRITICAL" if is_shock else "NORMAL"

        # 2. Grab 'bogies' from rail.py
        bogie_count = payload.get('bogies', 0)

        # Insert telemetry
        sql_telemetry = """
            INSERT INTO telemetry_logs 
            (weight_kg, bogies_passed, temperature, humidity, vibration_status, mic_anomaly)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        vals_telemetry = (
            payload.get('weight_kg', 0.0),
            bogie_count,                      # Mapped from 'bogies'
            payload.get('temperature', 0.0),
            payload.get('humidity', 0.0),
            vib_status,                       # Mapped from 'shock_event'
            payload.get('mic_anomaly', 'Normal')
        )
        cursor.execute(sql_telemetry, vals_telemetry)

        # Log critical anomaly if detected
        if is_shock or payload.get('weight_kg', 0) > 2500:
            sql_event = """
                INSERT INTO anomaly_events (event_type, severity, recorded_value)
                VALUES (%s, %s, %s)
            """
            event_type = "Wheel Impact Defect" if is_shock else "Overweight Load"
            cursor.execute(sql_event, (event_type, "Critical", f"{payload.get('weight_kg', 0)} kg"))

        conn.commit()
        cursor.close()
        conn.close()
        print("Logged reading to MySQL database.")

    except Exception as e:
        print(f"Database Error: {e}")

def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print(f"Worker connected to Local Broker at {MQTT_BROKER}. Listening for data...")
        client.subscribe(MQTT_TOPIC)

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        save_to_mysql(payload)
    except Exception as e:
        print(f"JSON Parse Error: {e}")

if __name__ == "__main__":
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_forever()