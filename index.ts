/**
 * Daily report generator (based on tower.me apis)
 *
 * @author Allex Wang (@allex_wang)
 */

import p from 'path'
import { through } from '@tdio/stream'

import { fetch, runSeries, loadConfig } from './lib/utils'
import { Printer, cos } from './lib/printer'
import { sanitize, parse } from './lib/processor'

import { Kv } from './types/common'

interface IProject {
  title: string;
  api: string;
}

interface IConfig {
  cookie: string;
  projects: Kv<IProject>;
  /* [Category, Array<LexiconWord>] */
  departmentNames: Array<[string, string[]]>;
}

interface IReport {
  title: string;
  list: string[];
}

/* @sington global configs, parsed by `-c config.json` */
let CONFIG: IConfig
let PID: string = ''

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
    case 'project':
      if (v) PID = v
      break
  }
}

try {
  CONFIG = loadConfig(p.resolve(process.cwd(), configFile))
} catch (e) {
  console.error(e.message)
  process.exit(1)
}

const orders = CONFIG.departmentNames.reduce((map, cfg, i: number) => {
  map[cfg[0]] = i
  return map
}, {} as Kv<number>)

const compareOrder = (a: IReport, b: IReport) => {
  const diff = orders[a.title] - orders[b.title]
  return diff > 0 ? 1 : diff === 0 ? 0 : -1
}

const identifyDept = (title: string): string => {
  const depts = CONFIG.departmentNames
  for (let l = depts.length, i = -1; ++i < l;) {
    const lexicon = depts[i][1] as string[]
    if (lexicon.some(word => title.indexOf(word) !== -1)) {
      return depts[i][0]
    }
  }
  return title
}

const getLastMiddleNight = (): Date => {
  const dt = new Date()
  dt.setDate(dt.getDate() - 1)
  dt.setHours(23)
  dt.setMinutes(59)
  return dt
}

const render = (spec: { title: string; limit: Date; }) => {
  return through(function (reports, enc, cb) {
    const content = reports
      .filter(o => new Date(o.attrs['createTime']) > spec.limit)
      .map(({ markdown, attrs: { author } }) => {
        const groupOffset = []
        const spec = markdown.trim().split('\n')
          .filter(Boolean)
          .reduce((spec, line, i) => {
            if (i === 0 && !/\d\./.test(line)) {
              // cleanup
              spec.title = identifyDept(line)
            } else {
              if (line.indexOf('#') === 0) {
                groupOffset.push(i)
              }
              spec.list.push(line)
            }
            return spec
          }, { title: '', list: [] })

        // remove single group title
        if (groupOffset.length === 1) {
          spec.list.splice(groupOffset[groupOffset[0]], 1)
        }

        return spec
      })
      .sort(compareOrder)
      .map(o => `### ${o.title}\n${o.list.join('\n')}`)
      .join('\n\n')

    cb(null, content ? `## ${spec.title}\n\n${content}` : '')
  }, { writableObjectMode: true })
}

const genReports = (project: IProject) =>
  fetch(project.api, { headers: { 'Accept': '*/*', 'cookie': CONFIG.cookie } })
    .pipe(sanitize())
    .pipe(parse())
    .pipe(render({ title: project.title, limit: getLastMiddleNight() }))

function main () {
  const pid = PID
  const date = new Date().toISOString().split('T')[0] // yyyy-MM-dd

  const out = new Printer({ fd: process.stdout })
  out.write(`Start to build daily reports (${date})...\n\n`)

  const projects = CONFIG.projects
  if (pid) {
    if (projects.hasOwnProperty(pid)) {
      genReports(projects[pid]).pipe(out)
    } else {
      throw new Error('Not a valid project id')
    }
  } else {
    runSeries(
      Object.keys(projects).map(pid => cos(genReports(projects[pid]))),
      (err: Error, results: any) => {
        if (!err) {
          results = results.filter(r => r.length)
          const l = results.length
          if (l > 0) {
            out.write(`# 研发日报【${date}】\n\n`)
            results.forEach((r, i) => {
              out.write(r)
              if (i < l - 1) out.write('\n\n---\n\n')
            })
            out.write('\n\n')
          } else {
            out.write('No available reports yet!\n')
            process.exit(1)
          }
        }
      }
    )
  }
}

main()
