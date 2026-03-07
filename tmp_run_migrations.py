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
    print('Connecting to server for migrations...')
    client.connect(hostname, username=username, password=password)
    
    cmd = 'cd /var/www/contractcheck/backend && ./venv/bin/python manage.py migrate'
    print(f'Executing: {cmd}')
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out: print(f'STDOUT: {out}')
    if err: print(f'STDERR: {err}')
        
    print('Migration check complete.')

except Exception as e:
    print(f'Error: {e}')
finally:
    client.close()
