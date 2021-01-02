/*
 * 借助阿里云 DNS 服务实现 DDNS（动态域名解析）
 */
const axios = require('axios')
const isDocker = require('is-docker')
const AliyunClient = require('./aliyun_api')

/**
 * 加载配置
 * @return {{accessKeySecret: string, accessKey: string, domains: string[], interval: number}}
 */
function loadConfig() {
    let accessKey
    let accessKeySecret
    let domain
    let interval

    if (isDocker()) {
        accessKey = process.env.accessKey
        accessKeySecret = process.env.accessKeySecret
        domain = process.env.domain
        interval = process.env.interval
    } else {
        const config = require('../config.json')
        accessKey = config.accessKey
        accessKeySecret = config.accessKeySecret
        domain = config.domain
        interval = config.interval
    }

    return {
        accessKey,
        accessKeySecret,
        domains: domain.split(',').map(item => item.trim()),
        interval: parseInt(interval, 10),
    }
}

async function checkDomains(aliClient, domains) {
    const externalIp = await getExternalIp()
    console.log(getTime(), '当前公网 ip:', externalIp)

    for (const domain of domains) {
        await checkDomain(aliClient, domain, externalIp)
    }
}

async function checkDomain(aliClient, domain, externalIp) {
    const {subDomain, mainDomain} = parseDomain(domain)
    const domainRecords = await aliClient.getDomainRecords(subDomain, mainDomain)

    // 无记录 直接添加
    if (!domainRecords.length) {
        console.log(getTime(), domain, '记录不存在，新增中 ...')
        await aliClient.addRecord(subDomain, mainDomain, externalIp)
        console.log(getTime(), domain, '新增成功, 当前 dns 指向: ', externalIp)
        return null
    }

    // 已有记录
    for (const record of domainRecords) {
        // 记录值存在
        if (record.Value === externalIp) {
            // 记录值一致
            console.log(getTime(), domain, '记录一致, 无需修改')
        } else {
            // 记录值不一致
            await aliClient.updateRecord(record.RecordId, subDomain, externalIp)
            console.log(getTime(), domain, '更新成功, 当前 dns 指向: ', externalIp)
        }
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
    const {data} = await axios.get('https://jsonip.com')
    return data.ip
}

function getTime() {
    return new Date().toLocaleString()
}

function main() {
    const {accessKey, accessKeySecret, domains, interval} = loadConfig()
    const aliClient = new AliyunClient(accessKey, accessKeySecret)

    checkDomains(aliClient, domains).catch(e => console.error(e))
    setInterval(async () => {
        try {
            await checkDomains(aliClient, domains)
        } catch (e) {
            console.error(e)
        }
    }, interval * 1000)
}

main()
