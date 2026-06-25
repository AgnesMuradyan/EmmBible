import { Icon } from './Icon.jsx';

export function ReaderToolbar({
  onSearch,
}) {
  return (
    <div className="reader-toolbar">
      <div className="toolbar-actions">
        <button type="button" onClick={onSearch} title="Որոնել">
          <Icon name="search" />
          <span>Որոնել</span>
        </button>
      </div>
    </div>
  );
}
