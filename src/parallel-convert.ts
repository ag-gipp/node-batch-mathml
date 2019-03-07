import path = require( 'path');
import { ChildProcess } from 'child_process';

const BB = require('bluebird');
const fs = BB.promisifyAll(require('fs'));
const PQueue = require('p-queue');
const free: { [key: string]: boolean; } = {};
const cp = require('child_process');
const processes: ChildProcess[] = [];
const pool: ChildProcess[] = [];
let converted = 0;

const getProcess = () => {
  if(pool.length){
    // @ts-ignore
    const p:ChildProcess = pool.pop();
    console.log(`Receiving worker ${p.pid} from pool. Pool size ${pool.length}.`);
    return p;
  } else {
    const p = cp.fork(path.join(__dirname, 'worker.js'));
    processes.push(p);
    console.log(`Started new worker ${p.pid}. Total workers ${processes.length}.`);
    p.on('message', () => {
      console.log(`Giving back worker ${p.pid} to pool. Pool size ${pool.length}.`);
      pool.push(p);});
    return p;
  }
};

const terminateSubProcesses = () => {
  console.log('Shutdown workers.');
  processes.forEach(p=>p.disconnect());
};

const RemoteProcessFile = (inFile: string, outFile: string) => {
  return new Promise((resolve) => {
    const p = getProcess();
    p.send({ inFile, outFile });
    function onMessage(){
      converted++;
      console.log(`Converted ${converted} files. Last file was ${inFile}.`);
      p.removeListener('message', onMessage);
      resolve();
    }
    p.on('message', onMessage);
  });
};


const ProcessFolder = (inFolder: string, outFolder: string, queue = new PQueue({
  concurrency: 60,
})) => {
  if (!fs.existsSync(outFolder)) {
    fs.mkdirSync(outFolder);
  }
  return fs.readdirAsync(inFolder)
    .map((fn: string) => queue.add(() => {
      const stats = fs.statSync(path.join(inFolder, fn));
      if (stats.isFile()) {
        if (path.extname(fn) === '.ann') {
          const inFile = path.join(inFolder, fn);
          const outFile = path.join(outFolder, fn);
          const fileP = RemoteProcessFile(inFile, outFile);
          return fileP.then(() => console.log(`Remaining: ${queue.pending}`));
        }
      } else if (stats.isDirectory()) {
        throw new Error('not supported');
      }
      console.log(`Conversion que length ${queue.pending}`);
    })).then(
      () => {
        terminateSubProcesses();
        return queue.onIdle();
      },
    );
};

if (process.argv.length == 4) {
  ProcessFolder(process.argv[2], process.argv[3]).then(() => console.log('All done'));
}


