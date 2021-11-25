import { Readable, ReadableOptions } from 'stream'
import cheerio from 'cheerio'
import { through } from '@tdio/stream'
import { fetch, runSeries, loadConfig, parseJSON, cos } from './utils'
import * as qs from 'querystring'

interface ReportType {
  id: string;
  author: string;
  avatar: string;
  reportTitle: string;
  reportQuestions: Array<{
    createTime: string;
    answer: {
      title: string;
      content: string;
    }
  }>;
}

interface ApiSpec {
  endpoint: string;
  cookie?: string;
}

class ReportError extends Error {
  code: number;
  constructor (msg: string, code: number = 0) {
    super(msg)
    this.code = code
  }
}

const HTTP_STATUS_NO_CONTENT = 204

class ReportReader extends Readable {
  api: ApiSpec;

  constructor (api: ApiSpec, options?: ReadableOptions) {
    super(options)
    this.api = api
    this.startLoad().catch(e => {
      console.error(e)
      process.exit(1)
    })
  }

  async startLoad(id: string = '') {
    try {
      const reports = await this.load(id)
      if (reports.length) {
        reports.forEach(item => {
          this.push(JSON.stringify(item, null, 2))
        })
        await this.startLoad(reports[reports.length - 1].id)
      }
    } catch (e) {
      this.push(null)
      if (e.code !== HTTP_STATUS_NO_CONTENT) {
        throw e
      }
    }
  }

  load (id: string): Promise<ReportType[]> {
    return new Promise((resolve, reject) => {
      const st = fetch(`${this.api.endpoint}&till_member_guid=${id}`, {
        headers: {
          'x-requested-with': 'XMLHttpRequest',
          'Accept': 'application/json',
          'cookie': this.api.cookie
        }
      })
      st.on('response', response => {
        const code = response.statusCode
        if (code !== 200) {
          reject(new ReportError('None contents', code))
        }
      })
      cos(() => st)((err, result) => {
        if (err) {
          reject(err)
        } else {
          resolve(this.parse(result))
        }
      })
    })
  }

  parse (raw: string): ReportType[] | null {
    if (!raw.length) {
      return null
    }

    const html = parseJSON(raw.toString()).html
    const $ = cheerio.load(html)
    const list = $('.member-report-item').get()

    return list.map(node => {
      const $n = cheerio(node)
      const attrs = node.attribs
      const id = attrs['data-guid']
      const avatar = $n.find('.avatar').attr('src')
      const reportTitle = $n.find('.member-report-title').text()
      const author = $n.find('.member-report-question .author').last().text()
      const reportQuestions = $n.find('.member-report-question .answer-main').get()
        .map(node => {
          const $answer = cheerio(node)
          const createTime = ($answer.find('.answer-info .by-time').attr('title') || '').replace(/^[^\d]*/, '')
          if (!createTime) {
            return null
          }
          return {
            createTime,
            answer: {
              title: $answer.find('.answer-question').text(),
              content: $answer.find('.answer-content').html()
            }
          }
        })
        .filter(Boolean)

      return {
        id,
        author,
        avatar,
        reportTitle,
        reportQuestions
      }
    })
  }

  _read () {
  }

}

interface WeeklyOptions {
  api: string;
  cookie?: string;
  reportQuery?: {
    date: string;
    subgroup_guid: string;
    conn_guid?: string;
  }
}

const loadWeeklyReports = (opts: WeeklyOptions) => {
  const rd = new ReportReader({
    endpoint: `${opts.api}?${qs.stringify(opts.reportQuery)}`,
    cookie: opts.cookie
  })
  rd.pipe(through(
    function (chunk, enc, cb) {
      console.log(chunk.toString())
      cb(null, chunk)
    }
  ))
}

function main () {
  const opts: WeeklyOptions = {
    api: 'https://tower.im/teams/66f9f25eee0a44d18282ffdcd0b33e1f/reports/',
    cookie: 'wechat_login_remember_me=true; intercom-id-xbtsuf77=54e3394a-ee1d-40cb-bf4d-009e419f92a5; remember_token=80137323-603b-446e-b564-c11170cb4b75; remember_sns_bind_token=YZitBAdKvWiKMEmxrJSxPUUQ; remember_team_guid=66f9f25eee0a44d18282ffdcd0b33e1f; uid=rBACK2B/gd2s2GWdQeAhAg==; AGL_USER_ID=e5d3f4ba-1752-4ea1-8ae8-044550c6eb0b; _tower2_session=a5cfd52f7461b08ffa1ff4fd4073e383; intercom-session-xbtsuf77=UDVYcHZrOTNQRS9TZy8yTlF2VVo4NVdHNTljbFJPdDVZMlhZbU1VTW5rRGl4cEx4dFE5NE5sUElnOTZVdllTeS0tc2RvSlNPaktxWk0vODN2VEtQYjdYdz09--ec4bc96c3cad84a2d7e2ac0e0d3a1a06d0e21643',
    reportQuery: {
      date: new Date().toISOString().split('T')[0],
      subgroup_guid: 'b6c3e3fc950e59ba68987dbe04492b12',
      conn_guid: '4b463b73-d19a-432f-a1c7-7b2835504c6a',
    }
  }

  loadWeeklyReports(opts)
}

main()
