import { BrowserRouter, Route, Routes } from 'react-router';
import ChatLayout from './ChatLayout';
import Home from './routes/Home';
import Index from './routes/Index';
import Settings from './routes/Settings';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route 
          path="chat" 
          element={
            <ProtectedRoute>
              <ChatLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
        </Route>
        <Route 
            path="settings" 
            element={
                <ProtectedRoute>
                    <Settings />
                </ProtectedRoute>
            } 
        />
        <Route path="*" element={<p> Not found </p>} />
      </Routes>
    </BrowserRouter>
  );
}
