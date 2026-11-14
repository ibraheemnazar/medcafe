import os
import sqlite3
import tarfile
import tempfile
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path

os.umask(0o077)
data = Path('/opt/medcafe-admin/data')
backups = Path('/opt/medcafe-admin/backups')
backups.mkdir(mode=0o700, exist_ok=True)
stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
with tempfile.TemporaryDirectory(dir=backups) as temporary:
    snapshot = Path(temporary) / 'admin.sqlite'
    with closing(sqlite3.connect(data / 'admin.sqlite')) as source, closing(sqlite3.connect(snapshot)) as destination:
        source.backup(destination)
    output = backups / f'medcafe-{stamp}.tar.gz'
    with tarfile.open(output, 'w:gz') as archive:
        archive.add(snapshot, arcname='admin.sqlite')
        archive.add(data / 'credentials.json', arcname='credentials.json')
        archive.add(data / 'files', arcname='files')
# Keep two weeks of this service's generated snapshots.
for old in sorted(backups.glob('medcafe-*.tar.gz'))[:-14]:
    old.unlink()
print('Med Cafe backup completed')
