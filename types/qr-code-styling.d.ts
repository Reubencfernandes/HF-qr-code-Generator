declare module 'qr-code-styling' {
  export type DotType = 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'square' | 'extra-rounded';
  export type CornerSquareType = 'dot' | 'square' | 'extra-rounded';
  export type CornerDotType = 'dot' | 'square';
  export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

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
      errorCorrectionLevel?: ErrorCorrectionLevel;
    };
    imageOptions?: {
      hideBackgroundDots?: boolean;
      imageSize?: number;
      margin?: number;
      crossOrigin?: string;
    };
    dotsOptions?: {
      color?: string;
      type?: DotType;
    };
    backgroundOptions?: {
      color?: string;
    };
    cornersSquareOptions?: {
      color?: string;
      type?: CornerSquareType;
    };
    cornersDotOptions?: {
      color?: string;
      type?: CornerDotType;
    };
  }

  export default class QRCodeStyling {
    constructor(options?: Options);
    append(container: HTMLElement): void;
    download(options?: {
      name?: string;
      extension?: 'png' | 'jpeg' | 'webp' | 'svg';
    }): Promise<void>;
    getRawData(extension?: 'png' | 'jpeg' | 'webp' | 'svg'): Promise<Blob | null>;
    update(options?: Options): void;
  }
}
