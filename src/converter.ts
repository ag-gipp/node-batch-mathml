import { createInterface } from 'readline';
import path = require( 'path');

const BB = require('bluebird');
const fs = BB.promisifyAll(require('fs'));
const mathml: any = require('mathml');
const PQueue = require('p-queue');
const MathMatcher = /(<math(?:.*)<\/math>)/;


const minimize = (mml: string) => mathml(mml).toMinimalPmml().toString();

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

export const ProcessFile = (inFile: string, outFolder: string, base?: string) => {
  if (!base) {
    base = path.dirname(inFile);
  }
  const queue = new PQueue({ concurrency: 1 });
  const lineReader = createInterface({
    input: fs.createReadStream(inFile),
  });
  const outPath = path.dirname(path.join(outFolder, path.relative(base, inFile)));
  if (!fs.existsSync(outPath)) {
    fs.mkdirSync(outPath);
  }
  const outFile = path.join(outPath, '/', path.basename(inFile));
  const outStream = fs.createWriteStream(outFile);

  lineReader.on('line', (line) => {
    queue.add(() => processLine(line)
      .then((mini) => outStream.write(mini + '\n'))
      .catch((err) => null), //empty line
    );

  });
  lineReader.on('close', () => {
    console.log(queue.pending);
    queue.onIdle().then(
      () =>outStream.end('')
    );
  });

  return queue;

};

export const Converter = (inFolder: string, outFolder: string) => {
  const queue = new PQueue({ concurrency: 1 });
  fs.readdirAsync(inFolder)
    .filter((name: string) => fs.statSync(inFolder + '/' + name).isFile())
    .map((fn: string) => queue.add(() => ProcessFile(path.join(inFolder,fn), outFolder)));
  return queue.onIdle();

};
