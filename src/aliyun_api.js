/*
 * 借助阿里云 DNS 服务实现 DDNS（动态域名解析）
 */
const Core = require('@alicloud/pop-core')

module.exports = class AliyunClient {
    constructor(accessKeyId, accessKeySecret) {
        if (!accessKeyId || !accessKeySecret) {
            throw new Error(`Aliyun accessKeyId and accessKeySecret are required`)
        }

        this.client = new Core({
            accessKeyId,
            accessKeySecret,
            endpoint: 'https://alidns.aliyuncs.com',
            apiVersion: '2015-01-09',
        })
    }

    /**
     * 获取域名解析记录
     * @param {string} subDomain 子域名，如www或@
     * @param {string} mainDomain 主域名，如aliyun.com
     * @return {Promise<[{RecordId:string, DomainName:string, RR:string, Value:string, TTL:string, Weight:string, Remark:string, Status:string, Type:string}]>}
     */
    async getDomainRecords(subDomain, mainDomain) {
        const res = await this.client.request('DescribeDomainRecords', {
            DomainName: mainDomain,
            PageSize: 100,
            RRKeyWord: subDomain,
            TypeKeyWord: 'A',
        }, {
            method: 'POST',
        })
        return res.DomainRecords.Record.filter(item => item.RR === subDomain)
    }

    /**
     * 新增域名解析记录
     * @param {string} subDomain 子域名，如www或@
     * @param {string} mainDomain 主域名，如aliyun.com
     * @param {string} ip
     * @return {Promise<{RecordId:string}>}
     */
    async addRecord(subDomain, mainDomain, ip) {
        const res = await this.client.request('AddDomainRecord', {
            DomainName: mainDomain,
            RR: subDomain,
            Type: 'A',
            Value: ip,
        }, {
            method: 'POST',
        })
        return res.RecordId
    }

    /**
     * 更新域名解析记录
     * @param {string} id
     * @param {string} subDomain 子域名，如www或@
     * @param {string} ip
     * @return {Promise<{RecordId:string}>}
     */
    async updateRecord(id, subDomain, ip) {
        await this.client.request('UpdateDomainRecord', {
            RecordId: id,
            RR: subDomain,
            Type: 'A',
            Value: ip,
        }, {
            method: 'POST',
        })
    }
}
