const fs = require('fs')
const assert = require('assert')

module.exports = () => {
  /** @type {Map<string, string[]>} */
  const map = new Map()
  const arr = fs.readFileSync('.conf')
    .toString()
    .split('\n')
    .map(x => x.trim())
    .map(x => x.split('='))
    .filter(x => x.length === 2)
    .map(x => x.map(y => y.trim()))
    .forEach(x => map.has(x[0]) ? map.get(x[0]).push(x[1]) : map.set(x[0], [x[1]]))
  return {
    string(key) {
      assert(map.has(key))
      const value = map.get(key)
      assert(value.length === 1)
      return value[0]
    },
    array(key) {
      assert(map.has(key))
      const value = map.get(key)
      return value
    }
  }
}