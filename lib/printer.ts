/**
 * A simple text printer based on stream writer (with buffer cached)
 * 
 * @author Allex Wang
 */

import { Stream, Transform, TransformCallback, TransformOptions, Writable } from 'stream'

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