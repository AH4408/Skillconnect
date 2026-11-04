import api, { dataOf } from './api';

export const login = async body => {
  const d = dataOf(await api.post('/auth/login', body));
  localStorage.setItem('skillconnect_access_token', d.accessToken);
  localStorage.setItem('skillconnect_user', JSON.stringify(d.user));
  return d;
};

export const register = async body => dataOf(await api.post('/auth/register', body));

export const refresh = async () => {
  const d = dataOf(await api.post('/auth/refresh'));
  if (d?.accessToken) localStorage.setItem('skillconnect_access_token', d.accessToken);
  return d;
};

export const me = async () => dataOf(await api.get('/auth/me'));

export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } finally {
    localStorage.removeItem('skillconnect_access_token');
    localStorage.removeItem('skillconnect_user');
  }
};
