import { Icon } from './Icon.jsx';

export function Header({ theme, onThemeChange, onMenu, onOpenSettings }) {
  const nextTheme = theme === 'sepia' ? 'light' : theme === 'light' ? 'dark' : 'sepia';
  const themeLabel = theme === 'dark' ? 'Բացել բաց տեսքը' : 'Փոխել գունային տեսքը';

  return (
    <header className="site-header">
      <div className="header-inner">
        <button className="icon-button mobile-only" type="button" onClick={onMenu} aria-label="Բացել ցանկը">
          <Icon name="menu" />
        </button>

        <a className="brand" href="#" aria-label="Հայերեն Աստվածաշունչ">
          <span className="brand-mark"><Icon name="book" size={22} /></span>
          <span>
            <strong>Հայերեն Աստվածաշունչ</strong>
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
