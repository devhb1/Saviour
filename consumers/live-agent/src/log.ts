export function log(line: string) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${line}`);
}

export const logHeader = (s: string) => log(`── ${s}`);
export const logBlock = (s: string) => log(`BLOCK  ${s}`);
export const logWarn = (s: string) => log(`WARN   ${s}`);
export const logMiss = (s: string) => log(`MISS   ${s}`);
export const logOk = (s: string) => log(`OK     ${s}`);
