import { createWriteStream } from 'fs'
import { Printer } from './printer'

let logFile = './out.log'

const setLogFile = (path: string) => {
  logFile = path
}

interface ILogger {
  log (...args: any[]): void;
}

const instances: Record<string, ILogger> = Object.create(null)

const getLogger = (name: string = 'default') => {
  if (instances[name]) {
    return instances[name]
  }
  const l = new Printer({ fd: createWriteStream(logFile) });
  const logger = {
    log (...args) {
      l.write(args.join(' ') + '\n')
    }
  }
  return (instances[name] = logger)
}

export default getLogger()

export { getLogger, setLogFile }
