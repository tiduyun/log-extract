#!/bin/sh
# by @allex_wang
# crontab script for daily reports
set -e

sh_dir="$(cd -P -- "$(dirname -- "$(readlink -f "$0")")" && pwd -P)"
cd "$sh_dir" && (

  config_file=./config.json
  content="$(build-reports -c "$config_file")" || {
    ec=$?
    echo >&2 "no $content"
    exit $ec
  }

  content="$(node -p 'JSON.stringify(process.argv[1])' "$content")"
  robot_api="$(node -p "require('${config_file}').robot")"

  curl "$robot_api" \
    -H 'Content-Type: application/json' \
    -d "{\"msgtype\":\"text\",\"text\":{\"content\":$content},\"at\":{\"atMobiles\":[],\"isAtAll\":false}}"
)
