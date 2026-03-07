import paramiko
import os
from dotenv import load_dotenv

load_dotenv()

hostname = os.getenv('PROD_SERVER_IP', '89.104.70.58')
username = os.getenv('PROD_SERVER_USER', 'root')
password = os.getenv('PROD_SERVER_PASSWORD')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(hostname, username=username, password=password)
    # Check gunicorn logs
    stdin, stdout, stderr = client.exec_command('tail -n 50 /var/log/contractcheck/gunicorn_error.log')
    print("--- Gunicorn Error Logs ---")
    print(stdout.read().decode())
    print(stderr.read().decode())
    
except Exception as e:
    print(f"Error: {e}")
finally:
    client.close()
