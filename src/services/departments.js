import { PAGE_SIZE, ROOT_TYPE, SORT_DIRECTION } from './constants';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';

async function request(path, params) {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${API_BASE_URL}${path}?${query}`);

  if (!response.ok) {
    let message = `Ошибка запроса (${response.status})`;

    try {
      const body = await response.json();
      if (body && body.message) {
        message = body.message;
      }
    } catch (error) {
      // Тело ошибки может быть пустым или не JSON.
    }

    throw new Error(message);
  }

  return response.json();
}

export function fetchRootPage({ page = 0, size = PAGE_SIZE, sortBy = SORT_DIRECTION } = {}) {
  return request('/api/v1/departments/all-by-type', {
    page,
    size,
    type: ROOT_TYPE,
    sortBy,
  });
}

export function fetchChildrenPage({
  parentId,
  page = 0,
  size = PAGE_SIZE,
  sortBy = SORT_DIRECTION,
}) {
  return request('/api/v1/departments/by-parent', {
    parentId,
    page,
    size,
    sortBy,
  });
}
