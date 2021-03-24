import { through } from '@tdio/stream'
import TurndownService from 'turndown'
import cheerio from 'cheerio'

import { cleanupMarkdown } from './markdown-utils'

const rxEscapable = /[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g
const rxDangerous = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g
const meta = {    // table of character substitutions
  '\b': '\\b',
  '\t': '\\t',
  '\n': '\\n',
  '\f': '\\f',
  '\r': '\\r',
  '\'': '\\\''
}

export const escapeBadChars = (s: string): string => {
  rxEscapable.lastIndex = 0
  rxDangerous.lastIndex = 0
  if (rxDangerous.test(s)) {
    s = s.replace(rxDangerous, function (a) {
      return (
        '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4)
      )
    })
  }
  if (rxEscapable.test(s)) {
    s = s.replace(rxEscapable, function (a) {
      var c = meta[a]
      return typeof c === 'string' ? c : a
    })
  }
  return s
}

export const sanitize = () => {
  let head = ''
  let matching = false
  let finished = false
  return through(
    function (chunk, enc, cb) {
      if (finished) {
        return
      }
      const s = chunk.toString()
      if (!matching) {
        // find start
        head += s
        const startToken = 'slide.setContent(\''
        const pos = head.indexOf(startToken)
        if (pos !== -1) {
          cb(null, head.substring(pos + startToken.length))
          head = ''
          matching = true
        }
      } else {
        // find ender
        const pos = s.indexOf('\')')
        if (pos !== -1 && s.substr(pos - 1, 1) !== '\\') {
          cb(null, s.substring(0, pos))
          finished = true
        } else {
          cb(null, s)
        }
      }
    }
  )
}

const turndownService = new TurndownService({ headingStyle: 'atx' })

export const parse = () => {
  let raw = ''
  return through(
    function (chunk, enc, cb) {
      raw += chunk
      cb()
    },
    function (cb) {
      const html = JSON.parse(`{"html": "${escapeBadChars(raw)}"}`).html
      const $ = cheerio.load(html)
      const list = $('.project-kanban-todolist-comments .comment[data-guid]').get()
      const rs = list.map(node => {
        const $n = cheerio(node)
        const attrs = node.attribs
        const id = attrs['data-guid']
        attrs['avatar'] = $n.find('.avatar').attr('src')
        attrs['author'] = $n.find('.comment-main .author').text()
        attrs['createTime'] = $n.find('.comment-main .create-time').attr('title').replace(/^[^\d]*/, '')
        const html = $n.find('.comment-main .comment-content').html()
        return {
          id,
          attrs,
          html,
          get markdown () {
            return cleanupMarkdown(turndownService.turndown(html))
          }
        }
      })
      cb(null, rs)
    },
    { objectMode: true }
  )
}
