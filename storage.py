import json
import os
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen


def _storage_config():
    base_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not base_url or not service_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.")
    bucket = os.environ.get("SUPABASE_STORAGE_BUCKET", "player-images")
    return base_url, service_key, bucket


def _request(
    url,
    service_key,
    method,
    data=None,
    content_type="application/json",
    upsert=False,
):
    headers = {
        "Authorization": f"Bearer {service_key}",
        "apikey": service_key,
        "Content-Type": content_type,
    }
    if upsert:
        headers["x-upsert"] = "true"
    request = Request(
        url,
        data=data,
        method=method,
        headers=headers,
    )
    with urlopen(request, timeout=30) as response:
        return response.read()


def ensure_public_bucket():
    base_url, service_key, bucket = _storage_config()
    bucket_url = f"{base_url}/storage/v1/bucket/{quote(bucket, safe='')}"

    try:
        details = _request(
            bucket_url,
            service_key,
            "GET",
            content_type="application/json",
        )
    except HTTPError as error:
        if error.code != 404:
            raise
        payload = json.dumps({"id": bucket, "name": bucket, "public": True}).encode()
        try:
            _request(
                f"{base_url}/storage/v1/bucket",
                service_key,
                "POST",
                data=payload,
            )
            return
        except HTTPError as create_error:
            if create_error.code != 409:
                raise
            details = _request(
                bucket_url,
                service_key,
                "GET",
                content_type="application/json",
            )

    bucket_details = json.loads(details)
    if not bucket_details.get("public"):
        raise RuntimeError(
            f"Supabase storage bucket '{bucket}' exists but is not public."
        )


def upload_public_image(object_path, content, content_type):
    base_url, service_key, bucket = _storage_config()
    encoded_path = quote(object_path, safe="/")
    _request(
        f"{base_url}/storage/v1/object/{quote(bucket, safe='')}/{encoded_path}",
        service_key,
        "POST",
        data=content,
        content_type=content_type,
        upsert=True,
    )
    return (
        f"{base_url}/storage/v1/object/public/"
        f"{quote(bucket, safe='')}/{encoded_path}"
    )
