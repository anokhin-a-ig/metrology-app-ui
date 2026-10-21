const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';

const BACKEND_INFO_URL =
  process.env.NODE_ENV === 'development'
    ? '/actuator/info'
    : `${API_BASE_URL}/actuator/info`;

export const UI_VERSION = process.env.REACT_APP_UI_VERSION || 'неизвестно';

export async function fetchBackendVersion() {
  const response = await fetch(BACKEND_INFO_URL);

  if (!response.ok) {
    throw new Error(`Ошибка запроса (${response.status})`);
  }

  const body = await response.json();
  return (body && body.build && body.build.version) || 'неизвестно';
}
