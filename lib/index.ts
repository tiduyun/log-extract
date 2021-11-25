/**
 * Daily report generator (based on tower.me apis)
 *
 * @author Allex Wang (@allex_wang)
 */

import { promisify } from 'util'
import { through } from '@tdio/stream'

import { fetch, cos } from './utils'
import { Printer } from './printer'
import { sanitize, parse } from './processor'

import { Kv, IProject, IConfig } from './types/common'
import logger from './logger'

interface IReport {
  title: string;
  list: string[];
}

interface ReportContext {
  api?: string;
  title: string;
  cookie: string;
  labels: Array<[string, string[]]>;
  startTime: Date;
  orderBy (a: IReport, b: IReport): -1 | 0 | 1;
}

const identifyLabel = (title: string, labels: any[]): string => {
  for (let l = labels.length, i = -1; ++i < l;) {
      const lexicon: string[] = labels[i][1]
      if (lexicon.some(word => title.indexOf(word) !== -1)) {
          return labels[i][0];
      }
  }
  return title
}

type ParsedReportData = {
  title: string;
  list: string[];
  attrs: Kv<any>
}

const render = (ctx: ReportContext) => {
  logger.log(`build reports of "${ctx.title}" ...`)

  return through(function (reports, enc, cb) {
    const list = reports.filter(o => new Date(o.attrs['createTime']) > ctx.startTime)

    logger.log(`parsed reports: \n${JSON.stringify(list, null, 2)}`)

    const content = list
      .map(({ markdown, attrs }) => {
        const groupOffset = []
        const report: ParsedReportData = markdown.trim().split('\n')
          .filter(Boolean)
          .reduce((spec: ParsedReportData, line: string, i: number) => {
            if (i === 0 && !/\d\./.test(line)) {
              // cleanup
              spec.title = identifyLabel(line, ctx.labels)
            } else {
              if (line.indexOf('#') === 0) {
                groupOffset.push(i)
              }
              spec.list.push(line)
            }
            return spec
          }, { title: '', list: [], attrs })

        // remove single group title
        if (groupOffset.length === 1) {
          report.list.splice(groupOffset[groupOffset[0]], 1)
        }

        return report
      })
      .sort(ctx.orderBy)
      .map(o => `### ${o.title}\n${o.list.join('\n')}`)
      .join('\n\n')

    cb(null, content ? `## ${ctx.title}\n\n${content}` : '')
  }, { writableObjectMode: true })
}

const genReports = ({ api, ...ctx }: ReportContext) => {
  return fetch(api, { headers: { 'Accept': '*/*', 'cookie': ctx.cookie } })
    .pipe(sanitize())
    .pipe(parse())
    .pipe(render(ctx))
}

const getMiddleNight = (n: number): Date => {
  const dt = new Date()
  dt.setDate(dt.getDate() + n)
  dt.setHours(23)
  dt.setMinutes(59)
  dt.setSeconds(59)
  return dt
}

async function main(config: IConfig): Promise<void> {
  const orderIndexes = config.departmentNames.reduce((map, cfg, i) => {
    map[cfg[0]] = i
    return map
  }, {} as Kv<number>)

  const orderBy: ReportContext["orderBy"] = (a, b) => {
    const diff = orderIndexes[a.title] - orderIndexes[b.title]
    return diff > 0 ? 1 : diff === 0 ? 0 : -1
  }

  const isodt = new Date().toISOString()
  const date = isodt.split('T')[0] // yyyy-MM-dd

  logger.log(`Start to build daily reports (${isodt})...`)

  const projects = config.projects
  let out = new Printer({ fd: process.stdout })
  let hasTitle = false

  for (const pid of Object.keys(config.projects)) {
    const r = await promisify(
      cos(() => genReports({
        ...projects[pid],
        cookie: config.cookie,
        labels: config.departmentNames,
        startTime: getMiddleNight(-1),
        orderBy: orderBy
      }))
    )()
    if (r.length) {
      if (!hasTitle) {
        out.write(`# 研发日报【${date}】\n\n`)
        hasTitle = true
      }
      out.write(r)
      out.write('\n\n---\n')
    }
  }
}

module.exports = main
