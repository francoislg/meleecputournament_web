const args = process.argv.slice(2);

export const hasFlag = (flag: string) => args.indexOf(flag) !== -1;
export const IS_USING_REAL_SWITCH = hasFlag("--realswitch");