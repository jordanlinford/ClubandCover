import { Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/Home';
import { UsersPage } from './pages/Users';
import { NotFoundPage } from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/users" element={<UsersPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
