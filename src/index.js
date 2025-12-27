/*
 * 借助阿里云 DNS 服务实现 DDNS（动态域名解析）
 */
import AliyunClient from './aliyun_api.js'

class Notifier {
    constructor(webHook) {
        this.webHook = webHook
    }

    async notify(msg) {
        if (this.webHook) {
            const url = this.webHook.replace('{msg}', encodeURIComponent(msg))
            try {
                const response = await fetch(url)
                return await response.text()
            } catch (e) {
                console.error('Notify failed:', e)
            }
        }
    }
}

class DDNS {
    constructor(accessKey, accessKeySecret, domains, notifier) {
        this.client = new AliyunClient(accessKey, accessKeySecret)
        this.domains = domains
        this.notifier = notifier
    }

    async checkDomains() {
        const externalIp = await this.getExternalIp()
        console.log(this.getTime(), '当前公网 ip:', externalIp)

        const differentRecords = await this.findDifferentRecords(this.domains[0], externalIp)
        if (Array.isArray(differentRecords) && !differentRecords.length) {
            console.log(this.getTime(), '首个域名解析一致:', this.domains[0], '跳过全部更新')
            return
        }

        for (const domain of this.domains) {
            await this.updateDomain(domain, externalIp)
        }
    }

    /**
     * 查找与当前 IP 不同的记录
     * @param {string} domain
     * @param {string} externalIp
     * @return {Promise<Array<Record> | null>} 返回与当前IP不同的记录。如果没有任何记录，则返回null
     */
    async findDifferentRecords(domain, externalIp) {
        try {
            const { subDomain, mainDomain } = this.parseDomain(domain)
            const domainRecords = await this.getRecords(subDomain, mainDomain)

            // 检查是否存在与当前IP一致的记录
            return domainRecords.filter(record => record.value !== externalIp)
        } catch (e) {
            console.error(`检查域名 ${domain} 失败:`, e.message)
            return null
        }
    }

    async updateDomain(domain, ip) {
        const { subDomain, mainDomain } = this.parseDomain(domain)
        const differentRecords = await this.findDifferentRecords(domain, ip)

        if (differentRecords === null) {
            // 无记录 直接添加
            console.log(this.getTime(), domain, '记录不存在，新增中...')
            await this.client.addRecord(subDomain, mainDomain, ip)
            console.log(this.getTime(), domain, '新增成功, 当前 dns 指向:', ip)
            await this.notifier.notify(`域名${domain}已解析到${ip}`)
        } else {
            // 已有记录
            await Promise.all(differentRecords.map(record => {
                return this.client.updateRecord(record.recordId, subDomain, ip)
            }))
            console.log(this.getTime(), domain, '更新成功, 当前 dns 指向:', ip)
            await this.notifier.notify(`域名${domain}已解析到${ip}`)
        }
    }

    async getRecords(subDomain, mainDomain) {
        return await this.client.getDomainRecords(subDomain, mainDomain)
    }

    /**
     * 格式化域名，获取子域名与主域名
     * @param {string} domain
     * @return {{subDomain: string, mainDomain: string}}
     */
    parseDomain(domain) {
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
    async getExternalIp() {
        const sources = [
            { url: 'https://jsonip.com', parser: async r => (await r.json()).ip },
            { url: 'http://ipv4.icanhazip.com', parser: async r => (await r.text()).trim() },
            { url: 'http://api.ipify.org', parser: async r => (await r.text()).trim() }
        ];

        for (const source of sources) {
            try {
                const response = await fetch(source.url);
                if (response.ok) {
                    const ip = await source.parser(response);
                    if (ip) return ip;
                }
            } catch (e) {
                console.error(`Failed to get IP from ${source.url}:`, e.message);
            }
        }
        throw new Error('All IP sources failed');
    }

    getTime() {
        return new Date().toLocaleString()
    }
}

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

async function main() {
    const config = await loadConfig()
    if (!config.accessKey || !config.accessKeySecret || !config.domains || config.domains.length === 0) {
        throw new Error('accessKey, accessKeySecret, and domain are required')
    }

    const notifier = new Notifier(config.webHook)
    const ddns = new DDNS(config.accessKey, config.accessKeySecret, config.domains, notifier)

    ddns.checkDomains().catch(e => console.error(e))
    setInterval(async () => {
        try {
            await ddns.checkDomains()
        } catch (e) {
            console.error(e)
        }
    }, config.interval * 1000)
}

await main()
