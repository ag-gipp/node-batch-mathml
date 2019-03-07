import { ProcessFile } from './converter';

const log = (msg:string) => console.log(`Worker ${process.pid}: ${msg}`);

process.on('message', (msg) => {
  log(`Receiving file ${msg.inFile}.`);
  ProcessFile(msg.inFile, msg.outFile).then(() => {
      if (process.send) {
        log(`Returning file ${msg.inFile}.`);
        process.send(msg.inFile);
      }
    },
  );
});

process.on('beforeExit',()=>log('Terminating.'));
log('Started.');
