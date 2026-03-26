/** esbuild define으로 빌드 시 주입 — package.json version */
declare const __APP_VERSION__: string

// 타입 선언이 없는 외부 모듈
declare module "pdfmake" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value: any;
  export default value;
}
declare module "pdfmake/build/vfs_fonts.js" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value: any;
  export default value;
}
