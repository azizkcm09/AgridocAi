import os
import tempfile
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError


def download_file_from_minio(storage_path: str) -> str:
    s3_client = boto3.client(
        "s3",
        endpoint_url=os.getenv("S3_ENDPOINT", "http://localhost:9000"),
        aws_access_key_id=os.getenv("S3_ACCESS_KEY", "admin"),
        aws_secret_access_key=os.getenv("S3_SECRET_KEY", "password123"),
        region_name="us-east-1",
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"}
        ),
    )

    bucket = os.getenv("S3_BUCKET_NAME", "agridoc-uploads")

    suffix = "." + storage_path.split(".")[-1]
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp.close()

    try:
        s3_client.download_file(bucket, storage_path, tmp.name)
    except ClientError as e:
        os.unlink(tmp.name)
        raise RuntimeError(f"Could not download '{storage_path}' from MinIO: {e}")

    return tmp.name
