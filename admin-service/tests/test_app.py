import importlib.util
import io
import json
import secrets
import sqlite3
import tempfile
import unittest
import sys
from unittest.mock import patch
from contextlib import closing
from pathlib import Path

from pypdf import PdfWriter
from werkzeug.security import generate_password_hash

sys.path.insert(0, str(Path(__file__).parents[1]))

spec = importlib.util.spec_from_file_location('cafe_app', Path(__file__).parents[1] / 'app.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def pdf(pages=1, password=None):
    writer = PdfWriter()
    for _ in range(pages):
        writer.add_blank_page(width=300, height=500)
    if password:
        writer.encrypt(password)
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


class AdminTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.root = Path(self.folder.name)
        self.origin = 'https://cafe.example'
        config = dict(username='medcafe', password_hash=generate_password_hash('test-secret-password'), version=secrets.token_hex(32), rate_secret=secrets.token_hex(32))
        (self.root / 'credentials.json').write_text(json.dumps(config))
        self.app = module.create_app(dict(TESTING=True, DATA_DIR=self.folder.name, PUBLIC_ORIGIN=self.origin, TRUSTED_HOSTS=['localhost'], SECURE_COOKIES=False))
        self.client = self.app.test_client()

    def tearDown(self):
        self.folder.cleanup()

    def login(self, client=None, username='medcafe', password='test-secret-password'):
        return (client or self.client).post('/admin/login', data=dict(username=username, password=password), headers={'Origin': self.origin})

    def csrf(self, client=None):
        response = (client or self.client).get('/admin')
        import re
        return re.search(r'name="csrf" value="([^"]+)"', response.text).group(1)

    def upload(self, data, filename='menu.pdf'):
        return self.client.post('/admin/upload', data={'csrf':self.csrf(), 'file':(io.BytesIO(data),filename)}, headers={'Origin':self.origin}, content_type='multipart/form-data')

    def test_login_protection_and_session(self):
        self.assertEqual(self.client.get('/admin').status_code, 303)
        self.assertEqual(self.login(password='wrong').status_code, 401)
        result=self.login()
        self.assertEqual(result.status_code,303)
        self.assertIn('HttpOnly',result.headers['Set-Cookie'])
        self.assertIn('SameSite=Strict',result.headers['Set-Cookie'])
        self.assertEqual(self.client.get('/admin').status_code,200)
        self.client.set_cookie('medcafe-admin','tampered')
        self.assertEqual(self.client.get('/admin').status_code,303)

    def test_origin_and_csrf(self):
        self.assertEqual(self.client.post('/admin/login',data={'username':'medcafe','password':'test-secret-password'},headers={'Origin':'https://evil.example'}).status_code,403)
        self.login()
        self.assertEqual(self.client.post('/admin/logout',headers={'Origin':self.origin}).status_code,403)
        self.assertEqual(self.client.post('/admin/logout',data={'csrf':self.csrf()},headers={'Origin':self.origin}).status_code,303)
        self.assertEqual(self.client.get('/admin').status_code,303)
        self.assertEqual(self.client.post('/admin/upload',headers={'Origin':self.origin}).status_code,401)

    def test_persistent_rate_limiting(self):
        for _ in range(10): self.assertEqual(self.login(password='wrong').status_code,401)
        self.assertEqual(self.login().status_code,429)
        another=self.app.test_client()
        self.assertEqual(self.login(another).status_code,429)

    def test_publish_persists_and_failed_upload_preserves_menu(self):
        self.login()
        first=pdf(2)
        self.assertEqual(self.upload(first).status_code,303)
        metadata=self.client.get('/api/menu').json
        self.assertEqual(metadata['menu']['pages'],2)
        uri='/menu/'+metadata['menu']['id']+'.pdf'
        response=self.client.get(uri)
        self.assertEqual(response.data,first)
        self.assertEqual(response.headers['Access-Control-Allow-Origin'],'*')
        response.close()
        self.assertIn('immutable',response.headers['Cache-Control'])
        self.assertEqual(self.upload(b'fake PDF').status_code,400)
        self.assertEqual(self.client.get('/api/menu').json,metadata)
        another=module.create_app(dict(TESTING=True, DATA_DIR=self.folder.name, PUBLIC_ORIGIN=self.origin, TRUSTED_HOSTS=['localhost'], SECURE_COOKIES=False))
        self.assertEqual(another.test_client().get('/api/menu').json,metadata)
        self.assertEqual(self.upload(pdf(1),'new-menu.pdf').status_code,303)
        self.assertNotEqual(self.client.get('/api/menu').json['menu']['id'],metadata['menu']['id'])
        with self.client.get(uri) as old_response:
            self.assertEqual(old_response.data,first)

    def test_reject_invalid_pdfs(self):
        for data in [b'', b'%PDF-1.7\ncorrupt', pdf(0), pdf(101), pdf(password='locked'), b'x'*(module.MAX_BYTES+1)]:
            with self.assertRaises(ValueError): module.validate_pdf(data)

    def test_multipart_accepts_real_menu_size(self):
        self.login()
        data=pdf(1)+b'\n% padding\n'+b' '*(6*1024*1024)
        self.assertEqual(self.upload(data).status_code,303)

    def test_account_change_invalidates_old_sessions(self):
        self.login()
        other=self.app.test_client()
        self.login(other)
        result=self.client.post('/admin/account',data=dict(csrf=self.csrf(),current_password='test-secret-password',username='cafe-owner',new_password='new-strong-password',confirm_password='new-strong-password'),headers={'Origin':self.origin})
        self.assertEqual(result.status_code,303)
        self.assertEqual(self.client.get('/admin').status_code,200)
        self.assertEqual(other.get('/admin').status_code,303)
        self.assertEqual(self.login(other).status_code,401)
        self.assertEqual(self.login(other,'cafe-owner','new-strong-password').status_code,303)

    def test_expired_sessions_rejected(self):
        self.login()
        with closing(sqlite3.connect(self.root / 'admin.sqlite')) as database:
            database.execute('UPDATE sessions SET expires=0')
            database.commit()
        self.assertEqual(self.client.get('/admin').status_code,303)

    def test_pdf_response_never_exposes_other_files(self):
        self.assertEqual(self.client.get('/menu/credentials.pdf').status_code,404)
        self.assertEqual(self.client.get('/menu/'+'0'*64+'.pdf').status_code,404)
        self.assertEqual(self.client.get('/credentials.json').status_code,404)

    def test_phone_images_ready_before_publish(self):
        self.login()
        self.assertEqual(self.upload(pdf(2)).status_code,303)
        menu=self.client.get('/api/menu').json
        self.assertEqual(len(menu['pageImages']),2)
        for page in menu['pageImages']:
            self.assertLessEqual(max(page['width'], page['height']),1600)
            path=page['url'].removeprefix(self.origin)
            with self.client.get(path) as response:
                self.assertEqual(response.status_code,200)
                self.assertEqual(response.mimetype,'image/jpeg')
                self.assertIn('immutable',response.headers['Cache-Control'])
        self.assertEqual(self.client.get(f"/menu/{menu['menu']['id']}/pages/3.jpg").status_code,404)
        with patch.object(module, 'prepare_page_images', side_effect=ValueError('Conversion failed')):
            self.assertEqual(self.upload(pdf(3)).status_code,400)
        self.assertEqual(self.client.get('/api/menu').json,menu)


if __name__=='__main__': unittest.main()
