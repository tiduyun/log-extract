import p from 'path'
import { loadConfig } from './utils'
import { IConfig } from './types/common'

const argv = process.argv.slice(2)

const aliases = {
  p: 'project',
  c: 'config'
}

let configFile = 'config.json'

// parse command args
while (argv.length) {
  let k: string = argv.shift()
  let v: any = argv[0] || ''

  if (k === '--') break
  if (k.indexOf('-') !== 0) continue

  // parse k/v tuple, eg. --config=foo.json
  const match = /(\w+)=(\w+)/.exec(k)
  if (match) {
    k = match[1]
    v = match[2]
  }

  if (v.indexOf('-') === 0) {
    v = ''
  } else {
    argv.shift()
  }

  k = k.replace(/^--?/, '')
  k = aliases[k] || k

  switch (k) {
    case 'config':
      if (v) configFile = v
      break
  }
}

let CONFIG: IConfig

try {
  CONFIG = loadConfig(p.resolve(process.cwd(), configFile))
} catch (e) {
  console.error(e.message)
  process.exit(1)
}

require('./index')(CONFIG)
