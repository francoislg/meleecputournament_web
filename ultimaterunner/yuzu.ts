import { Image } from './screencapture';
//import robot from 'robotjs';
import { capture } from './states';
// @ts-ignore
import {lookup, kill} from "ps-node";
import { spawn } from 'child_process';
import { SmashUltimateControllers } from './smashultimatecontroller';

const YUZU_PATH = "C:\\Users\\Fanfo\\AppData\\Local\\yuzu\\yuzu-windows-msvc\\yuzu.exe";
const SMASH_PATH = "D:\\Yuzu\\Super Smash Bros Ultimate [01006A800016E000][v0].nsp";

const NB_FRAME_FREEZE_DETECTION = 3;

export class YuzuCheck {
  private ticks: number = 0;
  private previousImages: Image[] = [];
  private yuzuProcess: number | null = null;

  constructor(private ult: SmashUltimateControllers) {}

  async boot() {
    await this.startYuzuIfNotStarted();
  }

  async tick() {
    this.ticks = ++this.ticks % 100;
    if (this.ticks % 5 === 1) {
      this.startYuzuIfNotStarted();

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
    const instance = await this.getCurrentYuzuIfExist();
    if (instance) {
      this.yuzuProcess = instance;
    } else {
        console.log("Starting Yuzu instance.");
        const spawned = spawn(YUZU_PATH, [SMASH_PATH], { detached: true });
        spawned.unref();

        console.log("Waiting 60 seconds for Yuzu to boot");
        await waitFor(60000);
        console.log("Assuming game is in the cinematic, starting the game!");
        await this.ult.startTheGame();

        this.yuzuProcess = spawned.pid;
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

            const yuzus = resultList.filter((r: any) => r.command.indexOf("yuzu") !== -1);
            console.log("yuzu instances", yuzus.map((y: any) => y.pid));

            if (yuzus.length > 1) {
              this.tryToKill(yuzus[1].pid);
            }

            resolve(yuzus[0]?.pid || null);
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
        console.error("Could not kill Yuzu", ex);
        resolve();
      }
    });
  }
}

const waitFor = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
