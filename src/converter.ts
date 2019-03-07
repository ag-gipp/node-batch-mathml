import { createInterface } from 'readline';
import path = require( 'path');

const BB = require('bluebird');
const fs = BB.promisifyAll(require('fs'));
const mathml: any = require('mathml');
const PQueue = require('p-queue');
const MathMatcher = /(?:<math(.*)<\/math>)/;
let converted = 0;


const minimize = (mml: string) =>
  mathml(`<math  xmlns="http://www.w3.org/1998/Math/MathML" ${mml}</math>`)
    .toMinimalPmml(['id', 'xref', 'alttext', 'display', 'class', 'kmcs-r']).toString();

function processLine(line: string) {
  return new Promise((resolve, reject) => {
    const [, math] = line.match(MathMatcher) || [, ''];
    if (math.length) {
      const mini = minimize(math);
      resolve(mini);
    } else {
      reject('no math in line');
    }
  });
}

export const ProcessFile = (inFile: string, outFile: string) => {
  return new Promise((resolve) => {
    const base = path.dirname(inFile);
    const queue = new PQueue({ concurrency: 1 });
    const lineReader = createInterface({
      input: fs.createReadStream(inFile),
    });
    const outStream = fs.createWriteStream(outFile);

    lineReader.on('line', (line) => {
      queue.add(() => processLine(line)
        .then((mini) => outStream.write(mini + '\n'))
        .catch((err) => null), //empty line
      );

    });
    lineReader.on('close', () => {
      queue.onIdle().then(
        () => {
          outStream.end('');
          converted++;
          console.log(`Converted ${converted} files. Last file was ${inFile}`);
          resolve();
        },
      );
    });
  });
};

export const ProcessFolder = (inFolder: string, outFolder: string, queue = new PQueue({ concurrency: 100 })) => {
  if (!fs.existsSync(outFolder)) {
    fs.mkdirSync(outFolder);
  }
  fs.readdirAsync(inFolder)
    .map((fn: string) => queue.add(() => {
      const stats = fs.statSync(path.join(inFolder, fn));
      if (stats.isFile()) {
        if (path.extname(fn) === '.ann') {
          const inFile = path.join(inFolder, fn);
          const outFile = path.join(outFolder, fn);
          const fileP = ProcessFile(inFile, outFile);
          return fileP.then(() => console.log(`Conversion que length ${queue.pending}`));
        }
      } else if (stats.isDirectory()) {
        ProcessFolder(path.join(inFolder, fn), path.join(outFolder, fn), queue);
      }
      console.log(`Conversion que length ${queue.pending}`);
    }));
  return queue.onIdle();

};

if (process.argv.length == 4) {
  ProcessFolder(process.argv[2], process.argv[3]);
}

