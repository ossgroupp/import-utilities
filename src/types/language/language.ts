export interface Language {
  system: boolean
  name: string
  code: string
}

export interface LanguageInputInput {
  name: string
  code: string
}

export interface LanguageInput {
  instanceId: string
  input: LanguageInputInput
}
