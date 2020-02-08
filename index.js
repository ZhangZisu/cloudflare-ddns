const config = require('./config')()
const assert = require('assert')
const Axios = require('axios').default
const axios = Axios.create({
  baseURL: 'https://api.cloudflare.com/client/v4/',
  headers: {
    'Authorization': `Bearer ${config.string('token')}`
  }
})

const stdout = process.stdout

const getIPv4 = async () => {
  const res = await Axios.get('https://v4.ident.me')
  return res.data
}

const getIPv6 = async () => {
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

/**
 * @param {any[]} zones
 */
const A = async (zones) => {
  const names = config.array('A')
  if (!names.length) return
  const ip = await getIPv4()
  console.log(`Update for A records (${ip})`)
  for (const name of names) {
    stdout.write(name)
    const zone = zones.find(x => name.endsWith(x.name))
    if (!zone) {
      stdout.write(' no corresponding zone\n')
      continue
    }
    stdout.write(` zone ${zone.id}`)
    const records = await walk(`zones/${zone.id}/dns_records`, { name, type: 'A' })
    if (!records.length) {
      stdout.write(' c')
      await axios.post(`zones/${zone.id}/dns_records`, { type: 'A', name, content: ip })
      stdout.write(` ${ip}\n`)
    } else {
      const record = records[0]
      stdout.write(` u ${record.id}`)
      await axios.put(`zones/${zone.id}/dns_records/${record.id}`, { type: 'A', name, content: ip })
      stdout.write(` ${ip}\n`)
    }
  }
}

/**
 * @param {any[]} zones
 */
const AAAA = async (zones) => {
  const names = config.array('AAAA')
  if (!names.length) return
  const ip = await getIPv6()
  console.log(`Update for AAAA records (${ip})`)
  for (const name of names) {
    stdout.write(name)
    const zone = zones.find(x => name.endsWith(x.name))
    if (!zone) {
      stdout.write(' no corresponding zone\n')
      continue
    }
    stdout.write(` zone ${zone.id}`)
    const records = await walk(`zones/${zone.id}/dns_records`, { name, type: 'AAAA' })
    if (!records.length) {
      stdout.write(' c')
      await axios.post(`zones/${zone.id}/dns_records`, { type: 'AAAA', name, content: ip })
      stdout.write(` ${ip}\n`)
    } else {
      const record = records[0]
      stdout.write(` u ${record.id}`)
      await axios.put(`zones/${zone.id}/dns_records/${record.id}`, { type: 'AAAA', name, content: ip })
      stdout.write(` ${ip}\n`)
    }
  }
}

const main = async () => {
  /** @type {any[]} */
  const zones = await walk('zones')
  await A(zones)
  await AAAA(zones)
}

main()
  .catch(e => console.error(e))
  .finally(() => process.exit(0))
