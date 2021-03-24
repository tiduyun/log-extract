/**
 * Some common internal utils
 *
 * @author Allex Wang (@allex_wang)
 */

import p from 'path'
import fs from 'fs'
import request from 'request'
import { Transform } from 'stream'
import { GenericCallback, Kv } from 'types/common'

type CallbackTask = (cb: GenericCallback) => void

export function runSeries <T> (tasks: CallbackTask[], cb: GenericCallback): void {
  let current = 0
  const results = []
  let isSync = true

  function done (err: Error) {
    function end () {
      if (cb) cb(err, results)
    }
    if (isSync) process.nextTick(end)
    else end()
  }

  function each (err: Error, result?: any) {
    results.push(result)
    if (++current >= tasks.length || err) done(err)
    else tasks[current](each)
  }

  if (tasks.length > 0) tasks[0](each)
  else done(null)

  isSync = false
}

export const fetch = (url: string, params: { headers?: Kv; cookie?: string; jar?: any; }) => {
  const { cookie, ...rest } = params
  const opts = { url, ...rest }
  if (cookie) {
    const j = request.jaanyr()
    cookie.split(';').forEach((val: string) => {
      j.setCookie(request.cookie(val.trim()), url)
    })
    opts.jar = j
  }
  return request(opts)
}


const existSync = (t: string): boolean => {
  try {
    fs.accessSync(t)
    return true
  } catch (_) {
    return false
  }
}

export const loadConfig = <T> (file: string = 'config.json'): T => {
  const f = p.resolve(file)
  if (!existSync(f)) {
    throw new Error('Invalid config file (' + f + ')')
  }
  const json = fs.readFileSync(file, 'utf8')
  return JSON.parse(json) as T
}
