import { BrowserRouter, Route, Routes } from 'react-router';
import ChatLayout from './ChatLayout';
import { useIsMobile } from './hooks/useIsMobile';
import Home from './routes/Home';
import Index from './routes/Index';
import Thread from './routes/Thread';
import Settings from './routes/Settings';

export default function App() {
  const { isMobile } = useIsMobile();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="chat" element={<ChatLayout isMobile={isMobile} />}>
          <Route index element={<Home />} />
          <Route path=":id" element={<Thread />} />
        </Route>
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<p> Not found </p>} />
      </Routes>
    </BrowserRouter>
  );
}
