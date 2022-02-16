import { config } from 'dotenv'
config()

import { writeFileSync } from 'fs'
import { resolve } from 'path'

import { Bootstrapper, EVENT_NAMES } from './index'

async function createSpec() {
  const instanceIdentifier = 'furniture'

  if (
    !process.env.OSSPIM_ACCESS_TOKEN_ID ||
    !process.env.OSSPIM_ACCESS_TOKEN_SECRET
  ) {
    throw new Error(
      'OSSPIM_ACCESS_TOKEN_ID and OSSPIM_ACCESS_TOKEN_SECRET must be set'
    )
  }

  console.log(`✨ Creating spec for ${instanceIdentifier} ✨`)

  const bootstrapper = new Bootstrapper()

  bootstrapper.setAccessToken(
    process.env.OSSPIM_ACCESS_TOKEN_ID,
    process.env.OSSPIM_ACCESS_TOKEN_SECRET
  )

  bootstrapper.setInstanceIdentifier(instanceIdentifier)

  bootstrapper.on(EVENT_NAMES.ERROR, ({ error }) => {
    console.log(error)
  })

  const spec = await bootstrapper.createSpec({
    language: 'en',
    shapes: true,
    grids: true,
    items: true,
    languages: true,
    priceVariants: true,
    stockLocations: true,
    vatTypes: true,
    subscriptionPlans: true,
    topicMaps: true,
    onUpdate: (u) => console.log(JSON.stringify(u, null, 1)),
  })

  writeFileSync(
    resolve(__dirname, `../../json-spec/${instanceIdentifier}.json`),
    JSON.stringify(spec, null, 2),
    'utf-8'
  )

  console.log(`✨ Spec created (${instanceIdentifier}.json) ✨`)
}

createSpec()
