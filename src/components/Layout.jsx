import { Outlet } from 'react-router-dom';
import WalletHeader from './WalletHeader';
import { useAuthStore } from '../store';

function Layout({ onLogout }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Outlet />;
  }

  return (
    <>
      <WalletHeader onLogout={onLogout} />
      <div className="flex-grow px-3 py-2 overflow-y-auto flex flex-col gap-2">
        <Outlet />
      </div>
    </>
  );
}

export default Layout;
