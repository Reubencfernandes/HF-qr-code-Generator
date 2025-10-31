declare module 'html-to-image' {
  export interface Options {
    quality?: number;
    backgroundColor?: string;
    pixelRatio?: number;
    style?: Partial<CSSStyleDeclaration>;
    filter?: (node: HTMLElement) => boolean;
    width?: number;
    height?: number;
  }

  export function toPng(node: HTMLElement, options?: Options): Promise<string>;
  export function toJpeg(node: HTMLElement, options?: Options): Promise<string>;
  export function toBlob(node: HTMLElement, options?: Options): Promise<Blob>;
  export function toSvg(node: HTMLElement, options?: Options): Promise<string>;
  export function toCanvas(node: HTMLElement, options?: Options): Promise<HTMLCanvasElement>;
}