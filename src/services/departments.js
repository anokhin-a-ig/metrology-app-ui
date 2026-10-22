import { PAGE_SIZE, ROOT_TYPE, SORT_DIRECTION } from './constants';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';

async function request(path, { method = 'GET', params, body, signal } = {}) {
  const query = params ? new URLSearchParams(params).toString() : '';
  const url = query ? `${API_BASE_URL}${path}?${query}` : `${API_BASE_URL}${path}`;
  const options = {};

  if (method !== 'GET') {
    options.method = method;
  }

  if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }

  if (signal) {
    options.signal = signal;
  }

  const response = Object.keys(options).length > 0 ? await fetch(url, options) : await fetch(url);

  if (!response.ok) {
    let message = `Ошибка запроса (${response.status})`;

    try {
      const errorBody = await response.json();
      if (errorBody && errorBody.message) {
        message = errorBody.message;
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
    params: {
      page,
      size,
      type: ROOT_TYPE,
      sortBy,
    },
  });
}

export function fetchChildrenPage({
  parentId,
  page = 0,
  size = PAGE_SIZE,
  sortBy = SORT_DIRECTION,
}) {
  return request('/api/v1/departments/by-parent', {
    params: {
      parentId,
      page,
      size,
      sortBy,
    },
  });
}

export function createDepartment({ name, type, parentId }) {
  const payload = { name, type };

  if (parentId !== undefined && parentId !== null) {
    payload.parentId = parentId;
  }

  return request('/api/v1/departments', {
    method: 'POST',
    body: payload,
  });
}

export function searchDepartments(search, { signal } = {}) {
  return request('/api/v1/departments/search-by-name', {
    params: { search },
    signal,
  });
}
