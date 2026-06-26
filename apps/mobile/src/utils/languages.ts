export interface SupportedLanguage {
  code: string
  name: string
  shortName: string
  flag: string
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'es-ES', name: 'Español (España)', shortName: 'Español', flag: '🇪🇸' },
  { code: 'es-MX', name: 'Español (México)', shortName: 'Español MX', flag: '🇲🇽' },
  { code: 'en-US', name: 'English (US)', shortName: 'English', flag: '🇺🇸' },
  { code: 'en-GB', name: 'English (UK)', shortName: 'English UK', flag: '🇬🇧' },
  { code: 'fr-FR', name: 'Français', shortName: 'Français', flag: '🇫🇷' },
  { code: 'de-DE', name: 'Deutsch', shortName: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt-BR', name: 'Português (Brasil)', shortName: 'Português', flag: '🇧🇷' },
  { code: 'it-IT', name: 'Italiano', shortName: 'Italiano', flag: '🇮🇹' },
  { code: 'ja-JP', name: '日本語', shortName: '日本語', flag: '🇯🇵' },
  { code: 'zh-CN', name: '中文 (简体)', shortName: '中文', flag: '🇨🇳' },
  { code: 'ko-KR', name: '한국어', shortName: '한국어', flag: '🇰🇷' },
  { code: 'ar-SA', name: 'العربية', shortName: 'عربي', flag: '🇸🇦' },
  { code: 'ru-RU', name: 'Русский', shortName: 'Русский', flag: '🇷🇺' },
]

export const LANGUAGE_NAMES: Record<string, string> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((l) => [l.code, l.name])
)
