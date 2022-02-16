import { JsonSpec } from './json-spec'
import { AreaUpdate, Bootstrapper } from './bootstrapper'

export { Bootstrapper, AreaUpdate } from './bootstrapper'
export { EVENT_NAMES } from './bootstrapper/utils'

interface BaseProps {
  instanceIdentifier: string
  OSSPIM_ACCESS_TOKEN_ID: string
  OSSPIM_ACCESS_TOKEN_SECRET: string
}

interface BootstrapperProps extends BaseProps {
  jsonSpec: JsonSpec
}

interface CreateSpecProps extends BaseProps {
  onUpdate: (t: AreaUpdate) => any
}

export async function createJSONSpec(
  props: CreateSpecProps
): Promise<JsonSpec> {
  const bootstrapper = new Bootstrapper()

  bootstrapper.setAccessToken(
    props.OSSPIM_ACCESS_TOKEN_ID,
    props.OSSPIM_ACCESS_TOKEN_SECRET
  )

  bootstrapper.setInstanceIdentifier(props.instanceIdentifier)

  return bootstrapper.createSpec({
    shapes: true,
    grids: true,
    items: true,
    languages: true,
    priceVariants: true,
    vatTypes: true,
    subscriptionPlans: true,
    topicMaps: true,
    stockLocations: true,
    onUpdate: props.onUpdate,
  })
}

export function bootstrapInstance(props: BootstrapperProps): Bootstrapper {
  const bootstrapper = new Bootstrapper()

  bootstrapper.setAccessToken(
    props.OSSPIM_ACCESS_TOKEN_ID,
    props.OSSPIM_ACCESS_TOKEN_SECRET
  )

  bootstrapper.setSpec(props.jsonSpec)
  bootstrapper.setInstanceIdentifier(props.instanceIdentifier)

  // Allow for event listeners to be registered
  setTimeout(() => {
    bootstrapper.start()
  }, 5)

  return bootstrapper
}
