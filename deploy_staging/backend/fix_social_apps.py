import os
import django
import sqlite3

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from django.contrib.sites.models import Site
from allauth.socialaccount.models import SocialApp

def fix():
    cursor = connection.cursor()
    
    # Check if table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name = 'socialaccount_socialapp_sites';")
    exists = cursor.fetchone()
    print(f'M2M Table exists: {exists}')
    
    if not exists:
        print('Creating M2M table manually...')
        # SQL for creating the M2M table for allauth SocialApp <-> Site
        cursor.execute('''
            CREATE TABLE socialaccount_socialapp_sites (
                id integer PRIMARY KEY AUTOINCREMENT,
                socialapp_id integer NOT NULL REFERENCES socialaccount_socialapp (id) DEFERRABLE INITIALLY DEFERRED,
                site_id integer NOT NULL REFERENCES django_site (id) DEFERRABLE INITIALLY DEFERRED
            );
        ''')
        cursor.execute('''
            CREATE UNIQUE INDEX socialaccount_socialapp_sites_socialapp_id_site_id_715e4254_uniq 
            ON socialaccount_socialapp_sites (socialapp_id, site_id);
        ''')
        print('Table created.')
    
    # Ensure Site exists
    site, _ = Site.objects.get_or_create(id=1, defaults={'domain':'contractcheck.ru', 'name':'contractcheck.ru'})
    print(f'Site: {site}')
    
    # Create Apps
    app_g, _ = SocialApp.objects.get_or_create(provider='google', defaults={'name':'Google','client_id':'ID','secret':'SECRET'})
    app_v, _ = SocialApp.objects.get_or_create(provider='vk', defaults={'name':'VK','client_id':'ID','secret':'SECRET'})
    print(f'Apps created: {app_g}, {app_v}')
    
    # Associate with Site
    app_g.sites.add(site)
    app_v.sites.add(site)
    print('Associations added.')

if __name__ == '__main__':
    fix()
