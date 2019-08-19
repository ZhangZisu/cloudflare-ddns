const config = require('./config')()
const assert = require('assert')
const Axios = require('axios').default
const axios = Axios.create({
  baseURL: 'https://api.cloudflare.com/client/v4/',
  headers: {
    'Authorization': `Bearer ${config.string('token')}`
  }
})

const ipv6 = async () => {
  const res = await Axios.get('https://v6.ident.me')
  return res.data
}

const walk = async (url, params) => {
  let res = await axios.get(url, { params })
  let result = res.data.result
  let info = res.data.result_info
  for (let page = 2; page <= info.total_pages; page++) {
    Object.assign(params, { page })
    res = await axios.get(url, { params })
    result.push(...res.result)
  }
  assert(result.length === info.total_count)
  return result
}

const main = async () => {
  const ip = await ipv6()
  console.log(`Current IP: ${ip}`)
  /** @type {any[]} */
  const zones = await walk('zones')
  const names = config.array('name')
  for (const name of names) {
    console.log(`Update DNS info for ${name}...`)
    const zone = zones.find(x => name.endsWith(x.name))
    if (!zone) {
      console.log("do not have corresponding zone, ignore.")
      continue
    }
    console.log(`zone  : ${zone.id}`)
    const records = await walk(`zones/${zone.id}/dns_records`, { name, type: 'AAAA' })
    if (!records.length) {
      console.log("do not have corresponding records")
      await axios.post(`zones/${zone.id}/dns_records`, { type: 'AAAA', name, content: ip })
      console.log(`${name} -> ${ip}`)
    } else {
      const record = records[0]
      console.log(`record: ${record.id}`)
      await axios.put(`zones/${zone.id}/dns_records/${record.id}`, { type: 'AAAA', name, content: ip })
      console.log(`${record.content} -> ${ip}`)
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => process.exit(0))
