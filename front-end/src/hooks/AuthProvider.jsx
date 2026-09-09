import { useMemo, useState } from 'react';
import Cookies from 'js-cookie';
import { AuthContext } from './authContext';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  });

  const value = useMemo(
    () => ({
      user,
      login: (token, nextUser) => {
        Cookies.set('auth_token', token, { expires: 7, sameSite: 'lax' });
        localStorage.setItem('auth_user', JSON.stringify(nextUser));
        setUser(nextUser);
      },
      logout: () => {
        Cookies.remove('auth_token');
        localStorage.removeItem('auth_user');
        setUser(null);
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
