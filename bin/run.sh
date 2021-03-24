#!/bin/sh
# by @allex_wang
# crontab script for daily reports
set -e

sh_dir=`cd -P -- "$(dirname -- "$(readlink -f $0)")" && pwd -P`
cd $sh_dir && (

config=./config.json
content="`build-reports -c $config`" || {
  ec=$?
  echo >&2 "no $content"
  exit $ec
}

robot_api="`awk -F'"' '/"robot": ".+"/{print $4;exit;}' $config`"

curl $robot_api \
   -H 'Content-Type: application/json' \
   -d "{\"msgtype\":\"text\",\"text\":{\"content\":\"$content\"},\"at\":{\"atMobiles\":[],\"isAtAll\":false}}"
)
