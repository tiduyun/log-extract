import { through } from '@tdio/stream'
import TurndownService from 'turndown'
import cheerio from 'cheerio'
import JSON5 from 'json5'

import { cleanupMarkdown } from './markdown-utils'

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
      const html = JSON5.parse(`{"html": "${raw}"}`).html
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
