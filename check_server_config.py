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
    print('Checking server configuration...')
    client.connect(hostname, username=username, password=password)
    
    stdin, stdout, stderr = client.exec_command('ls -F /var/www/contractcheck/backend/')
    print(stdout.read().decode())
    
    stdin, stdout, stderr = client.exec_command('cat /etc/systemd/system/contractcheck-gunicorn.service')
    print(stdout.read().decode())

except Exception as e:
    print(f'Error: {e}')
finally:
    client.close()
