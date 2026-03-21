// src/lib/transloadit.ts
import crypto from 'crypto'

export function createTransloaditParams(fileType: 'image' | 'video') {
  const steps =
    fileType === 'image'
      ? {
          ':original': { robot: '/upload/handle' },
          optimized: {
            use: ':original',
            robot: '/image/resize',
            result: true,
            width: 2048,
            height: 2048,
            resize_strategy: 'fit',
            imagemagick_stack: 'v3.0.0',
          },
        }
      : {
          ':original': { robot: '/upload/handle', result: true },
        }

  const params = {
    auth: {
      key: process.env.TRANSLOADIT_KEY!,
      expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    },
    steps,
  }

  const paramsString = JSON.stringify(params)
  const signature = crypto
    .createHmac('sha384', process.env.TRANSLOADIT_SECRET!)
    .update(paramsString)
    .digest('hex')

  return { params, signature: `sha384:${signature}` }
}
