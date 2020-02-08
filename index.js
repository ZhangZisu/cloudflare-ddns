const config = require('./config')()
const assert = require('assert')
const chalk = require('chalk')
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
  stdout.write(`Update for ${chalk.greenBright('A')} records`)
  const ip = await getIPv4()
  stdout.write(` ${chalk.bold.white(ip)}\n`)
  for (const name of names) {
    stdout.write(chalk.bold(name))
    const zone = zones.find(x => name.endsWith(x.name))
    if (!zone) {
      stdout.write(chalk.redBright(' no corresponding zone\n'))
      continue
    }
    stdout.write(` ${chalk.grey(zone.id.substr(0, 4))}`)
    const records = await walk(`zones/${zone.id}/dns_records`, { name, type: 'A' })
    if (!records.length) {
      stdout.write(chalk.greenBright(' NEW\n'))
      await axios.post(`zones/${zone.id}/dns_records`, { type: 'A', name, content: ip })
    } else {
      const record = records[0]
      stdout.write(chalk.greenBright(` ${record.id.substr(0, 4)}\n`))
      await axios.put(`zones/${zone.id}/dns_records/${record.id}`, { type: 'A', name, content: ip })
    }
  }
}

/**
 * @param {any[]} zones
 */
const AAAA = async (zones) => {
  const names = config.array('AAAA')
  if (!names.length) return
  stdout.write(`Update for ${chalk.greenBright('AAAA')} records`)
  const ip = await getIPv6()
  stdout.write(` ${chalk.bold.white(ip)}\n`)
  for (const name of names) {
    stdout.write(chalk.bold(name))
    const zone = zones.find(x => name.endsWith(x.name))
    if (!zone) {
      stdout.write(chalk.redBright(' no corresponding zone\n'))
      continue
    }
    stdout.write(` ${chalk.grey(zone.id.substr(0, 4))}`)
    const records = await walk(`zones/${zone.id}/dns_records`, { name, type: 'AAAA' })
    if (!records.length) {
      stdout.write(chalk.greenBright(' NEW\n'))
      await axios.post(`zones/${zone.id}/dns_records`, { type: 'AAAA', name, content: ip })
    } else {
      const record = records[0]
      stdout.write(chalk.greenBright(` ${record.id.substr(0, 4)}\n`))
      await axios.put(`zones/${zone.id}/dns_records/${record.id}`, { type: 'AAAA', name, content: ip })
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
  .then(() => process.exit(0))
  .catch(e => {
    if (e.isAxiosError) {
      console.error('network error', chalk.redBright(e.message))
      process.exit(1)
    } else {
      console.error(e.message)
    }
    process.exit(-1)
  })
