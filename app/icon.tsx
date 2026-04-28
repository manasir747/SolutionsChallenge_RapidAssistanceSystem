import { ImageResponse } from 'next/og';
import fs from 'fs';
import path from 'path';

export const size = {
  width: 512,
  height: 512,
};
export const contentType = 'image/png';

export default function Icon() {
  // Read the logo from public folder
  const logoPath = path.join(process.cwd(), 'public', 'logo.png');
  const logoData = fs.readFileSync(logoPath);
  const logoBase64 = logoData.toString('base64');
  const logoSrc = `data:image/png;base64,${logoBase64}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f9f9f5', // Approximate cream color of the image
          borderRadius: '50%',
          overflow: 'hidden',
        }}
      >
        {/* Zoom into the image to crop out empty space, fitting the logo perfectly */}
        <img
          src={logoSrc}
          alt=""
          style={{
            width: '150%',
            height: '150%',
            objectFit: 'cover',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
