/*
 * 借助阿里云 DNS 服务实现 DDNS（动态域名解析）
 */
import 'dotenv/config'
import fetch from 'node-fetch'
import AliyunClient from './aliyun_api.js'

/**
 * 加载配置
 * @return {Promise<{accessKeySecret: string, accessKey: string, domains: string[], interval: number, webHook:string}>}
 */
async function loadConfig() {
    return {
        accessKey: process.env.accessKey,
        accessKeySecret: process.env.accessKeySecret,
        domains: process.env.domain?.split(',').map(item => item.trim()),
        interval: parseInt(process.env.interval, 10) || 300,
        webHook: process.env.webHook,
    }
}

async function checkDomains(aliClient, domains, webHook) {
    const externalIp = await getExternalIp()
    console.log(getTime(), '当前公网 ip:', externalIp)

    for (const domain of domains) {
        await checkDomain(aliClient, domain, externalIp, webHook)
    }
}

async function checkDomain(aliClient, domain, externalIp, webHook) {
    const { subDomain, mainDomain } = parseDomain(domain)
    const domainRecords = await aliClient.getDomainRecords(subDomain, mainDomain)

    // 无记录 直接添加
    if (!domainRecords.length) {
        console.log(getTime(), domain, '记录不存在，新增中...')
        await aliClient.addRecord(subDomain, mainDomain, externalIp)
        console.log(getTime(), domain, '新增成功, 当前 dns 指向:', externalIp)
        await notify(webHook, `域名${domain}已解析到${externalIp}`)
        return
    }

    // 已有记录
    const needUpdateRecords = domainRecords.filter(item => item.Value !== externalIp)
    if (!needUpdateRecords.length) {
        console.log(getTime(), domain, '记录一致, 无需修改')
    } else {
        await Promise.all(needUpdateRecords.map(record => {
            return aliClient.updateRecord(record.recordId, subDomain, externalIp)
        }))
        console.log(getTime(), domain, '更新成功, 当前 dns 指向:', externalIp)
        await notify(webHook, `域名${domain}已解析到${externalIp}`)
    }
}

/**
 * 格式化域名，获取子域名与主域名
 * @param {string} domain
 * @return {{subDomain: string, mainDomain: string}}
 */
function parseDomain(domain) {
    const trunks = domain.split('.')
    return {
        subDomain: trunks.slice(0, trunks.length - 2).join('.') || '@',
        mainDomain: trunks.slice(-2).join('.'),
    }
}

/**
 * 获取本机公网 IP
 * @return {Promise<string>}
 */
async function getExternalIp() {
    const response = await fetch('https://jsonip.com')
    const data = await response.json()
    return data.ip
}

function getTime() {
    return new Date().toLocaleString()
}

async function notify(webHook, msg) {
    if (webHook) {
        webHook = webHook.replace('{msg}', encodeURIComponent(msg))
        const response = await fetch(webHook)
        return response.text()
    }
}

async function main() {
    const config = await loadConfig()
    const aliClient = new AliyunClient(config.accessKey, config.accessKeySecret)

    checkDomains(aliClient, config.domains, config.webHook).catch(e => console.error(e))
    setInterval(async () => {
        try {
            await checkDomains(aliClient, config.domains, config.webHook)
        } catch (e) {
            console.error(e)
        }
    }, config.interval * 1000)
}

await main()
