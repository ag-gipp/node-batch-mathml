import { ProcessFile } from './converter';

const log = (msg:string) => console.log(`Worker ${process.pid}: ${msg}`);

process.on('message', (msg) => {
  log('Receiving work.');
  ProcessFile(msg.inFile, msg.outFile).then(() => {
      if (process.send) {
        log('Handing back work.');
        process.send('done');
      }
    },
  );
});

process.on('beforeExit',()=>log('Terminating.'));
log('Started.');
