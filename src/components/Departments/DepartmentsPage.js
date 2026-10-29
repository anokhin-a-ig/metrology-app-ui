import { useCallback, useEffect, useRef, useState } from 'react';
import { PAGE_SIZE, SORT_DIRECTION } from '../../services/constants';
import { fetchChildrenPage, fetchRootPage } from '../../services/departments';
import DepartmentCreateModal from './DepartmentCreateModal';
import DepartmentDeleteModal from './DepartmentDeleteModal';
import DepartmentTable from './DepartmentTable';
import Legend from './Legend';
import Pagination from './Pagination';
import './DepartmentsPage.css';

const INITIAL_PAGE = {
  items: [],
  number: 0,
  totalPages: 0,
  last: true,
  loading: true,
  error: null,
};

const EMPTY_CHILDREN = {
  items: [],
  page: -1,
  totalPages: 0,
  last: true,
  loading: false,
  error: null,
};

function mergeById(existing, incoming) {
  const ids = new Set(existing.map((item) => item.id));
  return [...existing, ...incoming.filter((item) => !ids.has(item.id))];
}

export default function DepartmentsPage() {
  const [pageNumber, setPageNumber] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [page, setPage] = useState(INITIAL_PAGE);
  const [expanded, setExpanded] = useState(() => new Set());
  const [childrenByParent, setChildrenByParent] = useState({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const createButtonRef = useRef(null);

  const loadRoot = useCallback(async (targetPage) => {
    setPage((previous) => ({ ...previous, loading: true, error: null }));

    try {
      const data = await fetchRootPage({
        page: targetPage,
        size: PAGE_SIZE,
        sortBy: SORT_DIRECTION,
      });
      const items = data.content || [];

      if (items.length === 0 && targetPage > 0) {
        setPageNumber(targetPage - 1);
        return;
      }

      setPage({
        items,
        number: data.number ?? targetPage,
        totalPages: data.totalPages ?? 0,
        last: data.last ?? true,
        loading: false,
        error: null,
      });
    } catch (error) {
      setPage((previous) => ({ ...previous, loading: false, error: error.message }));
    }
  }, []);

  const loadChildren = useCallback(async ({ parentId, page: targetPage, append }) => {
    setChildrenByParent((previous) => ({
      ...previous,
      [parentId]: {
        ...(previous[parentId] || EMPTY_CHILDREN),
        loading: true,
        error: null,
      },
    }));

    try {
      const data = await fetchChildrenPage({
        parentId,
        page: targetPage,
        size: PAGE_SIZE,
        sortBy: SORT_DIRECTION,
      });

      setChildrenByParent((previous) => {
        const current = previous[parentId] || EMPTY_CHILDREN;
        const incoming = data.content || [];

        return {
          ...previous,
          [parentId]: {
            items: append ? mergeById(current.items, incoming) : incoming,
            page: data.number ?? targetPage,
            totalPages: data.totalPages ?? 0,
            last: data.last ?? true,
            loading: false,
            error: null,
          },
        };
      });
    } catch (error) {
      setChildrenByParent((previous) => ({
        ...previous,
        [parentId]: {
          ...(previous[parentId] || EMPTY_CHILDREN),
          loading: false,
          error: error.message,
        },
      }));
    }
  }, []);

  const markParentHasChildren = useCallback((parentId, value = true) => {
    setPage((previous) => ({
      ...previous,
      items: previous.items.map((department) =>
        department.id === parentId && department.hasChildren !== value
          ? { ...department, hasChildren: value }
          : department
      ),
    }));

    setChildrenByParent((previous) => {
      let changed = false;

      const next = Object.fromEntries(
        Object.entries(previous).map(([key, entry]) => {
          let entryChanged = false;
          const items = entry.items.map((department) => {
            if (department.id === parentId && department.hasChildren !== value) {
              entryChanged = true;
              return { ...department, hasChildren: value };
            }
            return department;
          });

          if (entryChanged) {
            changed = true;
            return [key, { ...entry, items }];
          }

          return [key, entry];
        })
      );

      return changed ? next : previous;
    });
  }, []);

  const refreshChildren = useCallback(
    async (parentId) => {
      const entry = childrenByParent[parentId];
      if (!entry) {
        return;
      }

      setChildrenByParent((previous) => ({
        ...previous,
        [parentId]: {
          ...(previous[parentId] || EMPTY_CHILDREN),
          loading: true,
          error: null,
        },
      }));

      try {
        const pages = await Promise.all(
          Array.from({ length: entry.page + 1 }, (_, index) =>
            fetchChildrenPage({
              parentId,
              page: index,
              size: PAGE_SIZE,
              sortBy: SORT_DIRECTION,
            })
          )
        );
        const lastPage = pages[pages.length - 1];
        const items = mergeById(
          [],
          pages.flatMap((childrenPage) => childrenPage.content || [])
        );
        const last = lastPage ? lastPage.last ?? entry.last : entry.last;

        setChildrenByParent((previous) => ({
          ...previous,
          [parentId]: {
            items,
            page: entry.page,
            totalPages: lastPage ? lastPage.totalPages ?? entry.totalPages : entry.totalPages,
            last,
            loading: false,
            error: null,
          },
        }));

        if (items.length === 0 && last) {
          markParentHasChildren(parentId, false);

          setExpanded((previous) => {
            if (!previous.has(parentId)) {
              return previous;
            }

            const next = new Set(previous);
            next.delete(parentId);
            return next;
          });

          setChildrenByParent((previous) => {
            if (!(parentId in previous)) {
              return previous;
            }

            const next = { ...previous };
            delete next[parentId];
            return next;
          });
        }
      } catch (error) {
        setChildrenByParent((previous) => ({
          ...previous,
          [parentId]: {
            ...(previous[parentId] || EMPTY_CHILDREN),
            loading: false,
            error: error.message,
          },
        }));
      }
    },
    [childrenByParent, markParentHasChildren]
  );

  const handleCreated = useCallback(
    (created) => {
      setIsCreateOpen(false);
      setSuccessMessage(`Департамент «${created.name}» создан`);

      if (created.type === 'FACTORY') {
        loadRoot(pageNumber);
        return;
      }

      if (created.parent && created.parent.id) {
        markParentHasChildren(created.parent.id);
        refreshChildren(created.parent.id);
      }
    },
    [loadRoot, markParentHasChildren, pageNumber, refreshChildren]
  );

  const handleDeleted = useCallback(
    (deleted, { alreadyDeleted = false } = {}) => {
      setDeleteTarget(null);
      setSuccessMessage(
        alreadyDeleted
          ? `Департамент «${deleted.name}» уже был удалён`
          : `Департамент «${deleted.name}» удалён`
      );

      setExpanded((previous) => {
        const next = new Set(previous);
        next.delete(deleted.id);
        return next;
      });

      setChildrenByParent((previous) => {
        if (!(deleted.id in previous)) {
          return previous;
        }

        const next = { ...previous };
        delete next[deleted.id];
        return next;
      });

      if (deleted.parent && deleted.parent.id) {
        refreshChildren(deleted.parent.id);
      } else {
        loadRoot(pageNumber);
      }

      createButtonRef.current?.focus();
    },
    [loadRoot, pageNumber, refreshChildren]
  );

  const handleToggle = useCallback(
    (department) => {
      const isExpanded = expanded.has(department.id);

      setExpanded((previous) => {
        const next = new Set(previous);
        if (next.has(department.id)) {
          next.delete(department.id);
        } else {
          next.add(department.id);
        }
        return next;
      });

      if (!isExpanded && !childrenByParent[department.id]) {
        loadChildren({ parentId: department.id, page: 0, append: false });
      }
    },
    [childrenByParent, expanded, loadChildren]
  );

  const handleShowChildren = useCallback(
    (department) => {
      setDeleteTarget(null);

      if (!expanded.has(department.id)) {
        handleToggle(department);
      }
    },
    [expanded, handleToggle]
  );

  const handleShowMore = useCallback(
    (parentId) => {
      const entry = childrenByParent[parentId];
      if (!entry || entry.loading) {
        return;
      }

      loadChildren({ parentId, page: entry.page + 1, append: true });
    },
    [childrenByParent, loadChildren]
  );

  const handleRetryChildren = useCallback(
    (parentId) => {
      const entry = childrenByParent[parentId] || EMPTY_CHILDREN;

      if (entry.items.length > 0) {
        loadChildren({ parentId, page: entry.page + 1, append: true });
      } else {
        loadChildren({ parentId, page: 0, append: false });
      }
    },
    [childrenByParent, loadChildren]
  );

  useEffect(() => {
    loadRoot(pageNumber);
  }, [loadRoot, pageNumber, reloadToken]);

  const handlePageChange = useCallback((nextPage) => {
    setSuccessMessage(null);
    setPageNumber(nextPage);
  }, []);

  return (
    <section className="departments">
      <div className="departments__header">
        <h2 className="departments__title">Департаменты</h2>
        <button
          type="button"
          className="departments__create"
          ref={createButtonRef}
          onClick={() => setIsCreateOpen(true)}
        >
          Новый
        </button>
      </div>

      {successMessage && (
        <p className="departments__success" role="status">
          {successMessage}
        </p>
      )}

      <Legend />

      {page.error && !page.loading ? (
        <div className="departments__error" role="alert">
          <p>Не удалось загрузить департаменты: {page.error}</p>
          <button
            type="button"
            className="departments__retry"
            onClick={() => setReloadToken((value) => value + 1)}
          >
            Повторить
          </button>
        </div>
      ) : page.loading ? (
        <p className="departments__loading" role="status">
          Загрузка…
        </p>
      ) : page.items.length === 0 ? (
        <p className="departments__empty">Департаменты не найдены</p>
      ) : (
        <>
          <DepartmentTable
            departments={page.items}
            expanded={expanded}
            childrenByParent={childrenByParent}
            onToggle={handleToggle}
            onShowMore={handleShowMore}
            onRetryChildren={handleRetryChildren}
            onDelete={setDeleteTarget}
          />
          <Pagination
            number={page.number}
            totalPages={page.totalPages}
            onChange={handlePageChange}
            disabled={page.loading}
          />
        </>
      )}

      {isCreateOpen && (
        <DepartmentCreateModal
          onClose={() => setIsCreateOpen(false)}
          onCreated={handleCreated}
        />
      )}

      {deleteTarget && (
        <DepartmentDeleteModal
          department={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
          onShowChildren={handleShowChildren}
        />
      )}
    </section>
  );
}
