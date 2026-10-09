import { MetadataRoute } from 'next'

/**
 * 🛡️ NATIVE SHARE TARGET ENGINE
 * Allows DreamVerse to appear in the system share menu of mobile/desktop OS.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DreamVerse',
    short_name: 'DreamVerse',
    description: 'Enter the DreamVerse Social Universe',
    start_url: '/',
    display: 'standalone',
    background_color: '#1627c4',
    theme_color: '#7e1181',
    icons: [
      {
        src: 'https://i.imgur.com/dzf8jGT.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'https://i.imgur.com/dzf8jGT.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
   share_target: {
  action: "/feed",
  method: "POST",
  enctype: "multipart/form-data",
  params: {
    title: "title",
    text: "text",
    url: "url",
  },
}
  }
}
