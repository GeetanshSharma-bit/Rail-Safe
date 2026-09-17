from readline import backend


DB_CONFIG = {
    'host': 'mysql-3b32a38d-karalgeetansh-7f76.j.aivencloud.com',
    'user': 'avnadmin',
    'password': 'AVNS_GXIuBCaWF-4q2amgJcZ',  # <--- Change this to your local MySQL root password
    'database': 'Rail Safe Dashboard',
    'port': 27407,
    "ssl_ca": "backend/ca.pem"
}
MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
MQTT_TOPIC = "skit/train"