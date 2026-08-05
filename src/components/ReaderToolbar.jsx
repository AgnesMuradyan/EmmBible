import { Icon } from './Icon.jsx';

export function ReaderToolbar({
  onSearch,
}) {
  return (
    <div className="reader-toolbar">
      <div className="toolbar-actions">
        <button className="main-search-trigger" type="button" onClick={onSearch} title="Որոնել Աստվածաշնչում">
          <span className="main-search-icon"><Icon name="search" /></span>
          <span className="main-search-copy">
            <strong>Որոնել</strong>
            <small></small>
          </span>
          <kbd>/</kbd>
        </button>
      </div>
    </div>
  );
}
