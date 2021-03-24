/**
 * A simple text printer based on stream writer (with buffer cached)
 * 
 * @author Allex Wang
 */

import { Stream, Transform, TransformCallback, TransformOptions, Writable } from 'stream'
import { WriteStream } from 'fs'

export interface PrinterOptions extends TransformOptions {
  fd?: Writable
}

export class Printer extends Transform {
  sb: Buffer;
  constructor (opts: PrinterOptions) {
    super(opts)
    const fd = opts.fd
    if (fd) {
      this.pipe(fd)
    }
    this.sb = Buffer.from('')
  }
  _transform (chunk: any, enc: BufferEncoding, cb: TransformCallback) {
    this.sb = Buffer.concat([this.sb, chunk])
    cb(null, chunk)
  }
  _flush (cb: TransformCallback): void {
    cb()
  }
  output (): Buffer {
    return this.sb
  }
}

/**
 * concat stream and returns as callback spec
 */
export const cos = (stream: Stream) => {
  const p = new Printer({ objectMode: true })
  stream.pipe(p)
  let finished = false
  stream.on('end', () => {
    finished = true
  })
  return (cb: TransformCallback) => {
    const f = () => {
      cb(null, p.output())
    }
    if (finished) {
      f()
    } else {
      stream.on('end', f)
    }
  }
}
