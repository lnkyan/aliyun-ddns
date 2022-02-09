ALIYUN-DDNS
===============

借助阿里云 DNS 解析的 API 实现 DDNS

## 说明

主要功能是定时获取本机外网地址，发现与 DNS 解析记录不一致时，调用阿里云的 DNS API，自动将域名的解析记录更新为本机最新的外网地址。

## 功能

* 自动监听本地公网 IP 变化，更新 DNS 解析记录
* 支持多个域名解析
* 支持多级域名解析
* 支持 Docker
* 支持 WebHook

## 前提

* 域名在阿里云解析
* NodeJS/Docker环境
* 部署机器有公网 IP

## 直接部署

* 从阿里云获取 [accessKey accessKeySecret](https://ak-console.aliyun.com/#/accesskey)

* 克隆本项目 `git clone https://github.com/lnkyan/aliyun-ddns.git`

* 安装依赖 `npm install`

* 拷贝一份配置文件 `cp config.json.sample config.json`

* 在 `config.json` 中填入相应字段

* 运行 `npm run start`（进程保活可以使用 `pm2`，如 `pm2 start index.js --name aliyun-ddns`）

### 配置文件说明

  * accessKey、accessKeySecret: 阿里云 API 密钥
  * domain: 需 DDNS 的域名地址，多个域名使用逗号分隔
  * interval: 检测公网域名变化的时间间隔，以秒为单位，默认为300
  * webHook: DNS 更新时的通知，可不填
  
  如
  ```json
  {
    "accessKey": "accessKey",
    "accessKeySecret": "accessKeySecret",
    "domain": "example.com",
    "interval": "300",
    "webHook": "https://sctapi.ftqq.com/[SCKEY].send?title=主人DDNS更新了,{msg}"
  }
  ```
  或
  ```json
  {
    "accessKey": "accessKey",
    "accessKeySecret": "accessKeySecret",
    "domain": "sub.example.com, *.home.example.com",
    "interval": "300"
  }
  ```

## Docker 部署

* 从阿里云获取 [accessKey accessKeySecret](https://ak-console.aliyun.com/#/accesskey)

* 启动容器

```bash
docker run -d \
  --name=aliyun-ddns \
  --restart=always \
  --network=host \
  -e accessKey=your_accessKey \
  -e accessKeySecret=your_accessKeySecret \
  -e domain="sub.example.com,*.home.example.com" \
  -e interval=300 \
  -e webHook="https://webhook.example.com?text={msg}"
  lnkyan/aliyun-ddns
```

## 开发

* 开发完成后，增加一个`vx.x.x`形式的tag，提交后即会自动编译新的docker镜像
