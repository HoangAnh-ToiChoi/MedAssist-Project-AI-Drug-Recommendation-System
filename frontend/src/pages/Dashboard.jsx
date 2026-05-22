import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';

const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return (
    <div>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold">Chào mừng, {user.fullName || 'Người dùng'}!</h1>
        <p className="mt-2">Đây là trang dashboard. Bạn có thể chọn các chức năng:</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Link to="/symptoms" className="bg-blue-100 p-4 rounded-xl shadow hover:bg-blue-200">
            <h2 className="font-semibold">Kiểm tra triệu chứng</h2>
            <p className="text-sm">Nhập triệu chứng để nhận gợi ý thuốc</p>
          </Link>
          <Link to="/medical-history" className="bg-green-100 p-4 rounded-xl shadow hover:bg-green-200">
            <h2 className="font-semibold">Tiền sử bệnh</h2>
            <p className="text-sm">Quản lý bệnh nền</p>
          </Link>
          <Link to="/allergies" className="bg-yellow-100 p-4 rounded-xl shadow hover:bg-yellow-200">
            <h2 className="font-semibold">Dị ứng thuốc</h2>
            <p className="text-sm">Quản lý dị ứng</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;