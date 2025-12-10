import socket
from flask import Flask

from main import app

def run_publicly(app, port=5000):
    try:
        # Get the local IP address that would be used for an outbound connection
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        local_ip = "127.0.0.1"

    global ip
    ip = local_ip

    print(f"Flask app running publicly on: http://{local_ip}:{port}")
    app.run(host='0.0.0.0', port=port)

run_publicly(app)