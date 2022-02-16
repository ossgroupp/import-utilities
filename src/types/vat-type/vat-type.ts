export interface VatType {
  name: string
  percent: number
}

export interface VatTypeInputInput {
  instanceId: string
  name: string
  percent: number
}

export interface VatTypeInput {
  input: VatTypeInputInput
}
