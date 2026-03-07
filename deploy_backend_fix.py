import paramiko
import os
from dotenv import load_dotenv

# Загружаем переменные из .env
load_dotenv()

hostname = os.getenv('PROD_SERVER_IP', '89.104.70.58')
username = os.getenv('PROD_SERVER_USER', 'root')
password = os.getenv('PROD_SERVER_PASSWORD')

if not password:
    print("Error: PROD_SERVER_PASSWORD not found in .env")
    exit(1)

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print('Connecting to server...')
    client.connect(hostname, username=username, password=password)
    
    sftp = client.open_sftp()
    
    # 1. Update views.py
    print('Updating backend/api/views.py...')
    local_views = r'd:\contractcheck\backend\api\views.py'
    remote_views = '/var/www/contractcheck/backend/api/views.py'
    sftp.put(local_views, remote_views)
    
    # 2. Update services.py
    print('Updating backend/api/services.py...')
    local_services = r'd:\contractcheck\backend\api\services.py'
    remote_services = '/var/www/contractcheck/backend/api/services.py'
    sftp.put(local_services, remote_services)

    # 3. Update urls.py
    print('Updating backend/api/urls.py...')
    local_urls = r'd:\contractcheck\backend\api\urls.py'
    remote_urls = '/var/www/contractcheck/backend/api/urls.py'
    sftp.put(local_urls, remote_urls)

    # 4. Update tasks.py
    print('Updating backend/api/tasks.py...')
    local_tasks = r'd:\contractcheck\backend\api\tasks.py'
    remote_tasks = '/var/www/contractcheck/backend/api/tasks.py'
    sftp.put(local_tasks, remote_tasks)
    
    sftp.close()
    
    # 3. Restart Gunicorn and Celery to apply changes
    print('Restarting backend services...')
    commands = [
        'systemctl restart contractcheck-gunicorn',
        'systemctl restart contractcheck-celery'
    ]
    
    for cmd in commands:
        stdin, stdout, stderr = client.exec_command(cmd)
        exit_status = stdout.channel.recv_exit_status()
        if exit_status == 0:
            print(f'Success: {cmd}')
        else:
            print(f'Error executing {cmd}: {stderr.read().decode()}')
            
    print('All backend updates applied.')

except Exception as e:
    print(f'Error during backend deploy: {e}')
finally:
    client.close()
