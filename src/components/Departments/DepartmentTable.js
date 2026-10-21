import { DEPARTMENT_TYPE_LABELS } from '../../services/constants';

function collectRows(departments, depth, rows, expanded, childrenByParent) {
  departments.forEach((department) => {
    const isExpanded = expanded.has(department.id);

    rows.push({
      type: 'department',
      key: `department-${department.id}`,
      department,
      depth,
      expanded: isExpanded,
    });

    if (!isExpanded) {
      return;
    }

    const entry = childrenByParent[department.id];

    if (!entry || (entry.loading && entry.items.length === 0)) {
      rows.push({
        type: 'loading',
        key: `loading-${department.id}`,
        depth: depth + 1,
      });
      return;
    }

    if (entry.error && entry.items.length === 0) {
      rows.push({
        type: 'error',
        key: `error-${department.id}`,
        depth: depth + 1,
        parentId: department.id,
      });
      return;
    }

    if (entry.items.length === 0) {
      rows.push({
        type: 'empty',
        key: `empty-${department.id}`,
        depth: depth + 1,
      });
      return;
    }

    collectRows(entry.items, depth + 1, rows, expanded, childrenByParent);

    if (!entry.last) {
      rows.push({
        type: 'more',
        key: `more-${department.id}`,
        depth: depth + 1,
        parentId: department.id,
        loading: entry.loading,
        error: entry.error,
      });
    }
  });

  return rows;
}

function indentStyle(depth) {
  return { paddingLeft: `${depth * 24}px` };
}

function StatusRow({ rowKey, depth, children }) {
  return (
    <tr key={rowKey}>
      <td colSpan={3}>
        <div className="department-table__status" style={indentStyle(depth)}>
          {children}
        </div>
      </td>
    </tr>
  );
}

export default function DepartmentTable({
  departments,
  expanded,
  childrenByParent,
  onToggle,
  onShowMore,
  onRetryChildren,
}) {
  const rows = collectRows(departments, 0, [], expanded, childrenByParent);

  return (
    <table className="department-table">
      <thead>
        <tr>
          <th scope="col">Название</th>
          <th scope="col">Тип</th>
          <th scope="col">Родительское подразделение</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          if (row.type === 'department') {
            const { department } = row;

            return (
              <tr key={row.key} data-depth={row.depth} aria-label={department.name}>
                <td>
                  <div
                    className="department-table__name"
                    style={indentStyle(row.depth)}
                  >
                    {department.hasChildren ? (
                      <button
                        type="button"
                        className="department-table__toggle"
                        aria-expanded={row.expanded}
                        aria-label={
                          row.expanded ? 'Свернуть' : 'Раскрыть дочерние подразделения'
                        }
                        onClick={() => onToggle(department)}
                      >
                        {row.expanded ? '−' : '+'}
                      </button>
                    ) : (
                      <span
                        className="department-table__toggle-placeholder"
                        aria-hidden="true"
                      />
                    )}
                    <span>{department.name}</span>
                  </div>
                </td>
                <td>
                  <span
                    className={`type-badge type-badge--${department.type.toLowerCase()}`}
                  >
                    {DEPARTMENT_TYPE_LABELS[department.type] || department.type}
                  </span>
                </td>
                <td>{department.parent ? department.parent.name : '—'}</td>
              </tr>
            );
          }

          if (row.type === 'loading') {
            return (
              <StatusRow key={row.key} rowKey={row.key} depth={row.depth}>
                Загрузка…
              </StatusRow>
            );
          }

          if (row.type === 'empty') {
            return (
              <StatusRow key={row.key} rowKey={row.key} depth={row.depth}>
                Нет дочерних подразделений
              </StatusRow>
            );
          }

          if (row.type === 'error') {
            return (
              <StatusRow key={row.key} rowKey={row.key} depth={row.depth}>
                <span>Не удалось загрузить дочерние подразделения</span>
                <button
                  type="button"
                  className="department-table__retry"
                  onClick={() => onRetryChildren(row.parentId)}
                >
                  Повторить
                </button>
              </StatusRow>
            );
          }

          if (row.error) {
            return (
              <StatusRow key={row.key} rowKey={row.key} depth={row.depth}>
                <span>Не удалось загрузить дочерние подразделения</span>
                <button
                  type="button"
                  className="department-table__retry"
                  onClick={() => onRetryChildren(row.parentId)}
                >
                  Повторить
                </button>
              </StatusRow>
            );
          }

          return (
            <StatusRow key={row.key} rowKey={row.key} depth={row.depth}>
              <button
                type="button"
                className="department-table__show-more"
                onClick={() => onShowMore(row.parentId)}
                disabled={row.loading}
              >
                Показать ещё
              </button>
            </StatusRow>
          );
        })}
      </tbody>
    </table>
  );
}
