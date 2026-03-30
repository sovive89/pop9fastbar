import { Outlet } from 'react-router-dom';

const ManagerLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  );
};

export default ManagerLayout;
