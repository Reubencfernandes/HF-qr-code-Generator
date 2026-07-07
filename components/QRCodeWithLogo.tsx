'use client';

import React, { useEffect, useRef } from 'react';
import QRCodeStyling, {
  Options,
  DotType,
  CornerSquareType,
  CornerDotType,
  ErrorCorrectionLevel,
} from 'qr-code-styling';

interface QRCodeWithLogoProps {
  value: string;
  logoUrl?: string;
  size?: number;
  backgroundColor?: string;
  dotsColor?: string;
  cornersSquareColor?: string;
  cornersDotColor?: string;
  dotsType?: DotType;
  cornersSquareType?: CornerSquareType;
  cornersDotType?: CornerDotType;
  errorCorrectionLevel?: ErrorCorrectionLevel;
  imageSize?: number;
}

const QRCodeWithLogo: React.FC<QRCodeWithLogoProps> = ({
  value,
  logoUrl,
  size = 300,
  backgroundColor = '#FFFFFF',
  dotsColor = '#000000',
  cornersSquareColor,
  cornersDotColor,
  dotsType = 'rounded',
  cornersSquareType = 'extra-rounded',
  cornersDotType = 'dot',
  errorCorrectionLevel = 'M',
  imageSize = 0.3,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value || !ref.current) return;

    const options: Options = {
      width: size,
      height: size,
      type: 'svg',
      data: value,
      margin: 8,
      qrOptions: {
        errorCorrectionLevel,
      },
      dotsOptions: {
        color: dotsColor,
        type: dotsType,
      },
      backgroundOptions: {
        color: backgroundColor,
      },
      cornersSquareOptions: {
        type: cornersSquareType,
        color: cornersSquareColor ?? dotsColor,
      },
      cornersDotOptions: {
        type: cornersDotType,
        color: cornersDotColor ?? dotsColor,
      },
    };

    if (logoUrl) {
      options.image = logoUrl;
      options.imageOptions = {
        crossOrigin: 'anonymous',
        margin: 10,
        imageSize,
        hideBackgroundDots: true,
      };
    }

    // Recreate each render: update() does not reliably clear a removed image,
    // and prop changes are infrequent enough that teardown cost is negligible.
    const qrCodeInstance = new QRCodeStyling(options);
    const container = ref.current;
    container.innerHTML = '';
    qrCodeInstance.append(container);

    return () => {
      container.innerHTML = '';
    };
  }, [
    value,
    logoUrl,
    size,
    backgroundColor,
    dotsColor,
    cornersSquareColor,
    cornersDotColor,
    dotsType,
    cornersSquareType,
    cornersDotType,
    errorCorrectionLevel,
    imageSize,
  ]);

  return <div ref={ref} className="qr-code-container" />;
};

export default QRCodeWithLogo;
