import { through } from '@tdio/stream'
import TurndownService from 'turndown'
import cheerio from 'cheerio'
import { parseJSON } from './utils'

import { cleanupMarkdown } from './markdown-utils'

import logger from './logger'

export const sanitize = () => {
  let head: Buffer | null = null
  let matching = false
  let finished = false

  const findEOF = (chunk: Buffer): number => {
    // find end token
    const pos = chunk.indexOf('\')')
    if (pos !== -1 && chunk[pos - 1] !== '\\'.charCodeAt(0)) {
      return pos
    }
    return -1
  }

  const st = through(
    function (chunk, enc, cb) {
      if (finished) {
        logger.log('[sanitize] ->> transform finished')
        cb()
        return
      }
      if (!matching) {
        // find start token
        head = head ? Buffer.concat([head, chunk]) : chunk
        const startToken = Buffer.from('slide.setContent(\'')
        const pos = head.indexOf(startToken)
        if (pos !== -1) {
          matching = true
          let s = head.slice(pos + startToken.length)
          const end = findEOF(s)
          if (end !== -1) {
            s = s.slice(0, end)
            finished = true
          }
          cb(null, s)
          head = null
        }
      } else {
        // find end token
        const end = findEOF(chunk)
        if (end !== -1) {
          cb(null, chunk.slice(0, end))
          finished = true
        } else {
          cb(null, chunk)
        }
      }
    }
  )

  st
    .on('finish', () => {
      logger.log('[sanitize] ->> writer finish')
    })
    .on('end', () => {
      logger.log('[sanitize] ->> reader end')
    })

  return st
}

const turndownService = new TurndownService({ headingStyle: 'atx' })

export const parse = () => {
  let raw: Buffer = Buffer.of()
  return through(
    function (chunk, enc, cb) {
      raw = Buffer.concat([raw, chunk])
      cb()
    },
    function (cb) {
      const html = parseJSON(`{"html": "${raw.toString()}"}`).html
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
    { readableObjectMode: true }
  )
}
