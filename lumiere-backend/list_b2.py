import os
from dotenv import load_dotenv
load_dotenv()
from b2sdk.v2 import InMemoryAccountInfo, B2Api

info = InMemoryAccountInfo()
api = B2Api(info)
api.authorize_account("production", os.getenv("B2_KEY_ID"), os.getenv("B2_APP_KEY"))
bucket = api.get_bucket_by_name(os.getenv("B2_BUCKET_NAME", "lumiere-models"))

print("Files in bucket:")
for f, _ in bucket.ls(recursive=True, latest_only=True):
    print(" ", f.file_name)
