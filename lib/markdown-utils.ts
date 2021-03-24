export const cleanupMarkdown = (str: string): string => {
  str = str.replace(/\\([#[\]()-.])/g, '$1')

  let l = str.length
  let i = 0
  let isList = false
  const lines = str.split('\n')
  const rs = []

  while (i < l) {
    let line = lines[i++]

    if (line === '---' || (isList && !line)) {
      continue
    }

    // transfer chinese dot to lower
    if (/^(\d+)、/.test(line)) {
      line = line.replace(/^(\d+)、\s*/, '$1. ')
    }

    // normalize digit list
    isList = /^\d+\./.test(line)
    if (isList) {
      const cursor = line.indexOf('.') + 1
      if (line.charAt(cursor) !== ' ') {
        line = line.substring(0, cursor) + ' ' + line.substring(cursor)
      } else {
        line = line.replace(/\s{2,}/g, ' ')
      }
    }

    rs.push(line)
  }

  return rs.join('\n')
}

