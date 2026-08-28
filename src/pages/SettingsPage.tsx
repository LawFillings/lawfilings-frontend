import { COLOR_THEMES, WIDGET_DEFS, useSettings, type PageKey } from '../lib/settings';
import { useLanguage } from '../lib/language';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import './SettingsPage.css';

interface Props {
  onBack: () => void;
}

const PAGE_ORDER: PageKey[] = ['landing', 'home', 'lawLibrary', 'wizard'];

export function SettingsPage({ onBack }: Props) {
  const { settings, setColor, setWidget, resetPage, resetAll } = useSettings();
  const { t } = useLanguage();

  return (
    <div className="settings-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        {t.common.back}
      </button>

      <header className="settings-hero">
        <p className="settings-eyebrow">{t.settings.eyebrow}</p>
        <h1 className="settings-title">{t.settings.title}</h1>
        <p className="settings-sub">{t.settings.sub}</p>
        <button className="settings-reset-all" onClick={resetAll}>
          {t.settings.resetAll}
        </button>
      </header>

      <section className="settings-section">
        <div className="settings-section-head">
          <h2 className="settings-section-title">{t.settings.language}</h2>
        </div>
        <div className="settings-block">
          <p className="settings-block-label">{t.settings.languageDesc}</p>
          <LanguageSwitcher />
        </div>
      </section>

      {PAGE_ORDER.map((page) => (
        <section className="settings-section" key={page}>
          <div className="settings-section-head">
            <h2 className="settings-section-title">{t.settings.pageLabels[page]}</h2>
            <button className="settings-reset-page" onClick={() => resetPage(page)}>
              {t.settings.reset}
            </button>
          </div>

          <div className="settings-block">
            <p className="settings-block-label">{t.settings.accentColour}</p>
            <div className="settings-swatches">
              {COLOR_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  className={settings[page].color === theme.id ? 'settings-swatch active' : 'settings-swatch'}
                  onClick={() => setColor(page, theme.id)}
                  aria-label={theme.label}
                  title={theme.label}
                >
                  <span className="settings-swatch-dot" style={{ background: theme.swatch }} />
                  <span className="settings-swatch-label">{theme.label}</span>
                </button>
              ))}
            </div>
          </div>

          {WIDGET_DEFS[page].length > 0 && (
            <div className="settings-block">
              <p className="settings-block-label">{t.settings.widgets}</p>
              <div className="settings-widget-list">
                {WIDGET_DEFS[page].map((widget) => (
                  <label className="settings-widget-row" key={widget.key}>
                    <input
                      type="checkbox"
                      checked={settings[page].widgets[widget.key] ?? true}
                      onChange={(e) => setWidget(page, widget.key, e.target.checked)}
                    />
                    <span>
                      <span className="settings-widget-name">{t.settings.widgetDefs[widget.key as keyof typeof t.settings.widgetDefs]?.label ?? widget.label}</span>
                      <span className="settings-widget-desc">{t.settings.widgetDefs[widget.key as keyof typeof t.settings.widgetDefs]?.description ?? widget.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
