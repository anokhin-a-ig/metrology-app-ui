import { DEPARTMENT_TYPES, DEPARTMENT_TYPE_LABELS } from '../../services/constants';

export default function Legend() {
  return (
    <section className="legend" aria-label="Легенда">
      <div className="legend__types">
        {DEPARTMENT_TYPES.map((type) => (
          <span key={type} className={`type-badge type-badge--${type.toLowerCase()}`}>
            {DEPARTMENT_TYPE_LABELS[type]}
          </span>
        ))}
      </div>
      <p className="legend__hint">
        Показаны заводы. Нажмите «+», чтобы раскрыть подразделения.
      </p>
    </section>
  );
}
