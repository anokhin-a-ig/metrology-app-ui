import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

function DepartmentRowMenu({ department, onDelete }) {
  const menuId = useId();
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const menuItemRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (
        buttonRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      ) {
        return;
      }

      setOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    const closeMenu = () => setOpen(false);

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    menuItemRef.current?.focus();

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, [open]);

  const handleToggle = () => {
    if (open) {
      setOpen(false);
      return;
    }

    const rect = buttonRef.current?.getBoundingClientRect();

    if (rect) {
      setPosition({
        top: rect.bottom + 4,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    }

    setOpen(true);
  };

  const handleDelete = () => {
    setOpen(false);
    onDelete(department);
  };

  return (
    <div className="department-table__menu-wrap">
      <button
        type="button"
        ref={buttonRef}
        className="department-table__menu-button"
        aria-label={`Действия для департамента ${department.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={handleToggle}
      >
        …
      </button>

      {open &&
        position &&
        createPortal(
          <div
            className="department-table__menu"
            role="menu"
            id={menuId}
            ref={menuRef}
            style={{ top: position.top, right: position.right }}
          >
            <button
              type="button"
              role="menuitem"
              ref={menuItemRef}
              className="department-table__menu-item department-table__menu-item--danger"
              onClick={handleDelete}
            >
              Удалить
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}

export default function DepartmentTable({
  departments,
  expanded,
  childrenByParent,
  onToggle,
  onShowMore,
  onRetryChildren,
  onDelete,
}) {
  const rows = collectRows(departments, 0, [], expanded, childrenByParent);

  return (
    <div className="department-table-wrap">
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
                  <td>
                    <div className="department-table__parent-cell">
                      <span>{department.parent ? department.parent.name : '—'}</span>
                      <DepartmentRowMenu department={department} onDelete={onDelete} />
                    </div>
                  </td>
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
    </div>
  );
}
