FROM node:15-alpine

ENV TZ="Asia/Shanghai"

WORKDIR /app
COPY bin/run.sh /app/run.sh
COPY log-extract-1.0.0.tgz /app/

RUN set -x \
  && sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories \
# https://wiki.alpinelinux.org/wiki/Setting_the_timezone
  && apk add --no-cache --virtual .apt-deps tzdata && cp -s /usr/share/zoneinfo/${TZ} /etc/localtime && echo "${TZ}" > /etc/timezone \
    && tar -cf tz.tar /usr/share/zoneinfo/${TZ} && apk del .apt-deps && tar -C / -xf tz.tar && rm -f tz.tar \
# add node modules
  && apk add --no-cache curl \
  && npm config set registry http://r.npm.tiduyun.com/ \
    && npm -g install /app/log-extract-1.0.0.tgz \
    && rm -rf /app/log-extract-1.0.0.tgz \
  && echo "58 22 * * 1-6 /app/run.sh > /proc/1/fd/1 2>/proc/1/fd/2" >> /etc/crontabs/root

CMD ["crond", "-f", "-d", "8"]
