declare module 'qr-code-styling' {
  export interface Options {
    width?: number;
    height?: number;
    type?: 'canvas' | 'svg';
    data?: string;
    image?: string;
    margin?: number;
    qrOptions?: {
      typeNumber?: number;
      mode?: 'Numeric' | 'Alphanumeric' | 'Byte' | 'Kanji';
      errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    };
    imageOptions?: {
      hideBackgroundDots?: boolean;
      imageSize?: number;
      margin?: number;
      crossOrigin?: string;
    };
    dotsOptions?: {
      color?: string;
      type?: 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'square' | 'extra-rounded';
    };
    backgroundOptions?: {
      color?: string;
    };
    cornersSquareOptions?: {
      color?: string;
      type?: 'dot' | 'square' | 'extra-rounded';
    };
    cornersDotOptions?: {
      color?: string;
      type?: 'dot' | 'square';
    };
  }

  export default class QRCodeStyling {
    constructor(options?: Options);
    append(container: HTMLElement): void;
    download(options?: {
      name?: string;
      extension?: 'png' | 'jpeg' | 'webp' | 'svg';
    }): Promise<Blob>;
    update(options?: Options): void;
  }
}