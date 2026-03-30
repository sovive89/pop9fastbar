import { Outlet } from 'react-router-dom';

const ClientLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  );
};

export default ClientLayout;
