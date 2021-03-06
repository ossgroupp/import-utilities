import { config } from 'dotenv'
config()

import { readFile } from 'fs/promises'
import { resolve } from 'path'
// import Progress from 'cli-progress'

import { Bootstrapper, EVENT_NAMES, Status } from './bootstrapper'
import { JSONImages, JSONParagraphCollection, JSONProduct } from './json-spec'

async function bootstrap() {
  try {
    const instanceIdentifier = 'hkn-files-demo'
    // const jsonSpec = JSON.parse(
    //   await readFile(
    //     resolve(__dirname, '../../json-spec/photofinder.json'),
    //     'utf-8'
    //   )
    // )

    if (
      !process.env.OSSPIM_ACCESS_TOKEN_ID ||
      !process.env.OSSPIM_ACCESS_TOKEN_SECRET
    ) {
      throw new Error(
        'OSSPIM_ACCESS_TOKEN_ID and OSSPIM_ACCESS_TOKEN_SECRET must be set'
      )
    }

    console.log(`✨ Bootstrapping ${instanceIdentifier} ✨`)

    const bootstrapper = new Bootstrapper()

    bootstrapper.setInstanceIdentifier(instanceIdentifier)

    bootstrapper.setAccessToken(
      process.env.OSSPIM_ACCESS_TOKEN_ID,
      process.env.OSSPIM_ACCESS_TOKEN_SECRET
    )

    bootstrapper.setSpec({
      shapes: [
        {
          identifier: 'example-files',
          name: 'Example files',
          type: 'document',
          components: [
            {
              id: 'some-files',
              name: 'Some files',
              type: 'files',
            },
          ],
        },
      ],
      items: [
        {
          name: 'files',
          catalogPath: '/files',
          shape: 'example-files',
          components: {
            files: [
              {
                src:
                  'https://media.ossgroup.com/hkn-files-demo/22/2/3/1/efaktura.pdf',
                title: '',
              },
            ],
          },
        },
      ],
    })

    // const ProgressBar = new Progress.MultiBar({
    //   clearOnComplete: false,
    //   hideCursor: false,
    //   autopadding: true,
    //   format: '{bar} | {percentage}% | {area} | ETA: {eta}s',
    // })

    // function createProgress(area: string) {
    //   return ProgressBar.create(1, 0, {
    //     area,
    //   })
    // }

    // const ProgressLanguages = createProgress('Languages')
    // const ProgressPriceVariants = createProgress('Price variants')
    // const ProgressVatTypes = createProgress('Vat types')
    // const ProgressShapes = createProgress('Shapes')
    // const ProgressTopics = createProgress('Topics')
    // const ProgressGrids = createProgress('Grids')
    // const ProgressItems = createProgress('Items')
    // const ProgressMedia = createProgress('Media uploads')

    // bootstrapper.on(EVENT_NAMES.STATUS_UPDATE, function (status: Status) {
    //   ProgressMedia.update(status.media.progress)
    //   ProgressLanguages.update(status.languages.progress)
    //   ProgressPriceVariants.update(status.priceVariants.progress)
    //   ProgressVatTypes.update(status.vatTypes.progress)
    //   ProgressShapes.update(status.shapes.progress)
    //   ProgressTopics.update(status.topicMaps.progress)
    //   ProgressGrids.update(status.grids.progress)
    //   ProgressItems.update(status.items.progress)
    // })

    // bootstrapper.on(EVENT_NAMES.SHAPES_DONE, ProgressShapes.stop)
    // bootstrapper.on(EVENT_NAMES.PRICE_VARIANTS_DONE, ProgressPriceVariants.stop)
    // bootstrapper.on(EVENT_NAMES.LANGUAGES_DONE, ProgressLanguages.stop)
    // bootstrapper.on(EVENT_NAMES.VAT_TYPES_DONE, ProgressVatTypes.stop)
    // bootstrapper.on(EVENT_NAMES.TOPICS_DONE, ProgressTopics.stop)
    // bootstrapper.on(EVENT_NAMES.ITEMS_DONE, ProgressItems.stop)
    // bootstrapper.on(EVENT_NAMES.GRIDS_DONE, ProgressGrids.stop)

    let itemProgress = -1
    bootstrapper.on(EVENT_NAMES.STATUS_UPDATE, (a) => {
      const i = a.items.progress
      if (i !== itemProgress) {
        itemProgress = i
        console.log(new Date(), itemProgress)
      }
    })

    bootstrapper.on(EVENT_NAMES.ERROR, ({ error }) => {
      console.log(error)
    })

    // bootstrapper.config.itemTopics = 'amend'
    // bootstrapper.config.logLevel = 'verbose'
    // bootstrapper.config.multilingual = true

    bootstrapper.once(EVENT_NAMES.DONE, function ({ duration }) {
      // ProgressBar.stop()
      console.log(
        `✓ Done bootstrapping ${instanceIdentifier}. Duration: ${duration}`
      )
      process.exit(0)
    })

    bootstrapper.start()
  } catch (e) {
    console.log(e)
  }
}

bootstrap()
