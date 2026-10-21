import { useEffect, useState } from 'react';
import DepartmentsPage from '../Departments/DepartmentsPage';
import { UI_VERSION, fetchBackendVersion } from '../../services/version';

const SECTIONS = [
  { id: 'departments', label: 'Департаменты' },
  { id: 'devices', label: 'Приборы' },
  { id: 'employees', label: 'Сотрудники' },
];

export default function Layout() {
  const [activeSection, setActiveSection] = useState('departments');
  const [backendVersion, setBackendVersion] = useState('загрузка…');

  useEffect(() => {
    let cancelled = false;

    fetchBackendVersion()
      .then((version) => {
        if (!cancelled) {
          setBackendVersion(version);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBackendVersion('недоступна');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="layout">
      <aside className="layout__sidebar">
        <h1 className="layout__title">Метрология</h1>
        <nav className="layout__nav" aria-label="Основное меню">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={
                activeSection === section.id
                  ? 'layout__nav-button layout__nav-button--active'
                  : 'layout__nav-button'
              }
              aria-current={activeSection === section.id ? 'page' : undefined}
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </button>
          ))}
        </nav>

        <div className="layout__versions">
          <span>UI: {UI_VERSION}</span>
          <span>Бэкенд: {backendVersion}</span>
        </div>
      </aside>

      <main className="layout__content">
        {activeSection === 'departments' ? (
          <DepartmentsPage />
        ) : (
          <p className="placeholder">Появится скоро</p>
        )}
      </main>
    </div>
  );
}
