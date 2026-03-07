import paramiko
import os
import time
from dotenv import load_dotenv

load_dotenv()

hostname = os.getenv('PROD_SERVER_IP', '89.104.70.58')
username = os.getenv('PROD_SERVER_USER', 'root')
password = os.getenv('PROD_SERVER_PASSWORD')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print('Connecting to server...')
    client.connect(hostname, username=username, password=password)
    
    sftp = client.open_sftp()
    
    files = {
        r'd:\contractcheck\backend\api\views.py': '/var/www/contractcheck/backend/api/views.py',
        r'd:\contractcheck\backend\api\services.py': '/var/www/contractcheck/backend/api/services.py',
        r'd:\contractcheck\backend\api\urls.py': '/var/www/contractcheck/backend/api/urls.py',
        r'd:\contractcheck\backend\api\tasks.py': '/var/www/contractcheck/backend/api/tasks.py',
        r'd:\contractcheck\backend\api\models.py': '/var/www/contractcheck/backend/api/models.py',
    }
    
    for local, remote in files.items():
        print(f'Uploading {remote}...')
        sftp.put(local, remote)
    
    sftp.close()
    
    print('Running makemigrations...')
    stdin, stdout, stderr = client.exec_command('cd /var/www/contractcheck/backend && venv/bin/python manage.py makemigrations api')
    print(stdout.read().decode())
    print(stderr.read().decode())
    
    print('Running migrate...')
    stdin, stdout, stderr = client.exec_command('cd /var/www/contractcheck/backend && venv/bin/python manage.py migrate')
    print(stdout.read().decode())
    print(stderr.read().decode())
    
    print('Restarting services...')
    client.exec_command('systemctl restart contractcheck-gunicorn')
    client.exec_command('systemctl restart contractcheck-celery')
    
    print('Waiting for services to settle...')
    time.sleep(5)
    
    print('Checking for errors in logs...')
    stdin, stdout, stderr = client.exec_command('tail -n 20 /var/log/contractcheck/gunicorn_error.log')
    logs = stdout.read().decode()
    if 'Error' in logs or 'Exception' in logs or 'NameError' in logs or 'ImportError' in logs:
        print('!!! POTENTIAL ERROR DETECTED !!!')
        print(logs)
    else:
        print('No obvious errors in the last 20 lines of gunicorn_error.log')
        
    print('Deployment and verification complete.')

except Exception as e:
    print(f'Critical error: {e}')
finally:
    client.close()
