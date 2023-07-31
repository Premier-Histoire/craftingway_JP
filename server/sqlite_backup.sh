#!/bin/bash

set -euo pipefail

if [ -z "${AWS_ACCESS_KEY_ID:-}" ] ||
  [ -z "${AWS_SECRET_ACCESS_KEY:-}" ] ||
  [ -z "${AWS_DEFAULT_REGION:-}" ]; then
  echo "AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_DEFAULT_REGION must be set"
  exit 1
fi

case "$1" in
  preview)
    bucket="servingway-preview-sqlitedb-backups"
    ;;
  "")
    bucket="servingway-sqlitedb-backups"
    ;;
  *)
    echo "Argument should be 'preview' or left blank"
    exit 1
esac

function sha256 {
  echo -ne "$1" | openssl sha256 | sed 's/^.* //'
}

function sign_binary {
  echo -ne "$2" | openssl sha256 -binary -hmac "$1" | sed 's/^.* //'
}

function sign_hex {
  echo -ne "$2" | openssl sha256 -hex -hmac "$1" | sed 's/^.* //'
}

filename="sqlite.db.backup"
sqlite3 /litefs/sqlite.db ".backup /tmp/$filename"
gzip -f /tmp/$filename

object_path="/${filename}_$(date --utc +'%F_%H%M').gz"
aws_datetime="$(date --utc +'%Y%m%dT%H%M%SZ')"
aws_date="$(date --utc +'%Y%m%d')"

content_sha256="UNSIGNED-PAYLOAD"

# request headers
content_md5="content-md5:$(openssl md5 -binary /tmp/$filename.gz | base64)"
host="host:$bucket.s3.amazonaws.com"
x_amz_content_sha256="x-amz-content-sha256:$content_sha256"
x_amz_date="x-amz-date:$aws_datetime"
x_amz_storage_class="x-amz-storage-class:INTELLIGENT_TIERING"
# should be in alphabetical order for signing
headers="$content_md5\n$host\n$x_amz_content_sha256\n$x_amz_date\n$x_amz_storage_class\n"
signed_headers="content-md5;host;x-amz-content-sha256;x-amz-date;x-amz-storage-class"

method="PUT"
query_params=""
canonical_request="$method\n$object_path\n$query_params\n$headers\n$signed_headers\n$content_sha256"

algorithm="AWS4-HMAC-SHA256"
scope="$aws_date/$AWS_DEFAULT_REGION/s3/aws4_request"
credential="$AWS_ACCESS_KEY_ID/$scope"
string_to_sign="$algorithm\n$aws_datetime\n$scope\n$(sha256 "$canonical_request")"

secret="AWS4$AWS_SECRET_ACCESS_KEY"
key1="$(sign_binary "$secret" "$aws_date")"
key2="$(sign_binary "$key1" "$AWS_DEFAULT_REGION")"
key3="$(sign_binary "$key2" 's3')"
key4="$(sign_binary "$key3" 'aws4_request')"
signature="$(sign_hex "$key4" "$string_to_sign")"

auth="$algorithm Credential=$credential, SignedHeaders=$signed_headers, Signature=$signature"

curl -v -X $method "https://$bucket.s3.amazonaws.com$object_path" \
  -T /tmp/$filename.gz \
  -H "$content_md5" \
  -H "$host" \
  -H "$x_amz_content_sha256" \
  -H "$x_amz_date" \
  -H "$x_amz_storage_class" \
  -H "Authorization: $auth" \
  --retry 5
