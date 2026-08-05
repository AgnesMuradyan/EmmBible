import { Icon } from './Icon.jsx';

function OpenBookLogo() {
  return (
    <svg className="open-book-logo" aria-hidden="true" width="26" height="26" viewBox="0 0 28 28" fill="none">
      <path className="logo-cover" d="M3.5 6.5c4.1-.8 7.6.2 10.5 3v13c-2.9-2.5-6.4-3.4-10.5-2.6V6.5Z" />
      <path className="logo-cover" d="M24.5 6.5c-4.1-.8-7.6.2-10.5 3v13c2.9-2.5 6.4-3.4 10.5-2.6V6.5Z" />
      <path className="logo-line" d="M14 9.5v13M5.8 9.4c2.4-.2 4.5.4 6.2 1.8M22.2 9.4c-2.4-.2-4.5.4-6.2 1.8" />
      {Array.from({ length: 6 }, (_, index) => (
        <path
          className={`logo-turning-page page-${index + 1}`}
          d="M14 9.5c-2.6-2.2-5.6-3-9-2.4v11.2c3.5-.5 6.5.5 9 3V9.5Z"
          key={index}
        />
      ))}
    </svg>
  );
}

export function Header({ theme, chapterKey, onThemeChange, onMenu, onOpenSettings }) {
  const nextTheme = theme === 'sepia' ? 'light' : theme === 'light' ? 'dark' : 'sepia';
  const themeLabel = theme === 'dark' ? 'Բացել բաց տեսքը' : 'Փոխել գունային տեսքը';

  return (
    <header className="site-header">
      <div className="header-inner">
        <button className="icon-button mobile-only" type="button" onClick={onMenu} aria-label="Բացել ցանկը">
          <Icon name="menu" />
        </button>

        <a className="brand" href="#" aria-label="Աստվածաշունչ">
          <span className="brand-mark" key={chapterKey}>
            <OpenBookLogo />
          </span>
          <span>
            <strong>Աստվածաշունչ</strong>
          </span>
        </a>

        <div className="header-actions">
          <button className="icon-button" type="button" onClick={() => onThemeChange(nextTheme)} aria-label={themeLabel}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
          <button className="header-action" type="button" onClick={onOpenSettings} aria-label="Ընթերցման կարգավորումներ">
            <Icon name="settings" />
            <span>Տեսք</span>
          </button>
        </div>
      </div>
    </header>
  );
}
