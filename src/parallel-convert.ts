import path = require( 'path');
import { ProcessFile } from './converter';

const BB = require('bluebird');
const fs = BB.promisifyAll(require('fs'));
const PQueue = require('p-queue');
const free: { [key: string]: boolean; } = {};

let converted = 0;

const cluster = require('cluster');
const numCPUs = 1;//require('os').cpus().length;

const startup = () => new Promise((resolve) => {
  if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);
    // Fork workers.
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }
    for (const id in cluster.workers) {
      cluster.workers[id].on('message', () => free[id] = true);
      cluster.workers[id].on('online', () => {
        console.log(`worker ${id} is online`);
        free[id] = true;
      });
    }
    cluster.on('exit', (worker: { process: { pid: any; }; }) => {
      console.log(`worker ${worker.process.pid} died`);
    });
    cluster.on('online', () => {
      console.log(`cluster is online`);
      resolve();
    });
  }
});

const shutdown = () => new Promise((resolve) => {
  if (cluster.isMaster) {
    console.log(`Master ${process.pid} is shutting down`);
    // Fork workers.
   for (const id in cluster.workers) {
     cluster.workers[id].kill();
    }
    cluster.on('exit', () => {
      console.log(`cluster is offline`);
      resolve();
    });
  }
});


export const RemoteProcessFile = (inFile: string, outFile: string) => {
  return new Promise((resolve) => {
    console.log('Sending job to worker 1');
    cluster.workers['1'].send({ inFile, outFile });
    cluster.workers['1'].on('message', () => {
      console.log('Got work from worker 1');
      resolve();
    });
  });
};


export const ProcessFolder = (inFolder: string, outFolder: string, queue = new PQueue({
  concurrency: 100
})) => startup().then(() => {
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
        throw new Error("not supported");
      }
      console.log(`Conversion que length ${queue.pending}`);
    })).then(() => queue.onIdle()).then(()=>shutdown());
});

if (cluster.isWorker) {
  process.on('message', (msg) => {
    console.log('Receiving work');
    ProcessFile(msg.inFile, msg.outFile).then(() => {
        if (process.send) {
          console.log('Handing back work');
          process.send('done');
        }
      },
    );
  });
}

if (process.argv.length == 4) {
  ProcessFolder(process.argv[2], process.argv[3]).then(() => console.log('All done'));
}

