import { Image } from './screencapture';
//import robot from 'robotjs';
import { capture } from './states';
// @ts-ignore
import { lookup, kill } from 'ps-node';
import { windowManager } from 'node-window-manager';
import { spawn } from 'child_process';
import { SmashUltimateControllers } from './smashultimatecontroller';
import { writeFile } from 'fs/promises';
import { readWindow, WINDOW_CONFIG_FILE } from './constants';

const YUZU_PATH = 'C:\\Users\\Fanfo\\AppData\\Local\\yuzu\\yuzu-windows-msvc\\yuzu.exe';
const SMASH_PATH = 'D:\\Yuzu\\Super Smash Bros Ultimate [01006A800016E000][v0].nsp';

const NB_FRAME_FREEZE_DETECTION = 5;

export class YuzuCheck {
  private ticks: number = 0;
  private previousImages: Image[] = [];
  private yuzuProcess: number | null = null;

  constructor(private ult: SmashUltimateControllers) {}

  async boot() {
    await this.startYuzuIfNotStarted();
    await this.setYuzuWindowBounds();
  }

  async tick() {
    this.ticks = ++this.ticks % 100;

    await this.startYuzuIfNotStarted();
    await this.setYuzuWindowBounds();

    if (this.ticks % 3 === 1) {
      if (this.previousImages.length >= NB_FRAME_FREEZE_DETECTION) {
        this.previousImages.shift();
      }
      this.previousImages.push(await capture());
  
      if (this.previousImages.length >= NB_FRAME_FREEZE_DETECTION) {
        const firstImage = this.previousImages[0];
        const areAllSimilar = this.previousImages.every((im) => im.isMatching(firstImage));
        if (areAllSimilar) {
          console.log('FREEZE DETECTED, RESTARTING');
          await this.restartYuzu();
        }
      }
    }
  }

  async startYuzuIfNotStarted() {
    this.yuzuProcess = await this.getCurrentYuzuIfExist();
    if (!this.yuzuProcess) {
      console.log('Starting Yuzu instance.');
      const spawned = spawn(YUZU_PATH, [SMASH_PATH], { detached: true, stdio: 'ignore' });
      spawned.unref();

      console.log('Waiting 60 seconds for Yuzu to boot the game');
      await waitFor(60000);
      console.log('Assuming game is in the cinematic, starting the game!');
      await this.ult.startTheGame();

      this.yuzuProcess = spawned.pid;
    }
  }

  async setYuzuWindowBounds() {
    if (this.yuzuProcess) {
      const windows = windowManager.getWindows();

      const yuzuWindows = windows.filter(
        (w) =>
          w.processId == this.yuzuProcess &&
          w.isVisible &&
          w.isWindow &&
          w.getTitle().includes('Super Smash Bros. Ultimate')
      );

      const window = yuzuWindows[0];

      if (window) {
        // removing this because it steals focus
        //window.bringToTop();
        const WINDOW_OFFSET_SOMEHOW = 7;
        const YUZU_HEADER = 52;
        const initial = await readWindow();
        const bounds = window.getBounds();

        const WIDTH = 1936;
        const HEIGHT = 1160;
        if (bounds.width !== WIDTH || bounds.height !== HEIGHT) {
          window.setBounds({
            ...bounds,
            width: WIDTH,
            height: HEIGHT,
          });
        }

        const x = bounds.x! + WINDOW_OFFSET_SOMEHOW;
        const y = bounds.y! + YUZU_HEADER;
        if (initial.x !== x || initial.y !== y) {
          await writeFile(
            WINDOW_CONFIG_FILE,
            JSON.stringify({
              x,
              y,
            }),
            'utf-8'
          );
          const image = await capture();
          await image.save('bloup.png');
        }
      }
    }
  }

  async getCurrentYuzuIfExist() {
    return new Promise<number | null>((resolve) => {
      // Improve this one day :shrug:
      lookup({}, (err: any, resultList: any) => {
        if (err) {
          console.error(err);
          resolve(null);
        }

        const yuzus = resultList.filter((r: any) => r.command.indexOf('yuzu') !== -1);
        console.log(
          'yuzu instances',
          yuzus.map((y: any) => y.pid)
        );

        if (yuzus.length > 1) {
          this.tryToKill(yuzus[1].pid);
        }

        if (yuzus[0]?.pid) {
          resolve(parseInt(yuzus[0]?.pid));
        } else {
          resolve(null);
        }
      });
    });
  }

  async stopYuzu() {
    if (this.yuzuProcess) {
      await this.tryToKill(this.yuzuProcess);
    }
  }

  async restartYuzu() {
    await this.stopYuzu();
    await this.startYuzuIfNotStarted();
  }

  async tryToKill(pid: string | number) {
    return new Promise<void>((resolve) => {
      try {
        kill(`${pid}`, 'SIGKILL', (err: string) => {
          err && console.error(err);
          resolve();
        });
      } catch (ex) {
        console.error('Could not kill Yuzu', ex);
        resolve();
      }
    });
  }
}

const waitFor = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
