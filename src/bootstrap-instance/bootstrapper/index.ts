import gql from 'graphql-tag'
import { EventEmitter } from 'events'
import immer from 'immer'
// @ts-ignore
import Duration from 'duration'

import { JsonSpec } from '../json-spec'

export * from './utils'
import {
  EVENT_NAMES,
  AreaUpdate,
  BootstrapperContext,
  AreaWarning,
  Config,
  ApiManager,
  sleep,
  FileUploadManager,
} from './utils'
import { getExistingShapesForSpec, setShapes } from './shapes'
import { setPriceVariants, getExistingPriceVariants } from './price-variants'
import { setLanguages, getInstanceSettings } from './languages'
import { setVatTypes, getExistingVatTypes } from './vat-types'
import { getAllTopicsForSpec, removeTopicId, setTopics } from './topics'
import { setItems } from './items'
import {
  getAllCatalogItems,
  ItemsCreateSpecOptions,
} from './utils/get-all-catalog-items'
import { getAllGrids } from './utils/get-all-grids'
import { setGrids } from './grids'
import { clearCache as clearTopicCache } from './utils/get-topic-id'
import { clearCache as clearItemCache } from './utils/get-item-id'
import { setStockLocations, getExistingStockLocations } from './stock-locations'
import {
  getExistingSubscriptionPlans,
  setSubscriptionPlans,
} from './subscription-plans'
import { createAPICaller, IcallAPI, IcallAPIResult } from './utils/api'
import { setOrders } from './orders'
import { setCustomers } from './customers'

export interface ICreateSpec {
  language?: string
  shapes: boolean
  grids: boolean
  items: boolean | ItemsCreateSpecOptions
  languages: boolean
  priceVariants: boolean
  vatTypes: boolean
  subscriptionPlans: boolean
  topicMaps: boolean
  stockLocations: boolean
  onUpdate: (t: AreaUpdate) => any
}

export const createSpecDefaults: ICreateSpec = {
  shapes: true,
  grids: true,
  items: true,
  languages: true,
  priceVariants: true,
  vatTypes: true,
  subscriptionPlans: true,
  topicMaps: true,
  stockLocations: true,
  onUpdate: () => null,
}

interface AreaStatus {
  progress: number
  warnings: AreaWarning[]
}

export interface Status {
  media: AreaStatus
  shapes: AreaStatus
  grids: AreaStatus
  items: AreaStatus
  languages: AreaStatus
  customers: AreaStatus
  orders: AreaStatus
  priceVariants: AreaStatus
  vatTypes: AreaStatus
  subscriptionPlans: AreaStatus
  topicMaps: AreaStatus
  stockLocations: AreaStatus
}

function defaultAreaStatus(): AreaStatus {
  return {
    progress: 0,
    warnings: [],
  }
}

export class Bootstrapper extends EventEmitter {
  SPEC: JsonSpec | null = null

  #instanceBasics: Promise<boolean> | null = null

  PIMAPIManager: ApiManager | null = null
  catalogAPIManager: ApiManager | null = null
  ordersAPIManager: ApiManager | null = null
  instanceIdentifier = ''

  context: BootstrapperContext = {
    defaultLanguage: { code: 'en', name: 'English' },
    languages: [],
    config: {
      experimental: {},
    },
    /**
     * If it should allow for using cache when resolving
     * externalReference to item id, or topic paths to
     * topic id
     */
    useReferenceCache: false,

    /**
     * A map keeping a reference of all of the items in
     * the current spec and their (possible) item id
     */
    itemJSONCatalogPathToIDMap: new Map(),

    /**
     * A map keeping a reference of all of the items in
     * the current spec and their (possible) item versions
     */
    itemVersions: new Map(),

    instanceId: '',
    instanceIdentifier: '',

    fileUploader: new FileUploadManager(),
    uploadFileFromUrl: (url: string) =>
      this.context.fileUploader.uploadFromUrl(url),
    callPIM: () => Promise.resolve({ data: {} }),
    callCatalog: () => Promise.resolve({ data: {} }),
    callOrders: () => Promise.resolve({ data: {} }),
    emitError: (error) => {
      this.emit(EVENT_NAMES.ERROR, { error })
    },
  }

  config: Config = {
    itemTopics: 'amend',
    itemPublish: 'auto',
    logLevel: 'silent',
    experimental: {},
  }

  status: Status = {
    media: defaultAreaStatus(),
    shapes: defaultAreaStatus(),
    grids: defaultAreaStatus(),
    items: defaultAreaStatus(),
    languages: defaultAreaStatus(),
    customers: defaultAreaStatus(),
    orders: defaultAreaStatus(),
    priceVariants: defaultAreaStatus(),
    vatTypes: defaultAreaStatus(),
    subscriptionPlans: defaultAreaStatus(),
    topicMaps: defaultAreaStatus(),
    stockLocations: defaultAreaStatus(),
  }

  getStatus = () => this.status

  setAccessToken = (ACCESS_TOKEN_ID: string, ACCESS_TOKEN_SECRET: string) => {
    this.PIMAPIManager = createAPICaller({
      uri: `https://${
        process.env.OSSPIM_ENV === 'dev'
          ? 'pim-dev.osspim.digital'
          : 'pim.ossgroup.com'
      }/graphql`,
      errorNotifier: ({ error }) => {
        this.emit(EVENT_NAMES.ERROR, { error })
      },
    })

    this.PIMAPIManager.OSSPIM_ACCESS_TOKEN_ID = ACCESS_TOKEN_ID
    this.PIMAPIManager.OSSPIM_ACCESS_TOKEN_SECRET = ACCESS_TOKEN_SECRET

    this.context.callPIM = this.PIMAPIManager.push
  }

  setSpec(spec: JsonSpec) {
    this.SPEC = spec
  }

  setInstanceIdentifier = async (instanceIdentifier: string) => {
    this.context.instanceIdentifier = instanceIdentifier
    this.instanceIdentifier = instanceIdentifier
    return this.getInstanceBasics()
  }

  constructor() {
    super()
    clearTopicCache()
    clearItemCache()
  }

  getInstanceBasics = async () => {
    if (this.#instanceBasics) {
      return this.#instanceBasics
    }

    this.#instanceBasics = new Promise(async (resolve, reject) => {
      /**
       * Allow for access tokens to be set synchronosly after the
       * the setInstanceIdentifier is set
       */
      await sleep(5)

      if (this.PIMAPIManager && this.config.multilingual) {
        /**
         * Due to a potential race condition when operating on
         * multiple languages on the same time, we need to limit
         * the amount of workers to 1 for now
         */
        this.PIMAPIManager.maxWorkers = 1
      }

      const r = await this.context.callPIM({
        query: gql`
          {
            instance {
              get(identifier: "${this.context.instanceIdentifier}") {
                id
                identifier
                staticAuthToken
              }
            }
          }
        `,
      })

      const instance = r?.data?.instance?.get

      if (!instance) {
        const error = `?????? You do not have access to instance "${this.context.instanceIdentifier}" ??????`
        this.emit(EVENT_NAMES.ERROR, { error })
        reject()
      } else {
        this.context.instanceId = instance.id
        this.context.fileUploader.context = this.context

        const baseUrl = `https://${
          process.env.OSSPIM_ENV === 'dev'
            ? 'api-dev.osspim.digital'
            : 'api.ossgroup.com'
        }/${this.context.instanceIdentifier}`

        // Catalog
        this.catalogAPIManager = createAPICaller({
          uri: `${baseUrl}/catalog`,
          errorNotifier: ({ error }) => {
            this.emit(EVENT_NAMES.ERROR, { error })
          },
          logLevel: this.config.logLevel,
        })
        this.catalogAPIManager.OSSPIM_STATIC_AUTH_TOKEN =
          instance.staticAuthToken
        this.context.callCatalog = this.catalogAPIManager.push

        // Orders
        this.ordersAPIManager = createAPICaller({
          uri: `${baseUrl}/orders`,
          errorNotifier: ({ error }) => {
            this.emit(EVENT_NAMES.ERROR, { error })
          },
          logLevel: this.config.logLevel,
        })
        this.ordersAPIManager.OSSPIM_ACCESS_TOKEN_ID =
          process.env.OSSPIM_ACCESS_TOKEN_ID || ''
        this.ordersAPIManager.OSSPIM_ACCESS_TOKEN_SECRET =
          process.env.OSSPIM_ACCESS_TOKEN_SECRET || ''
        this.ordersAPIManager.OSSPIM_STATIC_AUTH_TOKEN =
          instance.staticAuthToken
        this.context.callOrders = this.ordersAPIManager.push

        // Set log level late so that we'll catch late changes to the config
        if (this.PIMAPIManager && this.config.logLevel) {
          this.PIMAPIManager.logLevel = this.config.logLevel
        }

        resolve(true)
      }
    })
  }

  async createSpec(props: ICreateSpec = createSpecDefaults): Promise<JsonSpec> {
    function removeIds(o: any) {
      if (o && typeof o === 'object') {
        delete o.id
        Object.values(o).forEach(removeIds)
      }
      if (Array.isArray(o)) {
        o.forEach(removeIds)
      }
      return o
    }

    const spec: JsonSpec = {}

    try {
      await this.getInstanceBasics()

      const instanceLanguageSettings = await getInstanceSettings(this.context)

      // Languages
      const availableLanguages = instanceLanguageSettings.availableLanguages.map(
        (l) => ({
          code: l.code,
          name: l.name,
          isDefault: l.code === instanceLanguageSettings.defaultLanguage,
        })
      )
      if (!availableLanguages.some((l) => l.isDefault)) {
        availableLanguages[0].isDefault = true
      }
      const defaultLanguage =
        availableLanguages.find((s) => s.isDefault)?.code || 'en'

      if (props.languages) {
        spec.languages = availableLanguages
      }

      const languageToUse = props.language || defaultLanguage

      // VAT types
      if (props.vatTypes) {
        spec.vatTypes = await getExistingVatTypes(this.context)
        spec.vatTypes.forEach((v) => {
          delete v.id
          // @ts-ignore
          delete v.instanceId
        })
      }

      // Subscription plans
      if (props.subscriptionPlans) {
        const subscriptionPlans = await getExistingSubscriptionPlans(
          this.context
        )

        // @ts-ignore
        spec.subscriptionPlans = subscriptionPlans.map((s) => ({
          identifier: s.identifier,
          name: s.name || '',
          meteredVariables:
            s.meteredVariables?.map((m) => ({
              identifier: m.identifier,
              name: m.name || '',
              unit: m.unit,
            })) || [],
          periods:
            s.periods?.map((p) => ({
              name: p.name || '',
              initial: removeIds(p.initial),
              recurring: removeIds(p.recurring),
            })) || [],
        }))
      }

      // Price variants
      const priceVariants = await getExistingPriceVariants(this.context)
      if (props.priceVariants) {
        spec.priceVariants = priceVariants
      }

      // Topic maps (in just 1 language right now)
      const allTopicsWithIds = await getAllTopicsForSpec(
        languageToUse,
        this.context
      )
      if (props.topicMaps) {
        spec.topicMaps = allTopicsWithIds.map(removeTopicId)
      }

      // Shapes
      if (props.shapes) {
        spec.shapes = await getExistingShapesForSpec(
          this.context,
          props.onUpdate
        )
      }

      // Grids
      if (props.grids) {
        spec.grids = await getAllGrids(languageToUse, this.context)
      }

      // Items
      if (props.items) {
        const options: ItemsCreateSpecOptions = { basePath: '/' }

        if (typeof props.items !== 'boolean') {
          const optionsOverride = props.items
          Object.assign(options, optionsOverride)
        }

        spec.items = await getAllCatalogItems(
          languageToUse,
          this.context,
          options
        )
        spec.items.forEach((i: any) => {
          function handleLevel(a: any) {
            if (a && typeof a === 'object') {
              if ('subscriptionPlans' in a && 'sku' in a) {
                removeIds(a.subscriptionPlans)
              } else {
                Object.values(a).forEach(handleLevel)
              }
            } else if (Array.isArray(a)) {
              a.forEach(handleLevel)
            }
          }

          handleLevel(i)
        })
      }

      // Stock locations
      if (props.stockLocations) {
        spec.stockLocations = await getExistingStockLocations(this.context)
      }
    } catch (e) {
      this.emit(EVENT_NAMES.ERROR, {
        error: JSON.stringify(e, null, 1),
      })
    }

    return spec
  }

  async start() {
    try {
      await this.getInstanceBasics()

      // Store the config in the context for easy access
      this.context.config = this.config

      const start = new Date()

      await this.setLanguages()
      await this.setPriceVariants()
      await this.setStockLocations()
      await this.setSubscriptionPlans()
      await this.setVatTypes()
      await this.setShapes()
      await this.setTopics()
      await this.setGrids()
      await this.setItems()
      await this.setCustomers()
      await this.setOrders()

      // Set (update) grids again to update include the items
      await this.setGrids(true)

      const end = new Date()
      this.emit(EVENT_NAMES.DONE, {
        start,
        end,
        duration: new Duration(start, end).toString(1),
      })
    } catch (e) {
      this.emit(EVENT_NAMES.ERROR, {
        error: JSON.stringify(e, null, 1),
      })
    }
  }
  private areaUpdate(
    statusArea:
      | 'languages'
      | 'shapes'
      | 'priceVariants'
      | 'subscriptionPlans'
      | 'vatTypes'
      | 'topicMaps'
      | 'grids'
      | 'items'
      | 'media'
      | 'stockLocations'
      | 'customers'
      | 'orders',
    areaUpdate: AreaUpdate
  ) {
    if ('progress' in areaUpdate) {
      this.status = immer(this.status, (status) => {
        if (areaUpdate.progress) {
          status[statusArea].progress = areaUpdate.progress
        }
        if (areaUpdate.warning) {
          status[statusArea].warnings.push(areaUpdate.warning)
        }
      })

      this.emit(
        EVENT_NAMES.STATUS_UPDATE,
        immer(this.status, () => {})
      )
    } else if (areaUpdate.warning) {
      this.emit(EVENT_NAMES.ERROR, {
        error: JSON.stringify(areaUpdate.warning, null, 1),
      })
    }
  }

  async setLanguages() {
    const languages = await setLanguages({
      spec: this.SPEC,
      context: this.context,
      onUpdate: (stepStatus: AreaUpdate) => {
        this.emit(EVENT_NAMES.LANGUAGES_UPDATE, stepStatus)
        this.areaUpdate('languages', stepStatus)
      },
    })
    if (!languages) {
      throw new Error('Cannot get languages for the instance')
    }
    this.context.languages = languages

    const defaultLanguage = this.context.languages?.find((l) => l.isDefault)
    if (!defaultLanguage) {
      throw new Error('Cannot determine default language for the instance')
    }

    this.context.defaultLanguage = defaultLanguage

    if (!this.config.multilingual) {
      this.context.languages = [defaultLanguage]
    }

    this.emit(EVENT_NAMES.LANGUAGES_DONE)
  }

  async setShapes() {
    this.context.shapes = await setShapes({
      spec: this.SPEC,
      context: this.context,
      onUpdate: (areaUpdate: AreaUpdate) => {
        this.emit(EVENT_NAMES.SHAPES_UPDATE, areaUpdate)
        this.areaUpdate('shapes', areaUpdate)
      },
    })
    this.emit(EVENT_NAMES.SHAPES_DONE)
  }

  async setPriceVariants() {
    this.context.priceVariants = await setPriceVariants({
      spec: this.SPEC,
      context: this.context,
      onUpdate: (areaUpdate: AreaUpdate) => {
        this.emit(EVENT_NAMES.PRICE_VARIANTS_UPDATE, areaUpdate)
        this.areaUpdate('priceVariants', areaUpdate)
      },
    })
    this.emit(EVENT_NAMES.PRICE_VARIANTS_DONE)
  }
  async setSubscriptionPlans() {
    this.context.subscriptionPlans = await setSubscriptionPlans({
      spec: this.SPEC,
      context: this.context,
      onUpdate: (areaUpdate: AreaUpdate) => {
        this.emit(EVENT_NAMES.SUBSCRIPTION_PLANS_UPDATE, areaUpdate)
        this.areaUpdate('subscriptionPlans', areaUpdate)
      },
    })
    this.emit(EVENT_NAMES.SUBSCRIPTION_PLANS_DONE)
  }
  async setVatTypes() {
    this.context.vatTypes = await setVatTypes({
      spec: this.SPEC,
      context: this.context,
      onUpdate: (areaUpdate: AreaUpdate) => {
        this.emit(EVENT_NAMES.VAT_TYPES_UPDATE, areaUpdate)
        this.areaUpdate('vatTypes', areaUpdate)
      },
    })
    this.emit(EVENT_NAMES.VAT_TYPES_DONE)
  }

  async setTopics() {
    await setTopics({
      spec: this.SPEC,
      onUpdate: (areaUpdate: AreaUpdate) => {
        this.emit(EVENT_NAMES.TOPICS_UPDATE, areaUpdate)
        this.areaUpdate('topicMaps', areaUpdate)
      },
      context: this.context,
    })
    this.emit(EVENT_NAMES.TOPICS_DONE)
  }

  async setGrids(allowUpdate?: boolean) {
    await setGrids({
      spec: this.SPEC,
      onUpdate: (areaUpdate: AreaUpdate) => {
        this.emit(EVENT_NAMES.GRIDS_UPDATE, areaUpdate)
        this.areaUpdate('grids', areaUpdate)
      },
      context: this.context,
      allowUpdate,
    })
    this.emit(EVENT_NAMES.GRIDS_DONE)
  }

  async setItems() {
    await setItems({
      spec: this.SPEC,
      onUpdate: (areaUpdate: AreaUpdate) => {
        if (areaUpdate.message === 'media-upload-progress') {
          this.areaUpdate('media', areaUpdate)
        } else {
          this.emit(EVENT_NAMES.ITEMS_UPDATE, areaUpdate)
          this.areaUpdate('items', areaUpdate)
        }
      },
      context: this.context,
    })
    this.emit(EVENT_NAMES.ITEMS_DONE)
  }

  async setStockLocations() {
    this.context.stockLocations = await setStockLocations({
      spec: this.SPEC,
      context: this.context,
      onUpdate: (areaUpdate: AreaUpdate) => {
        this.emit(EVENT_NAMES.STOCK_LOCATIONS_UPDATE, areaUpdate)
        this.areaUpdate('stockLocations', areaUpdate)
      },
    })
    this.emit(EVENT_NAMES.STOCK_LOCATIONS_DONE)
  }

  async setCustomers() {
    await setCustomers({
      spec: this.SPEC,
      context: this.context,
      onUpdate: (areaUpdate: AreaUpdate) => {
        this.emit(EVENT_NAMES.CUSTOMERS_UPDATE, areaUpdate)
        this.areaUpdate('customers', areaUpdate)
      },
    })
    this.emit(EVENT_NAMES.CUSTOMERS_DONE)
  }

  async setOrders() {
    await setOrders({
      spec: this.SPEC,
      context: this.context,
      onUpdate: (areaUpdate: AreaUpdate) => {
        this.emit(EVENT_NAMES.ORDERS_UPDATE, areaUpdate)
        this.areaUpdate('orders', areaUpdate)
      },
    })
    this.emit(EVENT_NAMES.ORDERS_DONE)
  }
}
