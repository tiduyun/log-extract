# log-extract

> Daily report generator (based on tower.im)

## Development

Create a config.json

```sh
$ cat <<EOF >./config.json
{
  "projects": {
    "cmp": {
      "title": "云管项目组",
      "api": "https://tower.im/projects/xx"
    },
    "steamer": {
      "title": "容器项目组",
      "api": "https://tower.im/projects/xx"
    }
  },
  "departmentNames": [
    [ "产品", [ "产品" ] ],
    [ "前端", [ "前端", "FE", "用户体验" ] ],
    [ "底层组", [ "云原生", "基础服务组" ] ]
  ],
  "cookie": "<TOWER_COOKIE>",
  "robot": "https://oapi.dingtalk.com/robot/send?access_token=xxx"
}
EOF
```

```sh
yarn --production=false
npm link -f
build-reports -c ./config.json
```

## Usage

Run as docker by [tdio/daily-agent](https://hub.docker.com/r/tdio/daily-agent)

```
docker run --name agent -v ./config.json:/app/config.json tdio/daily-agent:latest
```
