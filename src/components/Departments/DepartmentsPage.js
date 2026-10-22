import { useCallback, useEffect, useState } from 'react';
import { PAGE_SIZE, SORT_DIRECTION } from '../../services/constants';
import { fetchChildrenPage, fetchRootPage } from '../../services/departments';
import DepartmentCreateModal from './DepartmentCreateModal';
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
  const [successMessage, setSuccessMessage] = useState(null);

  const loadRoot = useCallback(async (targetPage) => {
    setPage((previous) => ({ ...previous, loading: true, error: null }));

    try {
      const data = await fetchRootPage({
        page: targetPage,
        size: PAGE_SIZE,
        sortBy: SORT_DIRECTION,
      });

      setPage({
        items: data.content || [],
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

        setChildrenByParent((previous) => ({
          ...previous,
          [parentId]: {
            items,
            page: entry.page,
            totalPages: lastPage ? lastPage.totalPages ?? entry.totalPages : entry.totalPages,
            last: lastPage ? lastPage.last ?? entry.last : entry.last,
            loading: false,
            error: null,
          },
        }));
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
    [childrenByParent]
  );

  const markParentHasChildren = useCallback((parentId) => {
    setPage((previous) => ({
      ...previous,
      items: previous.items.map((department) =>
        department.id === parentId ? { ...department, hasChildren: true } : department
      ),
    }));

    setChildrenByParent((previous) => {
      let changed = false;

      const next = Object.fromEntries(
        Object.entries(previous).map(([key, entry]) => {
          let entryChanged = false;
          const items = entry.items.map((department) => {
            if (department.id === parentId && !department.hasChildren) {
              entryChanged = true;
              return { ...department, hasChildren: true };
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

  useEffect(() => {
    setSuccessMessage(null);
  }, [pageNumber]);

  return (
    <section className="departments">
      <div className="departments__header">
        <h2 className="departments__title">Департаменты</h2>
        <button
          type="button"
          className="departments__create"
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
          />
          <Pagination
            number={page.number}
            totalPages={page.totalPages}
            onChange={setPageNumber}
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
    </section>
  );
}
