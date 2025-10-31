'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';

const QRCodeWithLogo = ({
  value,
  logoUrl,
  size = 300,
  onQRCodeReady,
  backgroundColor = '#FFFFFF',
  dotsColor = '#000000'
}) => {
  const ref = useRef(null);
  const [qrCode, setQrCode] = useState(null);

  useEffect(() => {
    if (!value) return;

    const qrCodeInstance = new QRCodeStyling({
      width: size,
      height: size,
      type: 'svg',
      data: value,
      image: logoUrl,
      dotsOptions: {
        color: dotsColor,
        type: 'rounded'
      },
      backgroundOptions: {
        color: backgroundColor,
      },
      imageOptions: {
        crossOrigin: 'anonymous',
        margin: 10,
        imageSize: 0.3,
        hideBackgroundDots: true
      },
      cornersSquareOptions: {
        type: 'extra-rounded',
        color: dotsColor
      },
      cornersDotOptions: {
        type: 'dot',
        color: dotsColor
      }
    });

    setQrCode(qrCodeInstance);

    if (ref.current) {
      ref.current.innerHTML = '';
      qrCodeInstance.append(ref.current);
    }

    if (onQRCodeReady) {
      onQRCodeReady(qrCodeInstance);
    }

    return () => {
      if (ref.current) {
        ref.current.innerHTML = '';
      }
    };
  }, [value, logoUrl, size, backgroundColor, dotsColor]);

  return <div ref={ref} className="qr-code-container" />;
};

export default QRCodeWithLogo;