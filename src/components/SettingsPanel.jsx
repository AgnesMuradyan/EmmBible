export function SettingsPanel({ theme, onThemeChange, fontSize, onFontSizeChange, lineHeight, onLineHeightChange }) {
  return (
    <div className="settings-panel">
      <section>
        <h3>Գունային տեսք</h3>
        <div className="theme-options">
          {[
            ['sepia', 'Թղթային'],
            ['light', 'Բաց'],
            ['dark', 'Մուգ'],
          ].map(([value, label]) => (
            <button className={theme === value ? 'active' : ''} key={value} type="button" onClick={() => onThemeChange(value)}>
              <span className={`theme-swatch ${value}`} />
              {label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="setting-label"><h3>Տառաչափ</h3><output>{fontSize}px</output></div>
        <input type="range" min="17" max="32" step="1" value={fontSize} onChange={(event) => onFontSizeChange(Number(event.target.value))} />
      </section>

      <section>
        <div className="setting-label"><h3>Տողերի հեռավորություն</h3><output>{lineHeight}</output></div>
        <input type="range" min="1.55" max="2.25" step="0.05" value={lineHeight} onChange={(event) => onLineHeightChange(Number(event.target.value))} />
      </section>

      <section className="reader-preview" style={{ fontSize, lineHeight }}>
        <span>1</span> Սկզբում Աստված ստեղծեց երկինքն ու երկիրը։
      </section>
    </div>
  );
}
