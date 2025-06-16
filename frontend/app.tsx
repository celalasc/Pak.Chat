import { BrowserRouter, Route, Routes } from 'react-router';
import ChatLayout from './ChatLayout';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './routes/Home';
import Index from './routes/Index';
import Settings from './routes/Settings';
import ChatPage from './routes/ChatPage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
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
            <Route path=":id" element={<ChatPage />} />
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
      </ErrorBoundary>
    </BrowserRouter>
  );
}
