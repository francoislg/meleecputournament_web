import { config as configDotDev } from 'dotenv';
import { run } from './run';
import { setup } from './setup';
import { setInputs } from './smashultimatecontroller';

configDotDev();

const args = process.argv.slice(2);

const hasFlag = (flag: string) => args.indexOf(flag) !== -1;

const start = async () => {
  if (hasFlag('--setup')) {
    await setup();
  } else if (hasFlag('--setupinputs')) {
    await setInputs();
  } else {
    await run();
  }
};

start();
