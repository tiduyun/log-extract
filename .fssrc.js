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
  'typescript'
]

export default {
  destDir: './dist',
  dependencies: {
    ...dependencies
  },
  plugins: {
    minify: {
      output: {
        beautify: false
      }
    }
  },
  entry: [
    {
      input: resolve('lib/index.ts'),
      plugins,
      output: [
        { file: 'index.js', format: 'cjs', banner: banner(name) }
      ]
    },
    {
      input: resolve('lib/cli.ts'),
      plugins,
      output: [
        { file: 'cli.js', format: 'cjs', banner: banner(name) }
      ]
    },
    {
      input: resolve('lib/get-weekly.ts'),
      plugins,
      output: [
        { file: 'get-weekly.js', format: 'cjs', banner: banner(name) }
      ]
    },
  ]
}
