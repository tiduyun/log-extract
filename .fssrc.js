// vim: set ft=javascript fdm=marker et ff=unix tw=80 sw=2:
// author: allex_wang <http://iallex.com>

import path from 'path'

import { version, name, author, license, description, dependencies } from './package.json'

const banner = (name, short = false) => {
  let s
  if (short) {
    s = `/*! ${name} v${version} | ${license} licensed | ${author.name || author} */`
  } else {
    s = `/**
 * ${name} v${version} - ${description}
 *
 * @author ${author}
 * Released under the ${license} license.
 */`
  }
  return s
}

const resolve = p => path.resolve(__dirname, '.', p)

const plugins = [
  'resolve',
  'typescript'
]

export default {
  destDir: resolve('dist'),
  dependencies: {
    ...dependencies
  },
  plugins: {
    minify: {
      output: {
        beautify: true
      }
    }
  },
  entry: [
    {
      input: resolve('index.ts'),
      plugins,
      output: [
        { format: 'cjs', file: 'index.js', banner: banner(name) }
      ]
    },
    {
      input: resolve('get-weekly.ts'),
      plugins,
      output: [
        { format: 'cjs', file: 'get-weekly.js', banner: banner(name) }
      ]
    }
  ]
}
