/*
 * 借助阿里云 DNS 服务实现 DDNS（动态域名解析）
 * @see https://api.aliyun.com/product/Alidns
 */
import Alidns20150109 from '@alicloud/alidns20150109'
import OpenApi from '@alicloud/openapi-client'
import Util from '@alicloud/tea-util'

class AliyunClient {
    constructor(accessKeyId, accessKeySecret) {
        if (!accessKeyId || !accessKeySecret) {
            throw new Error(`Aliyun accessKeyId and accessKeySecret are required`)
        }

        const config = new OpenApi.Config({
            accessKeyId,
            accessKeySecret,
            endpoint: 'alidns.cn-chengdu.aliyuncs.com',
        })
        this.client = new Alidns20150109.default(config)
    }

    /**
     * 获取域名解析记录
     * @param {string} subDomain 子域名，如www或@
     * @param {string} mainDomain 主域名，如aliyun.com
     * @return {Promise<[{RecordId:string, DomainName:string, RR:string, Value:string, TTL:string, Weight:string, Remark:string, Status:string, Type:string}]>}
     */
    async getDomainRecords(subDomain, mainDomain) {
        const request = new Alidns20150109.DescribeDomainRecordsRequest({
            domainName: mainDomain,
            RRKeyWord: subDomain,
            pageSize: 100,
            typeKeyWord: 'A',
        });
        const runtime = new Util.RuntimeOptions({});
        const res = await this.client.describeDomainRecordsWithOptions(request, runtime);
        return res.body.domainRecords.record.filter(item => item.RR === subDomain)
    }

    /**
     * 新增域名解析记录
     * @param {string} subDomain 子域名，如www或@
     * @param {string} mainDomain 主域名，如aliyun.com
     * @param {string} ip
     * @return {Promise<string>} RecordId
     */
    async addRecord(subDomain, mainDomain, ip) {
        const request = new Alidns20150109.AddDomainRecordRequest({
            domainName: mainDomain,
            RR: subDomain,
            type: 'A',
            value: ip,
        });
        const runtime = new Util.RuntimeOptions({});
        const res = await this.client.addDomainRecordWithOptions(request, runtime);
        return res.body.recordId
    }

    /**
     * 更新域名解析记录
     * @param {string} recordId
     * @param {string} subDomain 子域名，如www或@
     * @param {string} ip
     * @return {Promise}
     */
    async updateRecord(recordId, subDomain, ip) {
        const request = new Alidns20150109.UpdateDomainRecordRequest({
            recordId,
            RR: subDomain,
            type: 'A',
            value: ip,
        });
        const runtime = new Util.RuntimeOptions({});
        await this.client.updateDomainRecordWithOptions(request, runtime)
    }
}

export default AliyunClient