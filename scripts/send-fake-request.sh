#!/bin/sh
set -eu

cd "$(dirname "$0")/.."

mode=${1:-validation}
port=8787
secret=
transcript_url=${TRANSCRIPT_URL:-https://example.com/fake-transcript}
transcript_topic=${TRANSCRIPT_TOPIC:-Fake transcript test}

# Read only the two values needed for this test. Do not source .env: prompt
# text may contain spaces or shell metacharacters.
if [ -f .env ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ZOOM_WEBHOOK_SECRET=*) secret=${line#*=} ;;
      CALLBACK_PORT=*) port=${line#*=} ;;
    esac
  done < .env
fi

secret=${secret#\"}; secret=${secret%\"}
secret=${secret#\'}; secret=${secret%\'}

if [ -z "$secret" ]; then
  printf '%s\n' "ZOOM_WEBHOOK_SECRET is required in .env" >&2
  exit 1
fi

case "$mode" in
  validation)
    body='{"event":"endpoint.url_validation","payload":{"plainToken":"fake-plain-token"}}'
    ;;
  transcript)
    now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    body=$(cat <<EOF
{"event":"recording.transcript_completed","event_ts":$(date +%s000),"payload":{"account_id":"fake-account","object":{"uuid":"fake-uuid","id":123456789,"topic":"$transcript_topic","type":2,"host_id":"fake-host","host_email":"fake@example.com","start_time":"$now","timezone":"UTC","duration":1,"recording_count":1,"recording_files":[{"id":"fake-file","meeting_id":"123456789","file_name":"fake-transcript.vtt","recording_start":"$now","recording_end":"$now","file_type":"TRANSCRIPT","file_extension":"VTT","file_size":42,"play_url":"$transcript_url","download_url":"$transcript_url","status":"completed","recording_type":"audio_transcript"}]}} ,"download_token":"fake-download-token"}
EOF
)
    ;;
  *)
    printf 'Usage: %s [validation|transcript]\n' "$0" >&2
    exit 2
    ;;
esac

timestamp=$(date +%s)
digest=$(printf 'v0:%s:%s' "$timestamp" "$body" | openssl dgst -sha256 -hmac "$secret" -binary | xxd -p -c 256)
signature="v0=$digest"

curl --fail-with-body --silent --show-error \
  -X POST "http://127.0.0.1:$port/zoom/transcripts" \
  -H "Content-Type: application/json" \
  -H "x-zm-request-timestamp: $timestamp" \
  -H "x-zm-signature: $signature" \
  --data-binary "$body"
printf '\n'
